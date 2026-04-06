export interface ManualImportStep {
  title: string;
  content: string;
  selector: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  target_url: string | null;
  click_selector: string | null;
}

export interface ManualImportProcess {
  name: string;
  steps: ManualImportStep[];
}

const CONFIDENTIAL_NOTICE = /This document contains confidential information belonging to Islamic Development Bank and is intended solely for the use of the individual or entity to whom it is addressed\.?/gi;
const VALID_PLACEMENTS = new Set(["top", "bottom", "left", "right", "center"]);

export function normalizeManualImportData(data: any, fileName: string, textContent?: string | null): ManualImportProcess[] {
  const fallbackName = deriveProcessName(fileName);

  const processResults = normalizeProcesses(data?.processes, fallbackName);
  if (processResults.length > 0) return processResults;

  const stepResults = normalizeSteps(data?.steps);
  if (stepResults.length > 0) {
    return [{ name: fallbackName, steps: stepResults }];
  }

  return parseProcessesFromText(textContent ?? "", fallbackName);
}

function normalizeProcesses(processes: unknown, fallbackName: string): ManualImportProcess[] {
  if (!Array.isArray(processes)) return [];

  return processes
    .map((process, index) => {
      const steps = normalizeSteps((process as any)?.steps);
      if (steps.length === 0) return null;

      const rawName = typeof (process as any)?.name === "string" ? (process as any).name.trim() : "";
      return {
        name: rawName || `${fallbackName}${processes.length > 1 ? ` ${index + 1}` : ""}`,
        steps,
      };
    })
    .filter(Boolean) as ManualImportProcess[];
}

function normalizeSteps(steps: unknown): ManualImportStep[] {
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step, index) => normalizeStep(step, index + 1))
    .filter(Boolean) as ManualImportStep[];
}

function normalizeStep(step: any, index: number): ManualImportStep | null {
  const rawTitle = typeof step?.title === "string" ? step.title.trim() : "";
  const rawContent = typeof step?.content === "string" ? step.content.trim() : "";
  const content = truncate(cleanDocumentText(rawContent), 320);
  const title = truncate(rawTitle || inferStepTitle(content, index), 80);

  if (!title && !content) return null;

  const placement = typeof step?.placement === "string" && VALID_PLACEMENTS.has(step.placement)
    ? step.placement
    : "bottom";

  return {
    title: title || `Step ${index}`,
    content: content || title || `Complete step ${index}`,
    selector: typeof step?.selector === "string" ? step.selector : "",
    placement: placement as ManualImportStep["placement"],
    target_url: typeof step?.target_url === "string" && step.target_url.trim() ? step.target_url : null,
    click_selector: typeof step?.click_selector === "string" && step.click_selector.trim() ? step.click_selector : null,
  };
}

function parseProcessesFromText(text: string, fallbackName: string): ManualImportProcess[] {
  const cleaned = cleanDocumentText(text);
  if (!cleaned) return [];

  const matches = Array.from(cleaned.matchAll(/\bStep\s*(\d+)\b([\s\S]*?)(?=\bStep\s*\d+\b|$)/gi));
  if (matches.length === 0) return [];

  const steps = matches
    .map((match, index) => {
      const section = truncate(match[2].trim(), 320);
      if (!section) return null;

      return {
        title: inferStepTitle(section, index + 1),
        content: section,
        selector: "",
        placement: "bottom" as const,
        target_url: null,
        click_selector: null,
      };
    })
    .filter(Boolean) as ManualImportStep[];

  return steps.length > 0 ? [{ name: fallbackName, steps }] : [];
}

function inferStepTitle(content: string, index: number): string {
  const normalized = content.toLowerCase();

  if (/log\s*in|username|password/.test(normalized)) return "Log in to OMS";
  if (/projects?\s+overview/.test(normalized)) return "Open Projects Overview";
  if (/create\s+project/.test(normalized)) return "Create the Project";
  if (/modes?\s+of\s+finance/.test(normalized)) return "Add Modes of Finance";
  if (/save\s+the\s+screen|status\s+pipeline|successfully\s+creat/.test(normalized)) return "Save the Project";
  if (/basic\s+data|estimated\s+cost|financing\s+plan/.test(normalized)) return "Complete Project Details";

  const firstSentence = content.split(/(?<=[.!?])\s+/)[0] || content;
  const title = firstSentence
    .replace(/[“”"']/g, "")
    .replace(/[:;,]+$/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  return title || `Step ${index}`;
}

function deriveProcessName(fileName: string): string {
  const cleaned = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\(\d+\)$/g, " ")
    .replace(/\buser\s+manual\b/gi, " ")
    .replace(/\bmanual\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Imported Process";
}

function cleanDocumentText(text: string): string {
  let output = text.replace(CONFIDENTIAL_NOTICE, " ");

  for (let i = 0; i < 3; i += 1) {
    output = output
      .replace(/\b([A-Za-z]{1,4})\s+([A-Za-z])\s+([A-Za-z]{2,})\b/g, "$1$2$3")
      .replace(/\b([A-Za-z]{2,})\s+([A-Za-z])\s+([A-Za-z]{1,4})\b/g, "$1$2$3")
      .replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, "$1$2$3");
  }

  return output.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
