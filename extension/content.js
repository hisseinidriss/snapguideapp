// SnapGuide Scribe - Content script
// Captures user interactions and sends them to background for storage

let isRecording = false;
let lastInputEl = null;
let inputDebounce = null;

// Check recording state on load
chrome.storage.local.get(["sg_recording"], (state) => {
  isRecording = !!state.sg_recording;
});

// Listen for start/stop from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SG_START_RECORDING") isRecording = true;
  if (msg.type === "SG_STOP_RECORDING") isRecording = false;
});

// Build a readable CSS selector for an element
function getSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute("data-testid")) return `[data-testid="${el.getAttribute("data-testid")}"]`;
  if (el.getAttribute("aria-label")) return `[aria-label="${el.getAttribute("aria-label")}"]`;

  let path = [];
  let current = el;
  while (current && current !== document.body && path.length < 4) {
    let seg = current.tagName.toLowerCase();
    if (current.id) { path.unshift(`#${current.id}`); break; }
    if (current.className && typeof current.className === "string") {
      const cls = current.className.trim().split(/\s+/).filter(c => !c.startsWith("ng-") && !c.startsWith("css-") && c.length < 30).slice(0, 2).join(".");
      if (cls) seg += `.${cls}`;
    }
    path.unshift(seg);
    current = current.parentElement;
  }
  return path.join(" > ");
}

// Build a human-readable instruction from an action
function buildInstruction(action, el) {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent || "").trim().substring(0, 60);
  const label = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("placeholder") || "";
  const identifier = label || text || tag;

  switch (action) {
    case "click":
      if (tag === "a") return `Click the "${identifier}" link`;
      if (tag === "button" || el.getAttribute("role") === "button") return `Click the "${identifier}" button`;
      if (tag === "input" && (el.type === "checkbox" || el.type === "radio")) return `Toggle "${identifier}"`;
      return `Click on "${identifier}"`;
    case "type":
      return `Type in the "${identifier}" field`;
    case "select":
      return `Select a value from "${identifier}"`;
    case "navigate":
      return `Navigate to ${window.location.href}`;
    default:
      return `Interact with "${identifier}"`;
  }
}

// Add a highlight overlay around an element, returns a cleanup function
function highlightElement(el) {
  if (!el || el === document.body) return () => {};

  const rect = el.getBoundingClientRect();
  const pad = 4;

  const overlay = document.createElement("div");
  overlay.id = "sg-highlight-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - pad}px;
    left: ${rect.left - pad}px;
    width: ${rect.width + pad * 2}px;
    height: ${rect.height + pad * 2}px;
    border: 3px solid #e53e3e;
    border-radius: 4px;
    background: rgba(229, 62, 62, 0.08);
    box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.3), 0 0 12px rgba(229, 62, 62, 0.25);
    z-index: 2147483647;
    pointer-events: none;
    transition: none;
  `;

  // Add a small label
  const label = document.createElement("div");
  label.style.cssText = `
    position: absolute;
    top: -22px;
    left: -3px;
    background: #e53e3e;
    color: #fff;
    font-size: 10px;
    font-family: system-ui, sans-serif;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px 3px 0 0;
    white-space: nowrap;
    line-height: 14px;
  `;
  label.textContent = "▶ Click";
  overlay.appendChild(label);

  document.documentElement.appendChild(overlay);

  return () => {
    overlay.remove();
  };
}

// Capture a step
async function captureStep(actionType, element, extra = {}) {
  if (!isRecording) return;

  // Add highlight before taking screenshot
  const removeHighlight = highlightElement(element);

  // Small delay to ensure highlight renders before screenshot
  await new Promise(r => setTimeout(r, 80));

  // Request screenshot from background
  let screenshotData = null;
  try {
    const res = await chrome.runtime.sendMessage({ type: "SG_CAPTURE_SCREENSHOT" });
    if (res?.screenshot) screenshotData = res.screenshot;
  } catch (e) {}

  // Remove highlight after screenshot
  removeHighlight();

  const data = {
    action_type: actionType,
    instruction: buildInstruction(actionType, element),
    selector: getSelector(element),
    target_url: window.location.href,
    element_text: (element.textContent || "").trim().substring(0, 100),
    element_tag: element.tagName.toLowerCase(),
    screenshot_data: screenshotData,
    ...extra,
  };

  chrome.runtime.sendMessage({ type: "SG_CAPTURE_STEP", data });
}

// Click handler
document.addEventListener("click", (e) => {
  if (!isRecording) return;
  const el = e.target;
  if (el.tagName === "INPUT" && (el.type === "text" || el.type === "email" || el.type === "password" || el.type === "search" || el.type === "tel" || el.type === "url" || el.type === "number")) {
    lastInputEl = el;
    return;
  }
  if (el.tagName === "TEXTAREA") { lastInputEl = el; return; }

  captureStep("click", el);
}, true);

// Input change handler (debounced)
document.addEventListener("change", (e) => {
  if (!isRecording) return;
  const el = e.target;

  if (el.tagName === "SELECT") {
    captureStep("select", el, { input_value: el.value });
    return;
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => {
      const val = el.type === "password" ? "••••••" : el.value;
      captureStep("type", el, { input_value: val });
    }, 300);
  }
}, true);

// Navigation detection
let lastUrl = window.location.href;
const navObserver = new MutationObserver(() => {
  if (!isRecording) return;
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    captureStep("navigate", document.body, { notes: `Navigated to ${lastUrl}` });
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener("popstate", () => {
  if (!isRecording || window.location.href === lastUrl) return;
  lastUrl = window.location.href;
  captureStep("navigate", document.body, { notes: `Navigated to ${lastUrl}` });
});
