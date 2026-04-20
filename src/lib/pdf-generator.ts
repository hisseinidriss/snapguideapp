import jsPDF from 'jspdf';
import type { ProcessRecordingStep } from '@/types/recording';
import { buildApiUrl } from '@/api/http';
import { generateHtmlSOPPdf } from './pdf-html-renderer';

export type PdfLanguage = 'en' | 'ar' | 'fr';

interface PdfOptions {
  language?: PdfLanguage;
  translatedTitle?: string;
  translatedDescription?: string;
  translatedSteps?: { instruction: string; notes: string | null }[];
}

export async function generateSOPPdf(
  title: string,
  description: string,
  steps: ProcessRecordingStep[],
  options: PdfOptions = {}
): Promise<void> {
  const lang: PdfLanguage = options.language || 'en';

  // Arabic and French use the HTML renderer because jsPDF's built-in font
  // (Helvetica) cannot render Arabic glyphs at all and mangles French
  // diacritics. Routing through the browser gets us proper shaping + RTL.
  if (lang === 'ar' || lang === 'fr') {
    return generateHtmlSOPPdf(title, description, steps, {
      language: lang,
      translatedTitle: options.translatedTitle,
      translatedDescription: options.translatedDescription,
      translatedSteps: options.translatedSteps,
    });
  }

  const isRTL = false;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  const pdfTitle = options.translatedTitle || title;
  const pdfDesc = options.translatedDescription || description;

  const textAlign = isRTL ? 'right' : 'left';
  const textX = isRTL ? pageW - margin : margin;
  const stepTextX = isRTL ? pageW - margin - 12 : margin + 12;

  // Header bar
  doc.setFillColor(77, 139, 111);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  const headerLabel = lang === 'ar' ? 'إجراء التشغيل القياسي' : lang === 'fr' ? 'Procédure Opératoire Standard' : 'Standard Operating Procedure';
  doc.text(pdfTitle || headerLabel, textX, 20, { align: textAlign });
  y = 42;

  // Language badge
  const langLabels: Record<string, string> = { en: 'English', ar: 'العربية', fr: 'Français' };
  doc.setFontSize(8);
  doc.setTextColor(138, 155, 146);
  doc.text(langLabels[lang], isRTL ? margin : pageW - margin, 28, { align: isRTL ? 'left' : 'right' });

  // Description
  if (pdfDesc) {
    doc.setTextColor(90, 107, 98);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(pdfDesc, contentW);
    doc.text(descLines, textX, y, { align: textAlign });
    y += descLines.length * 5 + 8;
  }

  // Metadata
  doc.setTextColor(138, 155, 146);
  doc.setFontSize(8);
  const genLabel = lang === 'ar' ? 'تم الإنشاء' : lang === 'fr' ? 'Généré le' : 'Generated';
  const stepLabel = lang === 'ar' ? 'خطوة' : lang === 'fr' ? 'étape' : 'step';
  doc.text(`${genLabel}: ${new Date().toLocaleDateString()} • ${steps.length} ${stepLabel}${steps.length !== 1 && lang === 'en' ? 's' : ''}`, textX, y, { align: textAlign });
  y += 10;

  // Divider
  doc.setDrawColor(223, 230, 226);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const translated = options.translatedSteps?.[i];
    const instruction = translated?.instruction || step.instruction;
    const notes = translated?.notes ?? step.notes;

    const neededHeight = step.screenshot_url ? 80 : 30;
    if (y + neededHeight > pageH - margin) {
      doc.addPage();
      y = margin;
    }

    // Step number circle
    const circleX = isRTL ? pageW - margin - 4 : margin + 4;
    doc.setFillColor(77, 139, 111);
    doc.circle(circleX, y + 3, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(i + 1), circleX, y + 4.5, { align: 'center' });

    // Instruction
    doc.setTextColor(45, 59, 52);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const instructionLines = doc.splitTextToSize(instruction, contentW - 16);
    doc.text(instructionLines, stepTextX, y + 5, { align: textAlign });
    y += instructionLines.length * 5 + 4;

    // Notes
    if (notes) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const notePrefix = lang === 'ar' ? 'ملاحظة: ' : lang === 'fr' ? 'Note : ' : 'Note: ';
      const noteLines = doc.splitTextToSize(`${notePrefix}${notes}`, contentW - 16);
      doc.text(noteLines, stepTextX, y, { align: textAlign });
      y += noteLines.length * 4 + 2;
    }

    // Screenshot
    if (step.screenshot_url) {
      try {
        const img = await loadImage(step.screenshot_url);
        const maxW = contentW - 16;
        const maxH = 55;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const imgW = img.width * ratio;
        const imgH = img.height * ratio;

        if (y + imgH + 8 > pageH - margin) {
          doc.addPage();
          y = margin;
        }

        const imgX = isRTL ? pageW - margin - 14 - imgW : margin + 12;
        doc.setDrawColor(223, 230, 226);
        doc.roundedRect(imgX, y, imgW + 4, imgH + 4, 2, 2);
        doc.addImage(img, 'PNG', imgX + 2, y + 2, imgW, imgH);
        y += imgH + 10;
      } catch {
        y += 4;
      }
    }

    y += 6;
  }

  doc.save(`${(pdfTitle || 'SOP').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

interface RecordingWithSteps {
  title: string;
  description: string;
  steps: ProcessRecordingStep[];
}

export async function generateCombinedPdf(
  appName: string,
  recordings: RecordingWithSteps[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Cover page
  doc.setFillColor(77, 139, 111);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(appName, contentW);
  doc.text(titleLines, pageW / 2, pageH / 2 - 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Standard Operating Procedures', pageW / 2, pageH / 2 + 10, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${recordings.length} procedure${recordings.length !== 1 ? 's' : ''} · Generated ${new Date().toLocaleDateString()}`, pageW / 2, pageH / 2 + 22, { align: 'center' });

  // Table of contents
  doc.addPage();
  let y = margin;
  doc.setTextColor(45, 59, 52);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', margin, y);
  y += 12;

  recordings.forEach((rec, i) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(77, 139, 111);
    doc.text(`${i + 1}.`, margin, y);
    doc.setTextColor(45, 59, 52);
    doc.text(rec.title, margin + 10, y);
    doc.setTextColor(138, 155, 146);
    doc.setFontSize(9);
    doc.text(`${rec.steps.length} step${rec.steps.length !== 1 ? 's' : ''}`, pageW - margin, y, { align: 'right' });
    y += 8;
    if (y > pageH - margin) { doc.addPage(); y = margin; }
  });

  // Each recording
  for (let r = 0; r < recordings.length; r++) {
    const rec = recordings[r];
    doc.addPage();
    y = margin;

    // Header bar
    doc.setFillColor(77, 139, 111);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${r + 1}. ${rec.title}`, margin, 20);
    y = 42;

    if (rec.description) {
      doc.setTextColor(90, 107, 98);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(rec.description, contentW);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 8;
    }

    doc.setDrawColor(223, 230, 226);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    for (let i = 0; i < rec.steps.length; i++) {
      const step = rec.steps[i];
      const neededHeight = step.screenshot_url ? 80 : 30;
      if (y + neededHeight > pageH - margin) { doc.addPage(); y = margin; }

      doc.setFillColor(77, 139, 111);
      doc.circle(margin + 4, y + 3, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(i + 1), margin + 4, y + 4.5, { align: 'center' });

      doc.setTextColor(45, 59, 52);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const instrLines = doc.splitTextToSize(step.instruction, contentW - 16);
      doc.text(instrLines, margin + 12, y + 5);
      y += instrLines.length * 5 + 4;

      if (step.notes) {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        const noteLines = doc.splitTextToSize(`Note: ${step.notes}`, contentW - 16);
        doc.text(noteLines, margin + 12, y);
        y += noteLines.length * 4 + 2;
      }

      if (step.screenshot_url) {
        try {
          const img = await loadImage(step.screenshot_url);
          const maxW = contentW - 16;
          const maxH = 55;
          const ratio = Math.min(maxW / img.width, maxH / img.height);
          const imgW = img.width * ratio;
          const imgH = img.height * ratio;
          if (y + imgH + 8 > pageH - margin) { doc.addPage(); y = margin; }
          doc.setDrawColor(223, 230, 226);
          doc.roundedRect(margin + 12, y, imgW + 4, imgH + 4, 2, 2);
          doc.addImage(img, 'PNG', margin + 14, y + 2, imgW, imgH);
          y += imgH + 10;
        } catch { y += 4; }
      }
      y += 6;
    }
  }

  doc.save(`${appName.replace(/\s+/g, '-').toLowerCase()}-all-sops.pdf`);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  // Route Azure Blob URLs through our same-origin proxy to avoid CORS taint
  // (otherwise jsPDF.addImage fails when reading pixel data).
  let srcUrl = url;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.hostname.endsWith('.blob.core.windows.net')) {
      const proxied = buildApiUrl(`/screenshot-file?url=${encodeURIComponent(url)}`);
      const res = await fetch(proxied, { cache: 'no-store' });
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const blob = await res.blob();
      srcUrl = URL.createObjectURL(blob);
    }
  } catch (e) {
    // fall back to direct load
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = srcUrl;
  });
}
