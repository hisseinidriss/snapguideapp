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

export type StepGranularity = "coarse" | "fine";

const CONFIDENTIAL_NOTICE = /This document contains confidential information belonging to Islamic Development Bank and is intended solely for the use of the individual or entity to whom it is addressed\.?/gi;
const VALID_PLACEMENTS = new Set(["top", "bottom", "left", "right", "center"]);

/**
 * Action-verb pattern used to detect sub-action boundaries inside a dense step.
 * Matches lines/sentences beginning with an imperative verb commonly found in
 * user-manual instructions.
 */
const ACTION_VERB_RE = /^(?:click|fill|select|check|enter|choose|save|open|navigate|go\s+to|scroll|type|press|confirm|provide|mark|allocate|add|create|set|update|review|submit|expand|close|ensure|verify|note|drag|drop|upload|download|search|filter|sort|copy|paste|delete|remove|edit|modify|enable|disable|toggle|switch|log\s*in|sign\s*in|log\s*out)\b/i;

/**
 * Signals that a sentence is describing a UI event (popup, modal, screen change)
 * which often marks a new logical sub-step.
 */
const UI_EVENT_RE = /\b(?:pop\s*up|popup|modal|dialog|screen|page|window|form|section|tab|panel|will\s+be\s+displayed|will\s+appear|is\s+displayed|opens?|shows?)\b/i;

/**
 * Bullet / numbered-list prefix at the start of a line.
 */
const BULLET_RE = /^(?:[-–—•*]|\d+[.)]\s)/;

export function normalizeManualImportData(
  data: any,
  fileName: string,
  textContent?: string | null,
  granularity: StepGranularity = "coarse",
): ManualImportProcess[] {
  const fallbackName = deriveProcessName(fileName);

  let processes: ManualImportProcess[] = [];

  const processResults = normalizeProcesses(data?.processes, fallbackName);
  if (processResults.length > 0) {
    processes = processResults;
  } else {
    const stepResults = normalizeSteps(data?.steps);
    if (stepResults.length > 0) {
      processes = [{ name: fallbackName, steps: stepResults }];
    } else {
      processes = parseProcessesFromText(textContent ?? "", fallbackName);
    }
  }

  if (granularity === "fine") {
    processes = processes.map((p) => ({
      ...p,
      steps: expandToSubActions(p.steps),
    }));
  }

  return processes;
}

// ---------------------------------------------------------------------------
// Fine-grained sub-action expansion
// ---------------------------------------------------------------------------

function expandToSubActions(steps: ManualImportStep[]): ManualImportStep[] {
  const expanded: ManualImportStep[] = [];

  for (const step of steps) {
    const subs = splitIntoSubActions(step.content);
    if (subs.length <= 1) {
      expanded.push(step);
      continue;
    }

    for (let i = 0; i < subs.length; i++) {
      const content = truncate(subs[i].trim(), 320);
      if (!content) continue;
      expanded.push({
        ...step,
        title: truncate(inferStepTitle(content, expanded.length + 1), 80),
        content,
      });
    }
  }

  return expanded;
}

/**
 * Split a dense step body into sub-actions using multiple heuristics:
 *  1. Explicit bullet / numbered-list items
 *  2. Sentences starting with action verbs
 *  3. Sentences describing UI events (popup displayed, screen shown, etc.)
 */
function splitIntoSubActions(text: string): string[] {
  // First try splitting on bullet / numbered items
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const bulletChunks = chunkByPredicate(lines, (line) => BULLET_RE.test(line));
  if (bulletChunks.length > 1) return bulletChunks;

  // Fall back to sentence-level splitting
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length <= 1) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const isActionStart = ACTION_VERB_RE.test(sentence);
    const isUIEvent = UI_EVENT_RE.test(sentence);

    if ((isActionStart || isUIEvent) && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks.length > 1 ? chunks : [text];
}

function chunkByPredicate(lines: string[], isBoundary: (line: string) => boolean): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (isBoundary(line) && current) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? " " : "") + line;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// ---------------------------------------------------------------------------
// Original helpers (unchanged logic)
// ---------------------------------------------------------------------------

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
  if (/fill\s+in/.test(normalized)) return "Fill in the Required Fields";
  if (/pop\s*up|modal|dialog/.test(normalized)) return "Complete the Pop-up Form";
  if (/duplicate/.test(normalized)) return "Handle Duplicate Warning";
  if (/confirm/.test(normalized)) return "Confirm the Action";
  if (/filter/.test(normalized)) return "Filter the List";
  if (/select|choose|click\s+on\s+the\s+needed/.test(normalized)) return "Select the Required Option";
  if (/warning|alert/.test(normalized)) return "Review Warning Message";
  if (/mark.*(?:important|favorite)/.test(normalized)) return "Mark as Important/Favorite";

  const firstSentence = content.split(/(?<=[.!?])\s+/)[0] || content;
  const title = firstSentence
    .replace(/["""']/g, "")
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
