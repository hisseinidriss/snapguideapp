import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";

interface ProcessStep {
  title: string;
  content: string;
  selector: string | null;
  placement: string;
  sort_order: number;
}

interface Process {
  id: string;
  name: string;
  steps: ProcessStep[];
}

interface LauncherData {
  id: string;
  name: string;
  type: string;
  selector: string;
  color: string | null;
  label: string | null;
  pulse: boolean | null;
  is_active: boolean | null;
  tour_id: string | null;
}

export async function generateChromeExtension(
  appId: string,
  appName: string,
  appUrl: string
) {
  // Fetch all processes and their steps
  const { data: tours } = await supabase
    .from("tours")
    .select("*")
    .eq("app_id", appId);

  const { data: launchers } = await supabase
    .from("launchers")
    .select("*")
    .eq("app_id", appId);

  const processes: Process[] = [];
  if (tours?.length) {
    const ids = tours.map((t) => t.id);
    const { data: steps } = await supabase
      .from("tour_steps")
      .select("*")
      .in("tour_id", ids)
      .order("sort_order");

    for (const tour of tours) {
      processes.push({
        id: tour.id,
        name: tour.name,
        steps: (steps || [])
          .filter((s) => s.tour_id === tour.id)
          .map((s) => ({
            title: s.title,
            content: s.content,
            selector: s.selector,
            placement: s.placement,
            sort_order: s.sort_order,
          })),
      });
    }
  }

  const activeLaunchers: LauncherData[] = (launchers || [])
    .filter((l) => l.is_active)
    .map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      selector: l.selector,
      color: l.color,
      label: l.label,
      pulse: l.pulse,
      is_active: l.is_active,
      tour_id: l.tour_id,
    }));

  const zip = new JSZip();

  // manifest.json
  const manifest = {
    manifest_version: 3,
    name: `${appName} - Business Process Guide`,
    version: "1.0.0",
    description: `Interactive business process guide for ${appName}`,
    permissions: ["activeTab", "storage"],
    action: {
      default_popup: "popup.html",
      default_icon: {
        "16": "icon16.png",
        "48": "icon48.png",
        "128": "icon128.png",
      },
    },
    content_scripts: [
      {
        matches: appUrl
          ? [`${appUrl.replace(/\/+$/, "")}/*`]
          : ["<all_urls>"],
        js: ["content.js"],
        css: ["content.css"],
        run_at: "document_idle",
      },
    ],
    icons: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png",
    },
    web_accessible_resources: [
      {
        resources: ["data.json"],
        matches: appUrl
          ? [`${appUrl.replace(/\/+$/, "")}/*`]
          : ["<all_urls>"],
      },
    ],
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Embedded data as JSON
  zip.file(
    "data.json",
    JSON.stringify({ processes, launchers: activeLaunchers, appName }, null, 2)
  );

  // content.css
  zip.file("content.css", getContentCSS());

  // content.js
  zip.file("content.js", getContentJS());

  // popup.html
  zip.file("popup.html", getPopupHTML(appName, processes));

  // popup.js
  zip.file("popup.js", getPopupJS());

  // Generate simple icons (colored squares as SVG-based PNGs)
  zip.file("icon16.png", await generateIcon(16));
  zip.file("icon48.png", await generateIcon(48));
  zip.file("icon128.png", await generateIcon(128));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${appName.replace(/\s+/g, "-").toLowerCase()}-chrome-extension.zip`);
}

function generateIcon(size: number): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();

    // Letter B
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${size * 0.6}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("B", size / 2, size / 2 + size * 0.03);

    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, "image/png");
  });
}

function getContentCSS(): string {
  return `
/* Business Process Guide - Overlay Styles */
.bpg-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999998;
  transition: opacity 0.2s;
}

.bpg-tooltip {
  position: fixed;
  z-index: 999999;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
  padding: 20px;
  max-width: 360px;
  min-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  animation: bpg-fadeIn 0.2s ease;
}

@keyframes bpg-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.bpg-tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px;
}

.bpg-tooltip-content {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  margin: 0 0 16px;
}

.bpg-tooltip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bpg-tooltip-progress {
  font-size: 12px;
  color: #999;
}

.bpg-tooltip-actions {
  display: flex;
  gap: 8px;
}

