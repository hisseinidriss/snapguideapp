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

export type BrowserTarget = 'chrome' | 'edge' | 'firefox';

export async function generateChromeExtension(
  appId: string,
  appName: string,
  appUrl: string,
  trackingConfig?: { supabaseUrl: string; supabaseKey: string },
  browser: BrowserTarget = 'chrome'
) {
  // Trim whitespace from appUrl to prevent invalid match patterns
  appUrl = (appUrl || '').trim();
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

  // manifest.json – browser-specific
  const manifest: Record<string, any> = {
    manifest_version: browser === 'firefox' ? 2 : 3,
    name: `${appName} - Business Process Guide`,
    version: "1.0.0",
    description: `Interactive business process guide for ${appName}`,
  };

  if (browser === 'firefox') {
    // Firefox uses Manifest V2
    manifest.permissions = ["activeTab", "storage", "tabs"];
    manifest.content_security_policy = "script-src 'self'; object-src 'self'; frame-src https://www.youtube.com https://youtube.com https://onedrive.live.com https://*.sharepoint.com https://*.1drv.ms;";
    manifest.browser_action = {
      default_popup: "popup.html",
      default_icon: { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" },
    };
    manifest.browser_specific_settings = {
      gecko: { id: `walkthru-${appId.slice(0, 8)}@walkthru.app`, strict_min_version: "109.0" },
    };
    manifest.web_accessible_resources = ["data.json"];
  } else {
    // Chrome & Edge use Manifest V3
    manifest.permissions = ["activeTab", "storage", "tabs", "scripting"];
    manifest.content_security_policy = {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src https://www.youtube.com https://youtube.com https://onedrive.live.com https://*.sharepoint.com https://*.1drv.ms",
    };
    manifest.action = {
      default_popup: "popup.html",
      default_icon: { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" },
    };
    manifest.web_accessible_resources = [
      {
        resources: ["data.json"],
        matches: appUrl ? [`${appUrl.replace(/\/+$/, "")}/*`] : ["<all_urls>"],
      },
    ];
  }

  manifest.content_scripts = [
    {
      matches: appUrl ? [`${appUrl.replace(/\/+$/, "")}/*`] : ["<all_urls>"],
      js: ["content.js"],
      css: ["content.css"],
      run_at: "document_idle",
    },
  ];
  manifest.icons = { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" };

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

  const browserLabel = browser === 'firefox' ? 'firefox' : browser === 'edge' ? 'edge' : 'chrome';
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${appName.replace(/\s+/g, "-").toLowerCase()}-${browserLabel}-extension.zip`);
}

import isdbLogo from "@/assets/isdb-logo.png";

function generateIcon(size: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, size, size);
      
      // Draw logo maintaining aspect ratio, centered
      const scale = Math.min(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create icon blob"));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load IsDB logo"));
    img.src = isdbLogo;
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

/* Video step styles */
.bpg-video-container {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #000;
}
.bpg-video-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.bpg-video-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.bpg-btn-skip {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #8a9b92;
  font-family: 'DM Sans', sans-serif;
  transition: color 0.15s;
}
.bpg-btn-skip:hover { color: #2d3b34; }
.bpg-btn-fullscreen {
  padding: 4px 10px;
  border: 1px solid #dfe6e2;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #5a6b62;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}
.bpg-btn-fullscreen:hover { border-color: #4d8b6f; color: #2d3b34; }

.bpg-tooltip.bpg-video-tooltip {
  max-width: 480px;
  min-width: 380px;
}
`;
}

function getContentJS(): string {
  return `
// Business Process Guide - Content Script
(function() {
  'use strict';
  if (window.__bpg_guard) return;
  window.__bpg_guard = true;

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
  var _dataReady = false;
  var _pendingStartIndex = null;

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

  // Listen for messages from popup - registered immediately, outside init()
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_PROCESS') {
      if (!_dataReady) {
        _pendingStartIndex = msg.processIndex;
        return;
      }
      startProcess(msg.processIndex);
    }
    if (msg.type === 'GET_DATA') {
      sendResponse(_bpgData);
      return true;
    }
  });

  var _initialized = false;
  function init() {
    if (_initialized) return;
    _initialized = true;

    // Load data from JSON file bundled with extension
    fetch(chrome.runtime.getURL('data.json'))
      .then(r => r.json())
      .then(data => {
        _bpgData = data;
        _dataReady = true;
        setupLaunchers();
        resumeIfNeeded();

        if (_pendingStartIndex != null) {
          var idx = _pendingStartIndex;
          _pendingStartIndex = null;
          startProcess(idx);
        }
      })
      .catch(err => console.error('BPG: Failed to load data', err));
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
    // Check sessionStorage for multi-page navigation resume
    const saved = sessionStorage.getItem('bpg_resume');
    if (saved) {
      sessionStorage.removeItem('bpg_resume');
      try {
        const { processIndex, stepIndex } = JSON.parse(saved);
        const processes = getProcesses();
        if (processes[processIndex]) {
          currentProcess = processes[processIndex];
          currentStepIndex = stepIndex;
          setTimeout(() => showStep(), 800);
          return;
        }
      } catch(e) {}
    }

    // Check chrome.storage for pending process launch (from popup navigation)
    chrome.storage.local.get(['bpg_pending_process'], function(result) {
      if (result.bpg_pending_process != null) {
        var pendingIndex = result.bpg_pending_process;
        chrome.storage.local.remove('bpg_pending_process');
        var processes = getProcesses();
        if (processes[pendingIndex]) {
          setTimeout(function() { startProcess(pendingIndex); }, 800);
        }
      }
    });
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
      // Process completed - mark as completed in storage and notify popup
      if (currentProcess) {
        var completedProcessId = currentProcess.id;
        trackEvent('tour_completed', null);
        flushEvents();
        // Clear any stale resume/pending data
        sessionStorage.removeItem('bpg_resume');
        chrome.storage.local.remove('bpg_pending_process');
        cleanup();
        currentProcess = null;
        currentStepIndex = 0;
        chrome.storage.local.get(['bpg_completed'], function(result) {
          var completed = result.bpg_completed || {};
          completed[completedProcessId] = true;
          chrome.storage.local.set({ bpg_completed: completed });
          try { chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETED', processId: completedProcessId }); } catch(e) {}
        });
      } else {
        cleanup();
        currentProcess = null;
        currentStepIndex = 0;
      }
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
    var step_isVideo = step.step_type === 'video' && step.video_url;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'bpg-tooltip' + (!targetEl ? ' bpg-center-modal' : '') + (step_isVideo ? ' bpg-video-tooltip' : '');
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
    tooltipEl.querySelector('[data-action="restart"]')?.addEventListener('click', () => {
      currentStepIndex = 0;
      showStep();
    });

    // Video-specific events
    if (step_isVideo) {
      trackEvent('video_started', currentStepIndex);
      
      // Detect iframe load failure and show fallback
      var videoIframe = tooltipEl.querySelector('.bpg-video-container iframe');
      var videoFallback = tooltipEl.querySelector('.bpg-video-fallback');
      if (videoIframe && videoFallback) {
        var iframeLoaded = false;
        videoIframe.addEventListener('load', function() { iframeLoaded = true; });
        videoIframe.addEventListener('error', function() {
          videoIframe.style.display = 'none';
          videoFallback.style.display = 'flex';
        });
        setTimeout(function() {
          if (!iframeLoaded) {
            // iframe never fired load - likely blocked
            videoIframe.style.display = 'none';
            videoFallback.style.display = 'flex';
          }
          // If iframeLoaded is true, the embed is working (cross-origin is fine)
        }, 5000);
      }
      
      // Fallback click opens video in new tab
      tooltipEl.querySelector('[data-action="open-video"]')?.addEventListener('click', function() {
        var container = tooltipEl.querySelector('.bpg-video-container');
        var videoUrl = container?.getAttribute('data-video-url');
        if (videoUrl) window.open(videoUrl, '_blank');
      });
      
      tooltipEl.querySelector('[data-action="fullscreen"]')?.addEventListener('click', () => {
        var iframe = tooltipEl.querySelector('.bpg-video-container iframe');
        if (iframe && iframe.style.display !== 'none') {
          iframe.requestFullscreen();
        } else {
          var container = tooltipEl.querySelector('.bpg-video-container');
          var videoUrl = container?.getAttribute('data-video-url');
          if (videoUrl) window.open(videoUrl, '_blank');
        }
      });
      tooltipEl.querySelector('[data-action="skip-video"]')?.addEventListener('click', () => {
        trackEvent('video_skipped', currentStepIndex);
        currentStepIndex++;
        showStep();
      });
    }
  }

  function getVideoEmbedUrl(url) {
    if (!url) return null;
    var ytMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0&modestbranding=1';
    if (url.indexOf('onedrive.live.com') >= 0 || url.indexOf('1drv.ms') >= 0 || url.indexOf('sharepoint.com') >= 0) {
      return url.replace('/redir?', '/embed?');
    }
    if (url.indexOf('/embed') >= 0) return url;
    return url;
  }

  function buildTooltipHTML(step, index, total, processName, targetMissing) {
    var isFirst = index === 0;
    var isLast = index === total - 1;
    var isVideo = step.step_type === 'video' && step.video_url;
    var embedUrl = isVideo ? getVideoEmbedUrl(step.video_url) : null;
    
    var videoHtml = '';
    if (isVideo && embedUrl) {
      videoHtml = '<div class="bpg-video-container" data-video-url="' + step.video_url + '">'
        + '<iframe src="' + embedUrl + '" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen></iframe>'
        + '<div class="bpg-video-fallback" style="display:none;flex-direction:column;align-items:center;justify-content:center;background:#f1f5f1;border-radius:8px;padding:24px;font-family:DM Sans,sans-serif;min-height:160px" data-action="open-video">'
        + '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4d8b6f" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
        + '<span style="margin-top:8px;color:#4d8b6f;font-size:13px;font-weight:500">Video could not load</span>'
        + '<span style="margin-top:4px;color:#6b7280;font-size:11px">Click to open in a new tab</span>'
        + '</div></div>'
        + '<div class="bpg-video-actions">'
        + '<button class="bpg-btn-fullscreen" data-action="fullscreen">⛶ Full Screen</button>'
        + '<button class="bpg-btn-skip" data-action="skip-video">Skip Video ⏭</button>'
        + '</div>';
    }

    return '<button class="bpg-btn-close">&times;</button>'
      + '<div style="font-size:11px;color:#4d8b6f;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;font-family:DM Sans,sans-serif">' + processName + '</div>'
      + '<h3 class="bpg-tooltip-title">' + step.title + '</h3>'
      + '<p class="bpg-tooltip-content">' + step.content + '</p>'
      + videoHtml
      + (targetMissing
        ? '<p style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:0 0 12px;font-family:DM Sans,sans-serif">Target element not found. Check if the selector is correct and visible on this page.</p>'
        : '')
      + '<div class="bpg-tooltip-footer">'
      + '<span class="bpg-tooltip-progress">Step ' + (index + 1) + ' of ' + total + '</span>'
      + '<div class="bpg-tooltip-actions">'
      + (!isFirst ? '<button class="bpg-btn bpg-btn-secondary" data-action="prev">Back</button>' : '')
      + (isLast ? '<button class="bpg-btn bpg-btn-secondary" data-action="restart" title="Restart from step 1">↻ Restart</button>' : '')
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

  // ==================== SCRIBE RECORDER ====================
  var _scribeRecording = false;
  var _scribeSteps = [];
  var _scribeRecordingId = null;
  var _scribeOverlay = null;

  function scribeGetSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    if (el.getAttribute('name')) return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';
    if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    // Class-based
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\\s+/).filter(function(c) { return c && !c.startsWith('bpg-') && !c.startsWith('scribe-'); }).slice(0, 2);
      if (classes.length) {
        var sel = el.tagName.toLowerCase() + '.' + classes.join('.');
        try { if (document.querySelectorAll(sel).length === 1) return sel; } catch(e) {}
      }
    }
    // nth-child fallback
    var parent = el.parentElement;
    if (parent) {
      var children = Array.from(parent.children);
      var idx = children.indexOf(el);
      return scribeGetSelector(parent) + ' > ' + el.tagName.toLowerCase() + ':nth-child(' + (idx + 1) + ')';
    }
    return el.tagName.toLowerCase();
  }

  function scribeGetElementText(el) {
    if (!el) return '';
    var text = (el.textContent || el.innerText || '').trim();
    if (text.length > 80) text = text.substring(0, 77) + '...';
    // For inputs, use placeholder or label
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      var label = document.querySelector('label[for="' + el.id + '"]');
      if (label) return (label.textContent || '').trim();
      if (el.placeholder) return el.placeholder;
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    }
    return text;
  }

  function scribeCaptureScreenshot(el) {
    // Use html2canvas-like approach: capture visible area
    // Since we can't load external libs, we'll capture element bounds info
    // The screenshot will be taken by the background/popup via chrome API
    return null; // screenshots handled server-side or via extension tab capture
  }

  function scribeGenerateInstruction(actionType, tag, text, inputValue) {
    tag = (tag || '').toLowerCase();
    text = (text || '').trim();
    if (text.length > 50) text = text.substring(0, 47) + '...';
    switch (actionType) {
      case 'click':
        if (tag === 'button' || tag === 'a') return 'Click "' + (text || 'button') + '"';
        if (text) return 'Click "' + text + '"';
        return 'Click the ' + (tag || 'element');
      case 'type':
        if (inputValue) return 'Enter "' + (inputValue.length > 40 ? inputValue.substring(0, 37) + '...' : inputValue) + '" in the ' + (text || 'field');
        return 'Type in the ' + (text || 'field');
      case 'select':
        if (inputValue) return 'Select "' + inputValue + '" from the ' + (text || 'dropdown');
        return 'Make a selection from the ' + (text || 'dropdown');
      case 'navigate':
        return 'Navigate to ' + (text || 'a new page');
      case 'scroll':
        return 'Scroll down the page';
      default:
        return text ? 'Interact with "' + text + '"' : 'Perform an action';
    }
  }

  function scribeAddStep(actionType, el, extra) {
    if (!_scribeRecording) return;
    extra = extra || {};
    var tag = el ? el.tagName : '';
    var text = el ? scribeGetElementText(el) : (extra.text || '');
    var selector = el ? scribeGetSelector(el) : '';
    var inputValue = extra.inputValue || '';
    var instruction = scribeGenerateInstruction(actionType, tag, text, inputValue);

    _scribeSteps.push({
      action_type: actionType,
      instruction: instruction,
      selector: selector,
      target_url: extra.targetUrl || window.location.href,
      element_text: text,
      element_tag: tag,
      input_value: inputValue,
    });

    // Update overlay counter
    if (_scribeOverlay) {
      var counter = _scribeOverlay.querySelector('.scribe-count');
      if (counter) counter.textContent = _scribeSteps.length + ' steps';
    }
  }

  var _scribeClickHandler = function(e) {
    if (!_scribeRecording) return;
    var el = e.target;
    // Ignore scribe UI clicks
    if (el.closest && el.closest('.scribe-toolbar')) return;
    // Determine action type
    var tag = el.tagName;
    if (tag === 'SELECT') {
      setTimeout(function() {
        scribeAddStep('select', el, { inputValue: el.options?.[el.selectedIndex]?.text || el.value });
      }, 100);
    } else {
      scribeAddStep('click', el);
    }
  };

  var _scribeInputHandler = function(e) {
    if (!_scribeRecording) return;
    var el = e.target;
    if (el.closest && el.closest('.scribe-toolbar')) return;
    // Debounce - only capture when user pauses typing
    clearTimeout(el._scribeTimer);
    el._scribeTimer = setTimeout(function() {
      scribeAddStep('type', el, { inputValue: el.value });
    }, 800);
  };

  var _lastUrl = window.location.href;
  var _scribeNavHandler = function() {
    if (!_scribeRecording) return;
    var newUrl = window.location.href;
    if (newUrl !== _lastUrl) {
      scribeAddStep('navigate', null, { text: newUrl, targetUrl: newUrl });
      _lastUrl = newUrl;
    }
  };

  function scribeStartRecording(recordingId) {
    _scribeRecordingId = recordingId;
    _scribeSteps = [];
    _scribeRecording = true;
    _lastUrl = window.location.href;

    // Add event listeners
    document.addEventListener('click', _scribeClickHandler, true);
    document.addEventListener('input', _scribeInputHandler, true);
    
    // Poll for URL changes (for SPAs)
    _scribeNavInterval = setInterval(_scribeNavHandler, 500);

    // Show recording toolbar
    _scribeOverlay = document.createElement('div');
    _scribeOverlay.className = 'scribe-toolbar';
    _scribeOverlay.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:10px;padding:10px 18px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);font-family:DM Sans,sans-serif;border:2px solid #ef4444';
    _scribeOverlay.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#ef4444;animation:bpg-pulse 1.5s infinite"></div>'
      + '<span style="font-size:13px;font-weight:600;color:#2d3b34">Recording</span>'
      + '<span class="scribe-count" style="font-size:12px;color:#8a9b92;min-width:60px">0 steps</span>'
      + '<button class="scribe-stop-btn" style="padding:6px 14px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif">⏹ Stop</button>';
    document.body.appendChild(_scribeOverlay);

    _scribeOverlay.querySelector('.scribe-stop-btn').addEventListener('click', function() {
      scribeStopRecording();
    });
  }

  var _scribeNavInterval;

  function scribeStopRecording() {
    _scribeRecording = false;
    document.removeEventListener('click', _scribeClickHandler, true);
    document.removeEventListener('input', _scribeInputHandler, true);
    clearInterval(_scribeNavInterval);

    if (_scribeOverlay) { _scribeOverlay.remove(); _scribeOverlay = null; }

    // Save steps to server
    if (_scribeSteps.length > 0 && _scribeRecordingId && _bpgData.trackUrl) {
      var saveUrl = _bpgData.trackUrl.replace('/track-events', '/save-recording-step');
      fetch(saveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': _bpgData.anonKey,
          'Authorization': 'Bearer ' + _bpgData.anonKey
        },
        body: JSON.stringify({
          recording_id: _scribeRecordingId,
          steps: _scribeSteps
        })
      }).then(function(r) { return r.json(); })
        .then(function() {
          // Show success
          var msg = document.createElement('div');
          msg.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:12px 24px;background:#4d8b6f;color:#fff;border-radius:10px;font-family:DM Sans,sans-serif;font-size:13px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.15)';
          msg.textContent = '✓ ' + _scribeSteps.length + ' steps saved to recording';
          document.body.appendChild(msg);
          setTimeout(function() { msg.remove(); }, 3000);
        })
        .catch(function() {});
    }

    _scribeSteps = [];
    _scribeRecordingId = null;
  }

  // Listen for scribe commands from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'START_SCRIBE') {
      scribeStartRecording(msg.recordingId);
    }
    if (msg.type === 'STOP_SCRIBE') {
      scribeStopRecording();
    }
  });

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
    .search-box {
      padding: 10px 10px 0;
      background: #fff;
      border-bottom: 1px solid #dfe6e2;
    }
    .search-input {
      width: 100%;
      padding: 8px 12px 8px 32px;
      border: 1px solid #dfe6e2;
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      outline: none;
      background: #f4f7f5 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a9b92' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") 10px center no-repeat;
      margin-bottom: 10px;
    }
    .search-input:focus { border-color: #4d8b6f; background-color: #fff; }
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
    .process-item.completed { border-left: 3px solid #4d8b6f; }
    .process-name-row { display: flex; align-items: center; gap: 6px; }
    .process-name { font-size: 13px; font-weight: 500; color: #2d3b34; }
    .process-steps { font-size: 11px; color: #8a9b92; margin-top: 2px; }
    .check-icon { color: #4d8b6f; font-size: 14px; flex-shrink: 0; }
    .process-actions { display: flex; align-items: center; gap: 6px; }
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
    .restart-btn {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: #eef2f0;
      color: #5a6b62;
      border: none;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .restart-btn:hover { background: #dfe6e2; color: #2d3b34; }
    .empty {
      text-align: center;
      padding: 32px 16px;
      color: #8a9b92;
      font-size: 13px;
    }
    .no-results { text-align: center; padding: 20px 16px; color: #8a9b92; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${appName}</h1>
    <p>Business Process Guide</p>
  </div>
  <div class="search-box">
    <input class="search-input" id="searchInput" placeholder="Search processes..." type="text" />
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
  const searchInput = document.getElementById('searchInput');
  var completedProcesses = {};

  // Load completed processes from storage
  chrome.storage.local.get(['bpg_completed'], function(result) {
    completedProcesses = result.bpg_completed || {};
    renderProcesses();
  });

  // Listen for completion events from content script
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'PROCESS_COMPLETED' && msg.processId) {
      completedProcesses[msg.processId] = true;
      chrome.storage.local.set({ bpg_completed: completedProcesses });
      renderProcesses();
    }
  });

  // Search filtering
  searchInput.addEventListener('input', function() {
    renderProcesses();
  });

  var _processes = [];
  var _appUrl = '';

  function renderProcesses() {
    list.innerHTML = '';
    var query = (searchInput.value || '').trim().toLowerCase();
    var filtered = _processes.filter(function(proc) {
      if (!query) return true;
      return proc.name.toLowerCase().indexOf(query) >= 0;
    });

    if (filtered.length === 0 && _processes.length > 0) {
      list.innerHTML = '<div class="no-results">No processes match your search.</div>';
      return;
    }
    if (_processes.length === 0) {
      list.innerHTML = '<div class="empty">No business processes configured for this page.</div>';
      return;
    }

    filtered.forEach(function(proc) {
      var origIndex = _processes.indexOf(proc);
      var isCompleted = !!completedProcesses[proc.id];
      var item = document.createElement('div');
      item.className = 'process-item' + (isCompleted ? ' completed' : '');
      item.innerHTML = '<div>'
        + '<div class="process-name-row">'
        + (isCompleted ? '<span class="check-icon" title="Completed">✓</span>' : '')
        + '<span class="process-name">' + proc.name + '</span>'
        + '</div>'
        + '<div class="process-steps">' + proc.steps.length + ' step' + (proc.steps.length !== 1 ? 's' : '') + '</div>'
        + '</div>'
        + '<div class="process-actions">'
        + (isCompleted ? '<button class="restart-btn" title="Restart">↻</button>' : '')
        + '<button class="play-btn" title="' + (isCompleted ? 'Replay' : 'Start') + ' process">▶</button>'
        + '</div>';
      item.querySelector('.play-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        launchProcess(origIndex);
      });
      if (isCompleted) {
        var restartBtn = item.querySelector('.restart-btn');
        if (restartBtn) {
          restartBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            launchProcess(origIndex);
          });
        }
      }
      item.addEventListener('click', function() {
        launchProcess(origIndex);
      });
      list.appendChild(item);
    });
  }

  function injectAndSend(tabId, message) {
    // Try sending directly first (content script may already be loaded via manifest)
    chrome.tabs.sendMessage(tabId, message, function(response) {
      if (chrome.runtime.lastError) {
        // Content script not ready - inject it then send
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message);
          }, 300);
        });
      }
    });
  }

  function launchProcess(index) {
    var proc = _processes[index];
    var firstStepUrl = (proc && proc.steps && proc.steps[0] && proc.steps[0].target_url) || '';
    var navUrl = firstStepUrl || _appUrl;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      var tab = tabs[0];
      var tabUrl = (tab.url || '').replace(/\\/+$/, '');
      
      var onApp = _appUrl && tabUrl.startsWith(_appUrl);
      var needsNav = false;
      
      if (!onApp && navUrl) {
        needsNav = true;
      } else if (onApp && firstStepUrl) {
        try {
          var targetFull = new URL(firstStepUrl, _appUrl || window.location.origin).href.replace(/\\/+$/, '');
          if (tabUrl !== targetFull && !tabUrl.startsWith(targetFull)) {
            needsNav = true;
            navUrl = targetFull;
          }
        } catch(e) {}
      }

      if (needsNav && navUrl) {
        var finalUrl = navUrl;
        try {
          if (navUrl && !navUrl.startsWith('http')) {
            finalUrl = new URL(navUrl, _appUrl || window.location.origin).href;
          }
        } catch(e) { finalUrl = navUrl; }
        
        // Store pending process so content script auto-starts after page loads
        chrome.storage.local.set({ bpg_pending_process: index }, () => {
          chrome.tabs.update(tab.id, { url: finalUrl });
        });
      } else {
        injectAndSend(tab.id, { type: 'START_PROCESS', processIndex: index });
      }
      window.close();
    });
  }

  // Load data directly from the bundled JSON file
  fetch(chrome.runtime.getURL('data.json'))
    .then(r => r.json())
    .then(data => {
      _processes = data.processes || [];
      _appUrl = (data.appUrl || '').replace(/\\/+$/, '');
      renderProcesses();
    })
    .catch(() => {
      list.innerHTML = '<div class="empty">Failed to load business processes.</div>';
    });
});
`;
}
