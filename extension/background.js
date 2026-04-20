// SnapGuide Scribe — Background service worker (Azure API backend)
importScripts("config.js");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SG_CAPTURE_STEP") {
    handleCaptureStep(msg.data)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true; // async
  }
  if (msg.type === "SG_CAPTURE_SCREENSHOT") {
    chrome.tabs
      .captureVisibleTab(null, { format: "png" })
      .then((dataUrl) => sendResponse({ screenshot: dataUrl }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});

async function handleCaptureStep(data) {
  const state = await chrome.storage.local.get([
    "sg_recording",
    "sg_recording_id",
    "sg_step_count",
    "sg_app_id",
    "sg_auto_redact",
  ]);
  if (!state.sg_recording || !state.sg_recording_id) return { error: "Not recording" };

  const stepCount = (state.sg_step_count || 0) + 1;
  const autoRedact = state.sg_auto_redact !== false; // default ON

  const step = {
    recording_id: state.sg_recording_id,
    sort_order: stepCount - 1,
    action_type: data.action_type || "click",
    instruction: data.instruction || "",
    notes: data.notes || null,
    selector: data.selector || null,
    target_url: data.target_url || null,
    element_text: data.element_text || null,
    element_tag: data.element_tag || null,
    input_value: data.input_value || null,
    screenshot_url: data.screenshot_url || null,
  };

  // Upload screenshot if provided as data URL
  if (data.screenshot_data) {
    let uploaded = false;

    // Try auto-redact path first if enabled
    if (autoRedact) {
      try {
        const json = await sgApi("/redact-screenshot", {
          method: "POST",
          body: JSON.stringify({
            image: data.screenshot_data,
            recording_id: state.sg_recording_id,
            step_number: stepCount,
          }),
        });
        if (json && json.screenshot_url) {
          step.screenshot_url = json.screenshot_url;
          step.notes = json.redacted
            ? `Auto-redacted ${json.regions} sensitive region(s)`
            : step.notes || null;
          uploaded = true;
        }
      } catch (e) {
        console.warn("Redaction failed, falling back to direct upload:", e.message);
      }
    }

    // Fallback: direct upload via /upload-screenshot
    if (!uploaded) {
      try {
        const up = await sgApi("/upload-screenshot", {
          method: "POST",
          body: JSON.stringify({
            image: data.screenshot_data,
            recording_id: state.sg_recording_id,
            step_number: stepCount,
            filename: `step-${stepCount}.png`,
          }),
        });
        if (up && up.screenshot_url) {
          step.screenshot_url = up.screenshot_url;
        }
      } catch (e) {
        console.error("Screenshot upload failed:", e.message);
      }
    }
  }

  // Create the step
  try {
    await sgApi("/recording-steps", {
      method: "POST",
      body: JSON.stringify(step),
    });
  } catch (e) {
    throw new Error("Failed to save step: " + e.message);
  }

  await chrome.storage.local.set({ sg_step_count: stepCount });

  chrome.runtime
    .sendMessage({ type: "SG_STEP_ADDED", count: stepCount })
    .catch(() => {});

  return { success: true, count: stepCount };
}
