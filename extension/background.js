// SnapGuide Scribe - Background service worker
const SUPABASE_URL = "https://hubuhcerqyijytmxqesr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnVoY2VycXlpanl0bXhxZXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDMxNDgsImV4cCI6MjA5MTIxOTE0OH0.2ryjODkjIpdpzAzAPqGhnrDM3ynL0D58Ob8mzdffxRk";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SG_CAPTURE_STEP") {
    handleCaptureStep(msg.data).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // async
  }
});

async function handleCaptureStep(data) {
  const state = await chrome.storage.local.get(["sg_recording", "sg_recording_id", "sg_step_count"]);
  if (!state.sg_recording || !state.sg_recording_id) return { error: "Not recording" };

  const stepCount = (state.sg_step_count || 0) + 1;

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
    try {
      const blob = dataURLtoBlob(data.screenshot_data);
      const path = `${state.sg_recording_id}/step-${stepCount}.png`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/recording-screenshots/${path}`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": blob.type, "x-upsert": "true" },
        body: blob
      });
      if (uploadRes.ok) {
        step.screenshot_url = `${SUPABASE_URL}/storage/v1/object/public/recording-screenshots/${path}`;
      }
    } catch (e) {
      console.error("Screenshot upload failed:", e);
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/process_recording_steps`, {
    method: "POST", headers, body: JSON.stringify(step)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  await chrome.storage.local.set({ sg_step_count: stepCount });

  // Notify popup
  chrome.runtime.sendMessage({ type: "SG_STEP_ADDED", count: stepCount }).catch(() => {});

  return { success: true, count: stepCount };
}

function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Capture visible tab screenshot when requested
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SG_CAPTURE_SCREENSHOT") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }).then(dataUrl => {
      sendResponse({ screenshot: dataUrl });
    }).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});
