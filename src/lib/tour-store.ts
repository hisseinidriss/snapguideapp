import { supabase } from "@/integrations/supabase/client";
import type { TourStep } from "@/types/tour";

export function generateEmbedScript(steps: TourStep[], launchers?: any[]): string {
  const stepsJson = JSON.stringify(
    steps.map((s) => ({
      title: s.title,
      content: s.content,
      selector: s.selector,
      placement: s.placement,
    })),
    null,
    2
  );

  const launchersJson = launchers?.length
    ? JSON.stringify(
        launchers
          .filter((l) => l.is_active)
          .map((l) => ({
            type: l.type,
            selector: l.selector,
            label: l.label,
            color: l.color,
            pulse: l.pulse,
          })),
        null,
        2
      )
    : "[]";

  return `<!-- WalkThru Embed Script -->
<script>
(function() {
  var steps = ${stepsJson};
  var launchers = ${launchersJson};
  
  var currentStep = 0;
  var overlay, tooltip;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'tb-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;transition:opacity 0.3s;';
    overlay.onclick = cleanup;
    document.body.appendChild(overlay);
  }

  function showStep(index) {
    if (index >= steps.length) { cleanup(); return; }
    var step = steps[index];
    var target = step.selector ? document.querySelector(step.selector) : null;
    
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.id = 'tb-tooltip';
    tooltip.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:10px;padding:20px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.15);font-family:system-ui;animation:tb-fade 0.2s ease;';
    
    tooltip.innerHTML = '<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;">' + step.title + '</h3>' +
      '<p style="margin:0 0 16px;font-size:14px;color:#666;">' + step.content + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-size:12px;color:#999;">' + (index + 1) + ' of ' + steps.length + '</span>' +
      '<div>' +
      (index > 0 ? '<button onclick="window.__tb_prev()" style="margin-right:8px;padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">Back</button>' : '') +
      '<button onclick="window.__tb_next()" style="padding:6px 16px;border:none;border-radius:6px;background:#1e6b45;color:#fff;cursor:pointer;">' + (index === steps.length - 1 ? 'Done' : 'Next') + '</button>' +
      '</div></div>';
    
    document.body.appendChild(tooltip);
    positionTooltip(tooltip, target, step.placement);
  }

  function positionTooltip(el, target, placement) {
    if (!target) {
      el.style.top = '50%'; el.style.left = '50%'; el.style.transform = 'translate(-50%,-50%)';
      return;
    }
    var rect = target.getBoundingClientRect();
    var pos = { top: rect.bottom + 12, left: rect.left };
    if (placement === 'top') pos = { top: rect.top - el.offsetHeight - 12, left: rect.left };
    if (placement === 'left') pos = { top: rect.top, left: rect.left - el.offsetWidth - 12 };
    if (placement === 'right') pos = { top: rect.top, left: rect.right + 12 };
    if (placement === 'center') { el.style.top='50%'; el.style.left='50%'; el.style.transform='translate(-50%,-50%)'; return; }
    el.style.top = pos.top + 'px';
    el.style.left = pos.left + 'px';
  }

  function cleanup() {
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
    overlay = null; tooltip = null;
  }

  window.__tb_next = function() { currentStep++; showStep(currentStep); };
  window.__tb_prev = function() { currentStep--; showStep(currentStep); };
  window.__tb_start = function() { currentStep = 0; createOverlay(); showStep(0); };

  // Add CSS animation
  var style = document.createElement('style');
  style.textContent = '@keyframes tb-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes tb-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}';
  document.head.appendChild(style);

  // Create launchers
  launchers.forEach(function(l) {
    var target = l.selector ? document.querySelector(l.selector) : null;
    if (!target && l.selector) return;
    
    var el = document.createElement('div');
    el.className = 'tb-launcher';
    
    if (l.type === 'beacon' || l.type === 'hotspot') {
      el.style.cssText = 'position:absolute;width:16px;height:16px;border-radius:50%;background:' + (l.color || '#1e6b45') + ';cursor:pointer;z-index:99997;' + (l.pulse ? 'animation:tb-pulse 2s infinite;' : '');
    } else {
      el.style.cssText = 'position:absolute;padding:6px 14px;border-radius:20px;background:' + (l.color || '#1e6b45') + ';color:#fff;font-size:13px;font-family:system-ui;cursor:pointer;z-index:99997;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      el.textContent = l.label || 'Help';
    }
    
    el.onclick = function() { window.__tb_start(); };
    
    if (target) {
      target.style.position = target.style.position || 'relative';
      target.appendChild(el);
    } else {
      el.style.position = 'fixed';
      el.style.bottom = '20px';
      el.style.right = '20px';
      document.body.appendChild(el);
    }
  });

  // Auto-start if no launchers
  if (launchers.length === 0 && steps.length > 0) {
    window.__tb_start();
  }
})();
</script>`;
}

export { supabase };
