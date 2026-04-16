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

export async function generateSOPDocx(
  title: string,
  description: string,
  steps: ProcessRecordingStep[],
): Promise<void> {
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 200 },
    children: [new TextRun({ text: title || 'Standard Operating Procedure', bold: true, size: 48, color: '1A6B3C' })],
  }));

  // Description
  if (description) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: description, size: 22, color: '5A6B62' })],
    }));
  }

  // Metadata
  children.push(new Paragraph({
    spacing: { after: 400 },
    border: { bottom: { color: 'DFE6E2', space: 4, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({
      text: `Generated: ${new Date().toLocaleDateString()}  •  ${steps.length} step${steps.length !== 1 ? 's' : ''}`,
      size: 18, color: '8A9B92', italics: true,
    })],
  }));

  // Steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Step heading
    children.push(new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: `Step ${i + 1}`, bold: true, size: 18, color: '1A6B3C' }),
      ],
    }));

    // Instruction
    children.push(new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: step.instruction, bold: true, size: 24, color: '2D3B34' })],
    }));

    // Notes
    if (step.notes) {
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: `Note: ${step.notes}`, italics: true, size: 20, color: '6B7280' })],
      }));
    }

    // Screenshot
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
            altText: { title: `Step ${i + 1}`, description: step.instruction, name: `step-${i + 1}` },
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
  saveAs(blob, `${(title || 'SOP').replace(/\s+/g, '-').toLowerCase()}.docx`);
}