.bpg-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.bpg-btn-secondary {
  background: #f3f4f6;
  color: #374151;
}
.bpg-btn-secondary:hover { background: #e5e7eb; }

.bpg-btn-primary {
  background: #6366f1;
  color: #fff;
}
.bpg-btn-primary:hover { background: #4f46e5; }

.bpg-btn-close {
  position: absolute;
  top: 8px; right: 8px;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
}
.bpg-btn-close:hover { background: #e5e7eb; }

/* Highlight ring around target element */
.bpg-highlight {
  outline: 3px solid #6366f1 !important;
  outline-offset: 4px !important;
  border-radius: 4px;
  position: relative;
  z-index: 999999 !important;
}

/* Launcher styles */
.bpg-beacon {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 999990;
}

.bpg-beacon-pulse {
  animation: bpg-pulse 2s infinite;
}

@keyframes bpg-pulse {
  0% { box-shadow: 0 0 0 0 currentColor; }
  70% { box-shadow: 0 0 0 10px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.bpg-launcher-button {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  z-index: 999990;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.15s;
}
.bpg-launcher-button:hover { transform: scale(1.05); }

/* Center modal for steps without a selector */
.bpg-center-modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
`;
}

function getContentJS(): string {
  return `
// Business Process Guide - Content Script
(function() {
  'use strict';

  let currentProcess = null;
  let currentStepIndex = 0;
  let overlayEl = null;
  let tooltipEl = null;

  function safeQuerySelector(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function waitForElement(selector, timeoutMs) {
    return new Promise((resolve) => {
      if (!selector) {
        resolve(null);
        return;
      }

      const immediate = safeQuerySelector(selector);
      if (immediate) {
        resolve(immediate);
        return;
      }

      const start = Date.now();
      const observer = new MutationObserver(() => {
        const found = safeQuerySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

      const tick = () => {
        const found = safeQuerySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          observer.disconnect();
          resolve(null);
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  let _bpgData = { processes: [], launchers: [], appName: '' };

  function init() {
    // Load data from JSON file bundled with extension
    fetch(chrome.runtime.getURL('data.json'))
      .then(r => r.json())
      .then(data => {
        _bpgData = data;
        setupLaunchers();
      })
      .catch(err => console.error('BPG: Failed to load data', err));

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'START_PROCESS') {
        startProcess(msg.processIndex);
      }
      if (msg.type === 'GET_DATA') {
        return true; // keep channel open for sendResponse
      }
    });

    // Also respond to data requests from popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'GET_DATA') {
        sendResponse(_bpgData);
        return true;
      }
    });
  }

  function getProcesses() {
    return _bpgData.processes || [];
  }

  function getLaunchers() {
    return _bpgData.launchers || [];
  }

  function setupLaunchers() {
    const launchers = getLaunchers();
    const processes = getProcesses();

    launchers.forEach(launcher => {
      if (!launcher.is_active) return;
      if (document.querySelector('[data-bpg-launcher-id="' + launcher.id + '"]')) return;

      const targetEl = safeQuerySelector(launcher.selector);
      if (!targetEl && launcher.selector) return;

      if (launcher.type === 'button') {
        const btn = document.createElement('button');
        btn.className = 'bpg-launcher-button';
        btn.setAttribute('data-bpg-launcher-id', launcher.id);
        btn.style.backgroundColor = launcher.color || '#6366f1';
        btn.textContent = launcher.label || launcher.name;
        btn.addEventListener('click', () => {
          const procIndex = processes.findIndex(p => p.id === launcher.tour_id);
          if (procIndex >= 0) startProcess(procIndex);
        });

        if (targetEl) {
          targetEl.style.position = 'relative';
          targetEl.appendChild(btn);
        } else {
          btn.style.position = 'fixed';
          btn.style.bottom = '20px';
          btn.style.right = '20px';
          document.body.appendChild(btn);
        }
      } else {
        // beacon or hotspot
        const dot = document.createElement('div');
        dot.className = 'bpg-beacon' + (launcher.pulse ? ' bpg-beacon-pulse' : '');
        dot.setAttribute('data-bpg-launcher-id', launcher.id);
        dot.style.backgroundColor = launcher.color || '#6366f1';
        dot.style.color = launcher.color || '#6366f1';
        dot.addEventListener('click', () => {
          const procIndex = processes.findIndex(p => p.id === launcher.tour_id);
          if (procIndex >= 0) startProcess(procIndex);
        });

        if (targetEl) {
          targetEl.style.position = 'relative';
          dot.style.position = 'absolute';
          dot.style.top = '-7px';
          dot.style.right = '-7px';
          targetEl.appendChild(dot);
        }
      }
    });
  }

  function startProcess(index) {
    const processes = getProcesses();
    if (!processes[index] || !processes[index].steps.length) return;
    currentProcess = processes[index];
    currentStepIndex = 0;
    showStep();
  }

  async function showStep() {
    cleanup();
    if (!currentProcess || currentStepIndex >= currentProcess.steps.length) {
      endProcess();
      return;
    }

    const step = currentProcess.steps[currentStepIndex];
    const targetEl = step.selector ? await waitForElement(step.selector, 2500) : null;

    // Overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'bpg-overlay';
    overlayEl.addEventListener('click', endProcess);
    document.body.appendChild(overlayEl);

    // Highlight target
    if (targetEl) {
      targetEl.classList.add('bpg-highlight');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Tooltip
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'bpg-tooltip' + (!targetEl ? ' bpg-center-modal' : '');
    tooltipEl.innerHTML = buildTooltipHTML(
      step,
      currentStepIndex,
      currentProcess.steps.length,
      currentProcess.name,
      Boolean(step.selector && !targetEl)
    );
    document.body.appendChild(tooltipEl);

    // Position tooltip relative to target
    if (targetEl) {
      positionTooltip(tooltipEl, targetEl, step.placement);
    }

    // Button events
    tooltipEl.querySelector('.bpg-btn-close')?.addEventListener('click', endProcess);
    tooltipEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      currentStepIndex--;
      showStep();
    });
    tooltipEl.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      currentStepIndex++;
      showStep();
    });
  }

  function buildTooltipHTML(step, index, total, processName, targetMissing) {
    var isFirst = index === 0;
    var isLast = index === total - 1;
    return '<button class="bpg-btn-close">&times;</button>'
      + '<div style="font-size:11px;color:#6366f1;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' + processName + '</div>'
      + '<h3 class="bpg-tooltip-title">' + step.title + '</h3>'
      + '<p class="bpg-tooltip-content">' + step.content + '</p>'
      + (targetMissing
        ? '<p style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:0 0 12px">Target element not found. Check if the selector is correct and visible on this page.</p>'
        : '')
      + '<div class="bpg-tooltip-footer">'
      + '<span class="bpg-tooltip-progress">Step ' + (index + 1) + ' of ' + total + '</span>'
      + '<div class="bpg-tooltip-actions">'
      + (!isFirst ? '<button class="bpg-btn bpg-btn-secondary" data-action="prev">Back</button>' : '')
      + '<button class="bpg-btn bpg-btn-primary" data-action="next">' + (isLast ? 'Finish' : 'Next') + '</button>'
      + '</div></div>';
  }

  function positionTooltip(tooltip, target, placement) {
    const rect = target.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const gap = 12;
    let top, left;

    switch (placement) {
      case 'top':
        top = rect.top - th - gap;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + gap;
        break;
      default: // bottom
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tw / 2;
    }

    // Keep in viewport
    top = Math.max(8, Math.min(window.innerHeight - th - 8, top));
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }

  function cleanup() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    document.querySelectorAll('.bpg-highlight').forEach(el => el.classList.remove('bpg-highlight'));
  }

  function endProcess() {
    cleanup();
    currentProcess = null;
    currentStepIndex = 0;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

function getPopupHTML(appName: string, processes: Process[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fafafa;
    }
    .header {
      background: #6366f1;
      color: white;
      padding: 16px;
    }
    .header h1 { font-size: 15px; font-weight: 600; }
    .header p { font-size: 11px; opacity: 0.8; margin-top: 2px; }
    .process-list { padding: 8px; }
    .process-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .process-item:hover { border-color: #6366f1; background: #f5f3ff; }
    .process-name { font-size: 13px; font-weight: 500; color: #111; }
    .process-steps { font-size: 11px; color: #888; margin-top: 2px; }
    .play-btn {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .play-btn:hover { background: #4f46e5; }
    .empty {
      text-align: center;
      padding: 32px 16px;
      color: #888;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${appName}</h1>
    <p>Business Process Guide</p>
  </div>
  <div class="process-list" id="processList"></div>
  <script src="popup.js"></script>
</body>
</html>`;
}

function getPopupJS(): string {
  return `
document.addEventListener('DOMContentLoaded', () => {
  // Processes are embedded in data.js; we read from the content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => window.BPG_PROCESSES || [],
    }, (results) => {
      const processes = results?.[0]?.result || [];
      const list = document.getElementById('processList');
      
      if (processes.length === 0) {
        list.innerHTML = '<div class="empty">No business processes configured for this page.</div>';
        return;
      }

      processes.forEach(function(proc, index) {
        var item = document.createElement('div');
        item.className = 'process-item';
        item.innerHTML = '<div>'
          + '<div class="process-name">' + proc.name + '</div>'
          + '<div class="process-steps">' + proc.steps.length + ' step' + (proc.steps.length !== 1 ? 's' : '') + '</div>'
          + '</div>'
          + '<button class="play-btn" title="Start process">▶</button>';
        item.querySelector('.play-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_PROCESS', processIndex: index });
          window.close();
        });
        item.addEventListener('click', () => {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_PROCESS', processIndex: index });
          window.close();
        });
        list.appendChild(item);
      });
    });
  });
});
`;
}
