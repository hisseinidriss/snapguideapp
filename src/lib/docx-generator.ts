import {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel,
  AlignmentType, BorderStyle, PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ProcessRecordingStep } from '@/types/recording';

async function fetchImageBuffer(url: string): Promise<{ data: ArrayBuffer; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await blob.arrayBuffer();
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
    return { data, ...dims };
  } catch {
    return null;
  }
}

function getImageType(url: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  const lower = url.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'jpg';
  if (lower.includes('.gif')) return 'gif';
  if (lower.includes('.bmp')) return 'bmp';
  return 'png';
}

export type DocxLanguage = 'en' | 'ar';

export async function generateSOPDocx(
  title: string,
  description: string,
  steps: ProcessRecordingStep[],
  options?: {
    language?: DocxLanguage;
    translatedTitle?: string;
    translatedDescription?: string;
    translatedSteps?: { instruction: string; notes?: string }[];
  },
): Promise<void> {
  const lang = options?.language || 'en';
  const isRtl = lang === 'ar';
  const tTitle = options?.translatedTitle || title;
  const tDesc = options?.translatedDescription ?? description;
  const tSteps = options?.translatedSteps;
  const align = isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 200 },
    alignment: align,
    bidirectional: isRtl,
    children: [new TextRun({ text: tTitle || 'Standard Operating Procedure', bold: true, size: 48, color: '1A6B3C', rightToLeft: isRtl })],
  }));

  // Description
  if (tDesc) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      alignment: align,
      bidirectional: isRtl,
      children: [new TextRun({ text: tDesc, size: 22, color: '5A6B62', rightToLeft: isRtl })],
    }));
  }

  // Metadata
  const metaText = isRtl
    ? `${new Date().toLocaleDateString('ar')}  •  ${steps.length} خطوة`
    : `Generated: ${new Date().toLocaleDateString()}  •  ${steps.length} step${steps.length !== 1 ? 's' : ''}`;
  children.push(new Paragraph({
    spacing: { after: 400 },
    alignment: align,
    bidirectional: isRtl,
    border: { bottom: { color: 'DFE6E2', space: 4, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: metaText, size: 18, color: '8A9B92', italics: true, rightToLeft: isRtl })],
  }));

  // Steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const tStep = tSteps?.[i];
    const instruction = tStep?.instruction || step.instruction;
    const notes = tStep?.notes ?? step.notes;
    const stepLabel = isRtl ? `الخطوة ${i + 1}` : `Step ${i + 1}`;
    const noteLabel = isRtl ? 'ملاحظة: ' : 'Note: ';

    children.push(new Paragraph({
      spacing: { before: 240, after: 120 },
      alignment: align,
      bidirectional: isRtl,
      children: [new TextRun({ text: stepLabel, bold: true, size: 18, color: '1A6B3C', rightToLeft: isRtl })],
    }));

    children.push(new Paragraph({
      spacing: { after: 120 },
      alignment: align,
      bidirectional: isRtl,
      children: [new TextRun({ text: instruction, bold: true, size: 24, color: '2D3B34', rightToLeft: isRtl })],
    }));

    if (notes) {
      children.push(new Paragraph({
        spacing: { after: 120 },
        alignment: align,
        bidirectional: isRtl,
        children: [new TextRun({ text: `${noteLabel}${notes}`, italics: true, size: 20, color: '6B7280', rightToLeft: isRtl })],
      }));
    }

    if (step.screenshot_url) {
      const img = await fetchImageBuffer(step.screenshot_url);
      if (img) {
        const maxW = 550;
        const ratio = Math.min(maxW / img.width, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        children.push(new Paragraph({
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({
            type: getImageType(step.screenshot_url) as any,
            data: img.data,
            transformation: { width: w, height: h },
            altText: { title: stepLabel, description: instruction, name: `step-${i + 1}` },
          })],
        }));
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const suffix = lang === 'ar' ? '-ar' : '';
  saveAs(blob, `${(tTitle || 'SOP').replace(/\s+/g, '-').toLowerCase()}${suffix}.docx`);
}
