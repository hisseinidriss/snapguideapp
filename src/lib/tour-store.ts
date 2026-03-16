import { supabase } from "@/services/backend";
import type { TourStep } from "@/types/tour";

export function generateEmbedScript(
  steps: TourStep[],
  launchers?: any[],
  options?: { tourId?: string; appId?: string; supabaseUrl?: string; supabaseKey?: string }
): string {
  const stepsJson = JSON.stringify(
    steps.map((s) => ({
      title: s.title,
      content: s.content,
      selector: s.selector,
      placement: s.placement,
      step_type: (s as any).step_type || 'standard',
      video_url: (s as any).video_url || null,
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

  const tourId = options?.tourId || "";
  const appId = options?.appId || "";
  const trackingUrl = options?.supabaseUrl
    ? `${options.supabaseUrl}/functions/v1/track-events`
    : "";
  const anonKey = options?.supabaseKey || "";

  return `<!-- WalkThru Embed Script -->
<script>
(function() {
  var steps = ${stepsJson};
  var launchers = ${launchersJson};
  var tourId = '${tourId}';
  var appId = '${appId}';
  var trackUrl = '${trackingUrl}';
  var anonKey = '${anonKey}';
  
  var currentStep = 0;
  var overlay, tooltip;
  var sessionId = 'wt_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  var eventQueue = [];

  function track(eventType, stepIndex) {
    if (!trackUrl || !tourId || !appId) return;
    eventQueue.push({ tour_id: tourId, app_id: appId, event_type: eventType, step_index: stepIndex, session_id: sessionId });
    if (eventQueue.length === 1) setTimeout(flushEvents, 1000);
  }

  function flushEvents() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0);
    try {
      var headers = { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey };
      fetch(trackUrl, { method: 'POST', headers: headers, body: JSON.stringify({ events: batch }) }).catch(function(){});
    } catch(e) {}
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'tb-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;transition:opacity 0.3s;';
    overlay.onclick = function() { track('tour_abandoned', currentStep); flushEvents(); cleanup(); };
    document.body.appendChild(overlay);
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

  function showStep(index) {
    if (index >= steps.length) { track('tour_completed', null); flushEvents(); cleanup(); return; }
    var step = steps[index];
    var target = step.selector ? document.querySelector(step.selector) : null;
    track('step_viewed', index);
    var isVideo = step.step_type === 'video' && step.video_url;
    var embedUrl = isVideo ? getVideoEmbedUrl(step.video_url) : null;
    
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.id = 'tb-tooltip';
    tooltip.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:10px;padding:20px;max-width:' + (isVideo ? '480px' : '320px') + ';box-shadow:0 8px 32px rgba(0,0,0,0.15);font-family:system-ui;animation:tb-fade 0.2s ease;';
    
    var videoHtml = '';
    if (isVideo && embedUrl) {
      videoHtml = '<div style="margin:12px 0;border-radius:8px;overflow:hidden;aspect-ratio:16/9;background:#000">'
        + '<iframe src="' + embedUrl + '" style="width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen></iframe>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:12px">'
        + '<button onclick="document.querySelector(\'#tb-tooltip iframe\').requestFullscreen()" style="padding:4px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">⛶ Full Screen</button>'
        + '<button onclick="window.__tb_skip_video()" style="padding:4px 10px;border:none;border-radius:6px;background:transparent;cursor:pointer;font-size:12px;color:#999;">Skip Video ⏭</button>'
        + '</div>';
    }

    tooltip.innerHTML = '<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;">' + step.title + '</h3>' +
      '<p style="margin:0 0 ' + (isVideo ? '8' : '16') + 'px;font-size:14px;color:#666;">' + step.content + '</p>' +
      videoHtml +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-size:12px;color:#999;">' + (index + 1) + ' of ' + steps.length + '</span>' +
      '<div>' +
      (index > 0 ? '<button onclick="window.__tb_prev()" style="margin-right:8px;padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">Back</button>' : '') +
      '<button onclick="window.__tb_next()" style="padding:6px 16px;border:none;border-radius:6px;background:#1e6b45;color:#fff;cursor:pointer;">' + (index === steps.length - 1 ? 'Done' : 'Next') + '</button>' +
      '</div></div>';
    
    document.body.appendChild(tooltip);
    positionTooltip(tooltip, target, step.placement);

    // Track video events
    if (isVideo && embedUrl) {
      track('video_started', index);
      var iframe = tooltip.querySelector('iframe');
      if (iframe) {
        iframe.addEventListener('load', function() {
          // Mark video as started
        });
      }
    }
  }

  function calcPos(rect, tw, th, gap, side) {
    if (side==='top') return {top:rect.top-th-gap, left:rect.left+rect.width/2-tw/2};
    if (side==='left') return {top:rect.top+rect.height/2-th/2, left:rect.left-tw-gap};
    if (side==='right') return {top:rect.top+rect.height/2-th/2, left:rect.right+gap};
    return {top:rect.bottom+gap, left:rect.left+rect.width/2-tw/2};
  }
  function positionTooltip(el, target, placement) {
    if (!target) {
      el.style.top = '50%'; el.style.left = '50%'; el.style.transform = 'translate(-50%,-50%)';
      return;
    }
    var rect = target.getBoundingClientRect();
    var tw = el.offsetWidth, th = el.offsetHeight, gap = 12, m = 8;
    var pref = placement || 'bottom';
    var sides = ['bottom','top','right','left'];
    var order = [pref].concat(sides.filter(function(s){return s!==pref;}));
    var best = null;
    for (var i=0;i<order.length;i++) {
      var p = calcPos(rect,tw,th,gap,order[i]);
      if (p.top>=m && p.left>=m && p.top+th<=window.innerHeight-m && p.left+tw<=window.innerWidth-m &&
          (p.left+tw<rect.left || p.left>rect.right || p.top+th<rect.top || p.top>rect.bottom)) {
        best=p; break;
      }
    }
    if (!best) { best=calcPos(rect,tw,th,gap,pref); best.top=Math.max(m,Math.min(window.innerHeight-th-m,best.top)); best.left=Math.max(m,Math.min(window.innerWidth-tw-m,best.left)); }
    el.style.top = best.top + 'px';
    el.style.left = best.left + 'px';
  }

  function cleanup() {
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
    overlay = null; tooltip = null;
  }

  window.__tb_next = function() { currentStep++; showStep(currentStep); };
  window.__tb_prev = function() { currentStep--; showStep(currentStep); };
  window.__tb_start = function() { currentStep = 0; track('tour_started', null); createOverlay(); showStep(0); };
  window.__tb_skip_video = function() { track('video_skipped', currentStep); currentStep++; showStep(currentStep); };

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

  // Flush on page unload
  window.addEventListener('beforeunload', flushEvents);
})();
</script>`;
}

export { supabase };
