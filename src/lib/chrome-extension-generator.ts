import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";

interface ProcessStep {
  title: string;
  content: string;
  selector: string | null;
  placement: string;
  sort_order: number;
  target_url?: string | null;
  click_selector?: string | null;
  step_type?: string;
  video_url?: string | null;
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
  appUrl: string,
  trackingConfig?: { supabaseUrl: string; supabaseKey: string }
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
            target_url: (s as any).target_url || null,
            click_selector: (s as any).click_selector || null,
            step_type: (s as any).step_type || 'standard',
            video_url: (s as any).video_url || null,
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
    permissions: ["activeTab", "storage", "tabs"],
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
  const trackingData = trackingConfig ? {
    trackUrl: `${trackingConfig.supabaseUrl}/functions/v1/track-events`,
    anonKey: trackingConfig.supabaseKey,
  } : {};

  zip.file(
    "data.json",
    JSON.stringify({ processes, launchers: activeLaunchers, appName, appId, appUrl: appUrl || '', ...trackingData }, null, 2)
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

    // IsDB sage green background
    ctx.fillStyle = "#4d8b6f";
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();

    // Letter W for WalkThru
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${size * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("W", size / 2, size / 2 + size * 0.03);

    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, "image/png");
  });
}

function getContentCSS(): string {
  return `
/* Business Process Guide - Overlay Styles */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

.bpg-overlay-box {
  position: fixed;
  background: rgba(34,41,47,0.45);
  z-index: 999998;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.bpg-spotlight-ring {
  position: fixed;
  z-index: 999998;
  border: 2.5px solid #ef4444;
  border-radius: 8px;
  pointer-events: none;
  box-shadow: 0 0 0 3px rgba(239,68,68,0.25), 0 0 20px rgba(239,68,68,0.15);
  transition: all 0.3s ease;
}

.bpg-tooltip {
  position: fixed;
  z-index: 999999;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(34,41,47,0.12), 0 0 0 1px rgba(77,139,111,0.1);
  padding: 22px;
  max-width: 360px;
  min-width: 280px;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  animation: bpg-fadeIn 0.25s ease;
}

@keyframes bpg-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.bpg-tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3b34;
  margin: 0 0 8px;
}

.bpg-tooltip-content {
  font-size: 14px;
  color: #5a6b62;
  line-height: 1.6;
  margin: 0 0 16px;
}

.bpg-tooltip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bpg-tooltip-progress {
  font-size: 12px;
  color: #8a9b92;
  font-weight: 500;
}

.bpg-tooltip-actions {
  display: flex;
  gap: 8px;
}

.bpg-btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}

.bpg-btn-secondary {
  background: #eef2f0;
  color: #2d3b34;
}
.bpg-btn-secondary:hover { background: #dfe6e2; }

.bpg-btn-primary {
  background: #4d8b6f;
  color: #fff;
}
.bpg-btn-primary:hover { background: #3d7a5e; }

.bpg-btn-close {
  position: absolute;
  top: 10px; right: 10px;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: none;
  background: #eef2f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #5a6b62;
  transition: all 0.15s;
}
.bpg-btn-close:hover { background: #dfe6e2; color: #2d3b34; }

/* Legacy highlight class - kept for compatibility */
.bpg-highlight {
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: transform 0.15s;
  font-family: 'DM Sans', sans-serif;
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
  let overlayEls = [];
  let spotlightRing = null;
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

      // Try multiple selector strategies
      function tryFind() {
        // Direct match
        var el = safeQuerySelector(selector);
        if (el) return el;
        
        // If selector looks like it could be inside an iframe, try iframes
        try {
          var iframes = document.querySelectorAll('iframe');
          for (var i = 0; i < iframes.length; i++) {
            try {
              var iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
              if (iframeDoc) {
                var found = iframeDoc.querySelector(selector);
                if (found) return found;
              }
            } catch(e) { /* cross-origin iframe, skip */ }
          }
        } catch(e) {}
        
        return null;
      }

      const immediate = tryFind();
      if (immediate) {
        resolve(immediate);
        return;
      }

      const start = Date.now();
      const observer = new MutationObserver(() => {
        const found = tryFind();
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

      const tick = () => {
        const found = tryFind();
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

  let _bpgData = { processes: [], launchers: [], appName: '', appId: '', trackUrl: '', anonKey: '' };
  var _sessionId = 'bpg_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  var _eventQueue = [];

  function trackEvent(eventType, stepIndex) {
    if (!_bpgData.trackUrl || !_bpgData.anonKey || !_bpgData.appId || !currentProcess) return;
    _eventQueue.push({
      tour_id: currentProcess.id,
      app_id: _bpgData.appId,
      event_type: eventType,
      step_index: typeof stepIndex === 'number' ? stepIndex : null,
      session_id: _sessionId
    });
    if (_eventQueue.length === 1) setTimeout(flushEvents, 1000);
  }

  function flushEvents() {
    if (_eventQueue.length === 0) return;
    var batch = _eventQueue.splice(0);
    try {
      fetch(_bpgData.trackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': _bpgData.anonKey,
          'Authorization': 'Bearer ' + _bpgData.anonKey
        },
        body: JSON.stringify({ events: batch })
      }).catch(function(){});
    } catch(e) {}
  }

  window.addEventListener('beforeunload', flushEvents);

  function init() {
    // Load data from JSON file bundled with extension
    fetch(chrome.runtime.getURL('data.json'))
      .then(r => r.json())
      .then(data => {
        _bpgData = data;
        setupLaunchers();
        resumeIfNeeded();
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
        btn.style.backgroundColor = launcher.color || '#4d8b6f';
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
        dot.style.backgroundColor = launcher.color || '#4d8b6f';
        dot.style.color = launcher.color || '#4d8b6f';
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

  function resumeIfNeeded() {
    const saved = sessionStorage.getItem('bpg_resume');
    if (!saved) return;
    sessionStorage.removeItem('bpg_resume');
    try {
      const { processIndex, stepIndex } = JSON.parse(saved);
      const processes = getProcesses();
      if (processes[processIndex]) {
        currentProcess = processes[processIndex];
        currentStepIndex = stepIndex;
        // Small delay to let the page render
        setTimeout(() => showStep(), 800);
      }
    } catch(e) {}
  }

  function startProcess(index) {
    const processes = getProcesses();
    if (!processes[index] || !processes[index].steps.length) return;
    currentProcess = processes[index];
    currentStepIndex = 0;
    _sessionId = 'bpg_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    trackEvent('tour_started', null);
    showStep();
  }

  async function showStep() {
    cleanup();
    if (!currentProcess || currentStepIndex >= currentProcess.steps.length) {
      trackEvent('tour_completed', null);
      flushEvents();
      cleanup();
      currentProcess = null;
      currentStepIndex = 0;
      return;
    }
    trackEvent('step_viewed', currentStepIndex);

    const step = currentProcess.steps[currentStepIndex];

    // Multi-page: navigate if step has a target_url different from current page
    if (step.target_url) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      const currentFull = window.location.href;
      // Check if target_url is a relative path or full URL
      let targetFull;
      try {
        targetFull = new URL(step.target_url, window.location.origin).href;
      } catch(e) {
        targetFull = step.target_url;
      }
      if (currentFull !== targetFull && currentPath !== step.target_url) {
        // Save state so we can resume after navigation
        sessionStorage.setItem('bpg_resume', JSON.stringify({
          processIndex: _bpgData.processes.indexOf(currentProcess),
          stepIndex: currentStepIndex
        }));
        window.location.href = targetFull;
        return;
      }
    }

    // Click action: click a button to open a modal/popup before looking for target
    if (step.click_selector) {
      const clickTarget = await waitForElement(step.click_selector, 5000);
      if (clickTarget) {
        clickTarget.click();
        // Wait a moment for the popup/modal to appear
        await new Promise(r => setTimeout(r, 600));
      }
    }

    const targetEl = step.selector ? await waitForElement(step.selector, 5000) : null;

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
      
      // Create 4-box overlay with spotlight cutout
      const rect = targetEl.getBoundingClientRect();
      const pad = 8;
      const x = rect.left - pad;
      const y = rect.top - pad;
      const w = rect.width + pad * 2;
      const h = rect.height + pad * 2;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Top box
      var topBox = document.createElement('div');
      topBox.className = 'bpg-overlay-box';
      topBox.style.cssText = 'top:0;left:0;width:' + vw + 'px;height:' + Math.max(0, y) + 'px';
      topBox.addEventListener('click', endProcess);
      document.body.appendChild(topBox);
      
      // Bottom box
      var bottomBox = document.createElement('div');
      bottomBox.className = 'bpg-overlay-box';
      bottomBox.style.cssText = 'top:' + (y + h) + 'px;left:0;width:' + vw + 'px;height:' + Math.max(0, vh - y - h) + 'px';
      bottomBox.addEventListener('click', endProcess);
      document.body.appendChild(bottomBox);
      
      // Left box
      var leftBox = document.createElement('div');
      leftBox.className = 'bpg-overlay-box';
      leftBox.style.cssText = 'top:' + y + 'px;left:0;width:' + Math.max(0, x) + 'px;height:' + h + 'px';
      leftBox.addEventListener('click', endProcess);
      document.body.appendChild(leftBox);
      
      // Right box
      var rightBox = document.createElement('div');
      rightBox.className = 'bpg-overlay-box';
      rightBox.style.cssText = 'top:' + y + 'px;left:' + (x + w) + 'px;width:' + Math.max(0, vw - x - w) + 'px;height:' + h + 'px';
      rightBox.addEventListener('click', endProcess);
      document.body.appendChild(rightBox);
      
      overlayEls = [topBox, bottomBox, leftBox, rightBox];
      
      // Spotlight ring around target
      spotlightRing = document.createElement('div');
      spotlightRing.className = 'bpg-spotlight-ring';
      spotlightRing.style.cssText = 'top:' + y + 'px;left:' + x + 'px;width:' + w + 'px;height:' + h + 'px';
      document.body.appendChild(spotlightRing);
      
      targetEl.classList.add('bpg-highlight');
    } else {
      // No target: full overlay
      var fullOverlay = document.createElement('div');
      fullOverlay.className = 'bpg-overlay-box';
      fullOverlay.style.cssText = 'top:0;left:0;width:100%;height:100%';
      fullOverlay.addEventListener('click', endProcess);
      document.body.appendChild(fullOverlay);
      overlayEls = [fullOverlay];
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
      + '<div style="font-size:11px;color:#4d8b6f;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;font-family:DM Sans,sans-serif">' + processName + '</div>'
      + '<h3 class="bpg-tooltip-title">' + step.title + '</h3>'
      + '<p class="bpg-tooltip-content">' + step.content + '</p>'
      + (targetMissing
        ? '<p style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:0 0 12px;font-family:DM Sans,sans-serif">Target element not found. Check if the selector is correct and visible on this page.</p>'
        : '')
      + '<div class="bpg-tooltip-footer">'
      + '<span class="bpg-tooltip-progress">Step ' + (index + 1) + ' of ' + total + '</span>'
      + '<div class="bpg-tooltip-actions">'
      + (!isFirst ? '<button class="bpg-btn bpg-btn-secondary" data-action="prev">Back</button>' : '')
      + '<button class="bpg-btn bpg-btn-primary" data-action="next">' + (isLast ? 'Finish' : 'Next') + '</button>'
      + '</div></div>';
  }

  function calcPosition(rect, tw, th, gap, side) {
    switch (side) {
      case 'top':    return { top: rect.top - th - gap, left: rect.left + rect.width / 2 - tw / 2 };
      case 'bottom': return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - tw / 2 };
      case 'left':   return { top: rect.top + rect.height / 2 - th / 2, left: rect.left - tw - gap };
      case 'right':  return { top: rect.top + rect.height / 2 - th / 2, left: rect.right + gap };
      default:       return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - tw / 2 };
    }
  }

  function fitsViewport(pos, tw, th, margin) {
    return pos.top >= margin && pos.left >= margin &&
           pos.top + th <= window.innerHeight - margin &&
           pos.left + tw <= window.innerWidth - margin;
  }

  function overlapsTarget(pos, tw, th, rect) {
    return !(pos.left + tw < rect.left || pos.left > rect.right ||
             pos.top + th < rect.top || pos.top > rect.bottom);
  }

  function positionTooltip(tooltip, target, placement) {
    const rect = target.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const gap = 12;
    const margin = 8;

    // Try preferred placement first, then fallbacks
    const preferred = placement || 'bottom';
    const fallbacks = ['bottom', 'top', 'right', 'left'].filter(s => s !== preferred);
    const tryOrder = [preferred, ...fallbacks];

    let bestPos = null;
    for (const side of tryOrder) {
      const pos = calcPosition(rect, tw, th, gap, side);
      if (fitsViewport(pos, tw, th, margin) && !overlapsTarget(pos, tw, th, rect)) {
        bestPos = pos;
        break;
      }
    }

    // If nothing fits perfectly, use preferred but clamp to viewport
    if (!bestPos) {
      bestPos = calcPosition(rect, tw, th, gap, preferred);
      bestPos.top = Math.max(margin, Math.min(window.innerHeight - th - margin, bestPos.top));
      bestPos.left = Math.max(margin, Math.min(window.innerWidth - tw - margin, bestPos.left));
    }

    tooltip.style.top = bestPos.top + 'px';
    tooltip.style.left = bestPos.left + 'px';
  }

  function cleanup() {
    overlayEls.forEach(function(el) { el.remove(); });
    overlayEls = [];
    if (spotlightRing) { spotlightRing.remove(); spotlightRing = null; }
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    document.querySelectorAll('.bpg-highlight').forEach(el => el.classList.remove('bpg-highlight'));
  }

  function endProcess() {
    if (currentProcess) {
      trackEvent('tour_abandoned', currentStepIndex);
      flushEvents();
    }
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
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 320px;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f7f5;
    }
    .header {
      background: linear-gradient(135deg, #4d8b6f, #5a9e7e);
      color: white;
      padding: 18px 16px;
    }
    .header h1 { font-size: 15px; font-weight: 600; }
    .header p { font-size: 11px; opacity: 0.85; margin-top: 3px; font-weight: 400; }
    .process-list { padding: 10px; }
    .process-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: white;
      border: 1px solid #dfe6e2;
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .process-item:hover { border-color: #4d8b6f; background: #f0f7f3; }
    .process-name { font-size: 13px; font-weight: 500; color: #2d3b34; }
    .process-steps { font-size: 11px; color: #8a9b92; margin-top: 2px; }
    .play-btn {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #4d8b6f;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .play-btn:hover { background: #3d7a5e; }
    .empty {
      text-align: center;
      padding: 32px 16px;
      color: #8a9b92;
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
  const list = document.getElementById('processList');

  // Load data directly from the bundled JSON file
  fetch(chrome.runtime.getURL('data.json'))
    .then(r => r.json())
    .then(data => {
      const processes = data.processes || [];

      if (processes.length === 0) {
        list.innerHTML = '<div class="empty">No business processes configured for this page.</div>';
        return;
      }

      var appUrl = (data.appUrl || '').replace(/\\/+$/, '');

      function launchProcess(index) {
        var proc = processes[index];
        // Determine the best URL to navigate to: first step's target_url or appUrl
        var firstStepUrl = (proc && proc.steps && proc.steps[0] && proc.steps[0].target_url) || '';
        var navUrl = firstStepUrl || appUrl;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          var tab = tabs[0];
          var tabUrl = (tab.url || '').replace(/\\/+$/, '');
          
          // Check if we need to navigate: either not on the app at all, or first step needs a specific page
          var onApp = appUrl && tabUrl.startsWith(appUrl);
          var needsNav = false;
          
          if (!onApp && navUrl) {
            needsNav = true;
          } else if (onApp && firstStepUrl) {
            // On the app but maybe wrong page - check if first step needs a different page
            try {
              var targetFull = new URL(firstStepUrl, appUrl || window.location.origin).href.replace(/\\/+$/, '');
              if (tabUrl !== targetFull && !tabUrl.startsWith(targetFull)) {
                needsNav = true;
                navUrl = targetFull;
              }
            } catch(e) {}
          }

          if (needsNav && navUrl) {
            // Resolve relative URLs against appUrl
            var finalUrl = navUrl;
            try {
              if (navUrl && !navUrl.startsWith('http')) {
                finalUrl = new URL(navUrl, appUrl || window.location.origin).href;
              }
            } catch(e) { finalUrl = navUrl; }
            
            chrome.tabs.update(tab.id, { url: finalUrl }, () => {
              function onUpdated(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(onUpdated);
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { type: 'START_PROCESS', processIndex: index });
                  }, 1500);
                }
              }
              chrome.tabs.onUpdated.addListener(onUpdated);
            });
          } else {
            chrome.tabs.sendMessage(tab.id, { type: 'START_PROCESS', processIndex: index });
          }
          window.close();
        });
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
          launchProcess(index);
        });
        item.addEventListener('click', () => {
          launchProcess(index);
        });
        list.appendChild(item);
      });
    })
    .catch(() => {
      list.innerHTML = '<div class="empty">Failed to load business processes.</div>';
    });
});
`;
}
