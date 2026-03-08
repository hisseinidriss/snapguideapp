import { App, Tour, TourStep } from "@/types/tour";

const generateId = () => Math.random().toString(36).substr(2, 9);

const STORAGE_KEY = "tourbuilder_apps";

function loadApps(): App[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveApps(apps: App[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function getApps(): App[] {
  return loadApps();
}

export function getApp(id: string): App | undefined {
  return loadApps().find((a) => a.id === id);
}

export function createApp(name: string, url: string, description: string): App {
  const apps = loadApps();
  const app: App = {
    id: generateId(),
    name,
    url,
    description,
    tours: [],
    createdAt: new Date().toISOString(),
  };
  apps.push(app);
  saveApps(apps);
  return app;
}

export function deleteApp(id: string) {
  const apps = loadApps().filter((a) => a.id !== id);
  saveApps(apps);
}

export function createTour(appId: string, name: string): Tour {
  const apps = loadApps();
  const app = apps.find((a) => a.id === appId);
  if (!app) throw new Error("App not found");
  const tour: Tour = {
    id: generateId(),
    name,
    appId,
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  app.tours.push(tour);
  saveApps(apps);
  return tour;
}

export function updateTour(appId: string, tourId: string, updates: Partial<Pick<Tour, "name" | "steps">>) {
  const apps = loadApps();
  const app = apps.find((a) => a.id === appId);
  if (!app) return;
  const tour = app.tours.find((t) => t.id === tourId);
  if (!tour) return;
  if (updates.name) tour.name = updates.name;
  if (updates.steps) tour.steps = updates.steps;
  tour.updatedAt = new Date().toISOString();
  saveApps(apps);
}

export function deleteTour(appId: string, tourId: string) {
  const apps = loadApps();
  const app = apps.find((a) => a.id === appId);
  if (!app) return;
  app.tours = app.tours.filter((t) => t.id !== tourId);
  saveApps(apps);
}

export function createStep(partial?: Partial<TourStep>): TourStep {
  return {
    id: generateId(),
    title: partial?.title || "New Step",
    content: partial?.content || "Describe what happens here.",
    selector: partial?.selector || "",
    placement: partial?.placement || "bottom",
    order: partial?.order ?? 0,
  };
}

export function generateEmbedScript(appId: string, tourId: string): string {
  const app = getApp(appId);
  const tour = app?.tours.find((t) => t.id === tourId);
  if (!tour) return "// Tour not found";

  const stepsJson = JSON.stringify(tour.steps, null, 2);

  return `<!-- TourBuilder Embed Script -->
<script>
(function() {
  var steps = ${stepsJson};
  
  var currentStep = 0;
  var overlay, tooltip;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'tb-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;';
    document.body.appendChild(overlay);
  }

  function showStep(index) {
    if (index >= steps.length) { cleanup(); return; }
    var step = steps[index];
    var target = step.selector ? document.querySelector(step.selector) : null;
    
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.id = 'tb-tooltip';
    tooltip.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:10px;padding:20px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.15);font-family:system-ui;';
    
    tooltip.innerHTML = '<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;">' + step.title + '</h3>' +
      '<p style="margin:0 0 16px;font-size:14px;color:#666;">' + step.content + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-size:12px;color:#999;">' + (index + 1) + ' of ' + steps.length + '</span>' +
      '<div>' +
      (index > 0 ? '<button onclick="window.__tb_prev()" style="margin-right:8px;padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">Back</button>' : '') +
      '<button onclick="window.__tb_next()" style="padding:6px 16px;border:none;border-radius:6px;background:#1e6b45;color:#fff;cursor:pointer;">' + (index === steps.length - 1 ? 'Done' : 'Next') + '</button>' +
      '</div></div>';
    
    document.body.appendChild(tooltip);
    
    if (target) {
      var rect = target.getBoundingClientRect();
      var pos = { top: rect.bottom + 12, left: rect.left };
      if (step.placement === 'top') pos = { top: rect.top - tooltip.offsetHeight - 12, left: rect.left };
      if (step.placement === 'left') pos = { top: rect.top, left: rect.left - tooltip.offsetWidth - 12 };
      if (step.placement === 'right') pos = { top: rect.top, left: rect.right + 12 };
      tooltip.style.top = pos.top + 'px';
      tooltip.style.left = pos.left + 'px';
    } else {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }

  function cleanup() {
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
  }

  window.__tb_next = function() { currentStep++; showStep(currentStep); };
  window.__tb_prev = function() { currentStep--; showStep(currentStep); };

  if (steps.length > 0) {
    createOverlay();
    showStep(0);
  }
})();
</script>`;
}
