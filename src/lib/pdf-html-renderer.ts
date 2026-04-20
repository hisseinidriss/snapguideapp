import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ProcessRecordingStep } from '@/types/recording';
import { buildApiUrl } from '@/api/http';

export type HtmlPdfLanguage = 'ar' | 'fr';

interface Options {
  language: HtmlPdfLanguage;
  translatedTitle?: string;
  translatedDescription?: string;
  translatedSteps?: { instruction: string; notes: string | null }[];
}

// Renders the SOP as an offscreen HTML node and snapshots it page-by-page into
// a PDF. We use this for languages whose glyphs jsPDF's built-in Helvetica
// font cannot draw (Arabic) or that benefit from native browser shaping
// (French diacritics). The browser handles RTL, ligatures, and fonts.
export async function generateHtmlSOPPdf(
  title: string,
  description: string,
  steps: ProcessRecordingStep[],
  opts: Options
): Promise<void> {
  const isRTL = opts.language === 'ar';
  const pdfTitle = opts.translatedTitle || title;
  const pdfDesc = opts.translatedDescription || description;

  // Preload screenshots into data URLs so html2canvas (which taints on cross-
  // origin) can render them.
  const dataUrls: (string | null)[] = await Promise.all(
    steps.map(s => (s.screenshot_url ? toDataUrl(s.screenshot_url) : Promise.resolve(null)))
  );

  // Inject the Google Font so Arabic/French render correctly during snapshot.
  await ensureFont();

  const fontFamily = isRTL
    ? "'Noto Naskh Arabic', 'Noto Sans Arabic', sans-serif"
    : "'Noto Sans', system-ui, sans-serif";

  const langLabels: Record<HtmlPdfLanguage, string> = { ar: 'العربية', fr: 'Français' };
  const headerLabel = opts.language === 'ar' ? 'إجراء التشغيل القياسي' : 'Procédure Opératoire Standard';
  const genLabel = opts.language === 'ar' ? 'تم الإنشاء' : 'Généré le';
  const stepLabel = opts.language === 'ar' ? 'خطوة' : 'étape';
  const notePrefix = opts.language === 'ar' ? 'ملاحظة: ' : 'Note : ';

  // Build the HTML container offscreen. Width matches A4 at 96dpi (~794px).
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -10000px; top: 0;
    width: 794px; padding: 0; margin: 0;
    background: #ffffff; color: #2d3b34;
    font-family: ${fontFamily}; font-size: 14px; line-height: 1.55;
    direction: ${isRTL ? 'rtl' : 'ltr'};
  `;

  const stepsHtml = steps.map((step, i) => {
    const t = opts.translatedSteps?.[i];
    const instruction = escapeHtml(t?.instruction || step.instruction);
    const notes = t?.notes ?? step.notes;
    const img = dataUrls[i];
    return `
      <div style="display:flex; gap:14px; margin: 18px 40px; align-items:flex-start; ${isRTL ? 'flex-direction:row-reverse;' : ''} page-break-inside: avoid;">
        <div style="flex:0 0 32px; width:32px; height:32px; border-radius:50%; background:#4d8b6f; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">${i + 1}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:15px; font-weight:600; color:#2d3b34;">${instruction}</div>
          ${notes ? `<div style="margin-top:4px; font-size:12px; color:#6b7280; font-style:italic;">${escapeHtml(notePrefix + notes)}</div>` : ''}
          ${img ? `<div style="margin-top:10px; border:1px solid #dfe6e2; border-radius:6px; padding:4px; background:#fff;"><img src="${img}" style="display:block; max-width:100%; height:auto; border-radius:3px;" crossorigin="anonymous" /></div>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="background:#4d8b6f; color:#fff; padding:22px 40px; display:flex; justify-content:space-between; align-items:center; ${isRTL ? 'flex-direction:row-reverse;' : ''}">
      <div style="font-size:22px; font-weight:700;">${escapeHtml(pdfTitle || headerLabel)}</div>
      <div style="font-size:11px; opacity:0.85;">${langLabels[opts.language]}</div>
    </div>
    ${pdfDesc ? `<div style="margin: 18px 40px 6px; font-size:13px; color:#5a6b62;">${escapeHtml(pdfDesc)}</div>` : ''}
    <div style="margin: 4px 40px 0; font-size:11px; color:#8a9b92;">${escapeHtml(`${genLabel}: ${new Date().toLocaleDateString()} • ${steps.length} ${stepLabel}`)}</div>
    <hr style="margin: 12px 40px 0; border:0; border-top:1px solid #dfe6e2;" />
    ${stepsHtml}
    <div style="height: 24px;"></div>
  `;
  document.body.appendChild(container);

  try {
    // Snapshot the entire container once at 2x for crispness.
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Slice the tall canvas into A4-sized pages.
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWmm = pdf.internal.pageSize.getWidth();
    const pageHmm = pdf.internal.pageSize.getHeight();
    const pxPerMm = canvas.width / pageWmm;
    const pageHpx = Math.floor(pageHmm * pxPerMm);

    let y = 0;
    let pageIdx = 0;
    while (y < canvas.height) {
      const sliceH = Math.min(pageHpx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const imgData = slice.toDataURL('image/jpeg', 0.92);
      if (pageIdx > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, sliceH / pxPerMm);
      y += sliceH;
      pageIdx++;
    }

    pdf.save(`${(pdfTitle || 'SOP').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    let fetchUrl = url;
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname.endsWith('.blob.core.windows.net')) {
        fetchUrl = buildApiUrl(`/screenshot-file?url=${encodeURIComponent(url)}`);
      }
    } catch {}
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let fontPromise: Promise<void> | null = null;
function ensureFont(): Promise<void> {
  if (fontPromise) return fontPromise;
  fontPromise = new Promise((resolve) => {
    const id = 'snapguide-pdf-fonts';
    if (document.getElementById(id)) return resolve();
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Sans:wght@400;600;700&display=swap';
    link.onload = () => {
      // Give the browser a tick to actually load font files.
      if ((document as any).fonts?.ready) {
        (document as any).fonts.ready.then(() => resolve());
      } else {
        setTimeout(resolve, 800);
      }
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  return fontPromise;
}
