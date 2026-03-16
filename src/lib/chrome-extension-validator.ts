import { supabase } from "@/services/backend";

interface ValidationResult {
  status: "pass" | "warning" | "error";
  message: string;
}

export interface ValidationReport {
  passed: boolean;
  results: ValidationResult[];
}

export async function validateChromeExtension(
  appId: string,
  appName: string,
  appUrl: string
): Promise<ValidationReport> {
  const results: ValidationResult[] = [];

  // 1. Check app name
  if (!appName || appName.trim().length === 0) {
    results.push({ status: "error", message: "App name is empty. The extension manifest requires a name." });
  } else {
    results.push({ status: "pass", message: "App name is set." });
  }

  // 2. Check app URL
  if (!appUrl || appUrl.trim().length === 0) {
    results.push({ status: "warning", message: "App URL is empty. The extension will match all URLs (<all_urls>), which is not recommended." });
  } else {
    try {
      new URL(appUrl);
      results.push({ status: "pass", message: "App URL is valid." });
    } catch {
      results.push({ status: "error", message: `App URL "${appUrl}" is not a valid URL.` });
    }
  }

  // 3. Check tours exist
  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select("id, name")
    .eq("app_id", appId);

  if (toursError) {
    results.push({ status: "error", message: "Failed to fetch processes: " + toursError.message });
    return { passed: false, results };
  }

  if (!tours || tours.length === 0) {
    results.push({ status: "error", message: "No processes found. The extension needs at least one process to be useful." });
    return { passed: results.every((r) => r.status !== "error"), results };
  }

  results.push({ status: "pass", message: `${tours.length} process(es) found.` });

  // 4. Check steps for each tour
  const tourIds = tours.map((t) => t.id);
  const { data: steps, error: stepsError } = await supabase
    .from("tour_steps")
    .select("id, title, content, selector, placement, sort_order, tour_id, target_url, click_selector")
    .in("tour_id", tourIds)
    .order("sort_order");

  if (stepsError) {
    results.push({ status: "error", message: "Failed to fetch steps: " + stepsError.message });
    return { passed: false, results };
  }

  for (const tour of tours) {
    const tourSteps = (steps || []).filter((s) => s.tour_id === tour.id);

    if (tourSteps.length === 0) {
      results.push({ status: "warning", message: `Process "${tour.name}" has no steps.` });
      continue;
    }

    results.push({ status: "pass", message: `Process "${tour.name}" has ${tourSteps.length} step(s).` });

    for (const step of tourSteps) {
      const stepLabel = `"${tour.name}" → Step ${step.sort_order + 1} ("${step.title || "Untitled"}")`;

      // Check title
      if (!step.title || step.title.trim().length === 0) {
        results.push({ status: "warning", message: `${stepLabel}: Missing title.` });
      }

      // Check content
      if (!step.content || step.content.trim().length === 0) {
        results.push({ status: "warning", message: `${stepLabel}: Missing content/description.` });
      }

      // Validate CSS selector syntax
      if (step.selector) {
        try {
          document.querySelector(step.selector);
          results.push({ status: "pass", message: `${stepLabel}: Selector syntax is valid.` });
        } catch {
          results.push({ status: "error", message: `${stepLabel}: Invalid CSS selector "${step.selector}".` });
        }
      } else {
        results.push({ status: "warning", message: `${stepLabel}: No target selector — will show as centered modal.` });
      }

      // Validate click_selector syntax
      if (step.click_selector) {
        try {
          document.querySelector(step.click_selector);
          results.push({ status: "pass", message: `${stepLabel}: Click selector syntax is valid.` });
        } catch {
          results.push({ status: "error", message: `${stepLabel}: Invalid click selector "${step.click_selector}".` });
        }
      }

      // Validate target_url
      if (step.target_url) {
        if (!step.target_url.startsWith("/") && !step.target_url.startsWith("http")) {
          results.push({ status: "warning", message: `${stepLabel}: target_url "${step.target_url}" should start with "/" or "http".` });
        }
      }

      // Check placement
      const validPlacements = ["top", "bottom", "left", "right"];
      if (step.placement && !validPlacements.includes(step.placement)) {
        results.push({ status: "warning", message: `${stepLabel}: Unknown placement "${step.placement}". Expected: ${validPlacements.join(", ")}.` });
      }
    }
  }

  // 5. Check launchers
  const { data: launchers } = await supabase
    .from("launchers")
    .select("id, name, selector, tour_id, is_active, type")
    .eq("app_id", appId);

  const activeLaunchers = (launchers || []).filter((l) => l.is_active);

  if (activeLaunchers.length > 0) {
    results.push({ status: "pass", message: `${activeLaunchers.length} active launcher(s) found.` });

    for (const launcher of activeLaunchers) {
      if (launcher.selector) {
        try {
          document.querySelector(launcher.selector);
        } catch {
          results.push({ status: "error", message: `Launcher "${launcher.name}": Invalid CSS selector "${launcher.selector}".` });
        }
      }

      if (launcher.tour_id) {
        const linked = tours.find((t) => t.id === launcher.tour_id);
        if (!linked) {
          results.push({ status: "warning", message: `Launcher "${launcher.name}": Linked process not found.` });
        }
      } else {
        results.push({ status: "warning", message: `Launcher "${launcher.name}": No process linked.` });
      }
    }
  }

  const passed = results.every((r) => r.status !== "error");
  return { passed, results };
}
