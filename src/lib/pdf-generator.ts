import jsPDF from 'jspdf';
import type { ProcessRecordingStep } from '@/types/recording';

export async function generateSOPPdf(
  title: string,
  description: string,
  steps: ProcessRecordingStep[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header bar
  doc.setFillColor(77, 139, 111);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Standard Operating Procedure', margin, 20);
  y = 42;

  // Description
  if (description) {
    doc.setTextColor(90, 107, 98);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(description, contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 8;
  }

  // Metadata
  doc.setTextColor(138, 155, 146);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} • ${steps.length} step${steps.length !== 1 ? 's' : ''}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(223, 230, 226);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const neededHeight = step.screenshot_url ? 80 : 30;
    if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }

    // Step number circle
    doc.setFillColor(77, 139, 111);
    doc.circle(margin + 4, y + 3, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(i + 1), margin + 4, y + 4.5, { align: 'center' });

    // Instruction
    doc.setTextColor(45, 59, 52);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const instructionLines = doc.splitTextToSize(step.instruction, contentW - 16);
    doc.text(instructionLines, margin + 12, y + 5);
    y += instructionLines.length * 5 + 4;

    // Notes
    if (step.notes) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const noteLines = doc.splitTextToSize(`Note: ${step.notes}`, contentW - 16);
      doc.text(noteLines, margin + 12, y);
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

        if (y + imgH + 8 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        doc.setDrawColor(223, 230, 226);
        doc.roundedRect(margin + 12, y, imgW + 4, imgH + 4, 2, 2);
        doc.addImage(img, 'PNG', margin + 14, y + 2, imgW, imgH);
        y += imgH + 10;
      } catch {
        // Skip screenshot if loading fails
        y += 4;
      }
    }

    y += 6;
  }

  doc.save(`${(title || 'SOP').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
