// SnapGuide Scribe — Popup script (Azure API backend)
// Uses sgApi() from config.js (loaded before this script in popup.html).

const $ = (id) => document.getElementById(id);

let apps = [];
let recordings = [];

// Load apps on popup open
(async () => {
  try {
    apps = await sgApi("/apps");
    const sel = $("app-select");
    sel.innerHTML = '<option value="">Select an application</option>';
    (apps || []).forEach((a) => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = a.name;
      sel.appendChild(o);
    });
  } catch (e) {
    showError("Failed to load apps: " + e.message);
  }

  // Restore recording state
  const state = await chrome.storage.local.get([
    "sg_recording",
    "sg_recording_id",
    "sg_recording_title",
    "sg_step_count",
  ]);
  if (state.sg_recording) {
    showRecordingView(state.sg_recording_title || "Recording", state.sg_step_count || 0);
  }
})();

$("app-select").addEventListener("change", async (e) => {
  const appId = e.target.value;
  const recSel = $("recording-select");
  if (!appId) {
    recSel.innerHTML = '<option value="">Select an app first</option>';
    updateStartBtn();
    return;
  }
  try {
    recordings = await sgApi(`/recordings?app_id=${encodeURIComponent(appId)}`);
    recSel.innerHTML = '<option value="">Create new (enter name below)</option>';
    (recordings || []).forEach((r) => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.title;
      recSel.appendChild(o);
    });
  } catch (e) {
    showError("Failed to load recordings: " + e.message);
  }
  updateStartBtn();
});

$("recording-select").addEventListener("change", updateStartBtn);
$("new-recording-name").addEventListener("input", updateStartBtn);

function updateStartBtn() {
  const appId = $("app-select").value;
  const recId = $("recording-select").value;
  const newName = $("new-recording-name").value.trim();
  $("start-btn").disabled = !appId || (!recId && !newName);
}

$("start-btn").addEventListener("click", async () => {
  const appId = $("app-select").value;
  let recId = $("recording-select").value;
  let recTitle = "";

  if (!recId) {
    const name = $("new-recording-name").value.trim();
    if (!name) return;
    try {
      const created = await sgApi("/recordings", {
        method: "POST",
        body: JSON.stringify({ app_id: appId, title: name, status: "draft" }),
      });
      recId = created.id;
      recTitle = name;
    } catch (e) {
      showError("Failed to create recording: " + e.message);
      return;
    }
  } else {
    recTitle = recordings.find((r) => r.id === recId)?.title || "Recording";
  }

  // Existing step count
  let existingSteps = [];
  try {
    existingSteps = await sgApi(`/recording-steps?recording_id=${encodeURIComponent(recId)}`);
  } catch (_) {}

  // Auto-redact preference from app
  const appRow = apps.find((a) => a.id === appId);
  const autoRedact = appRow && typeof appRow.auto_redact === "boolean" ? appRow.auto_redact : true;

  await chrome.storage.local.set({
    sg_recording: true,
    sg_recording_id: recId,
    sg_recording_title: recTitle,
    sg_app_id: appId,
    sg_step_count: (existingSteps || []).length || 0,
    sg_auto_redact: autoRedact,
  });

  // Notify all tabs to start capturing
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "SG_START_RECORDING" }); } catch (_) {}
  }

  showRecordingView(recTitle, (existingSteps || []).length || 0);
});

$("stop-btn").addEventListener("click", async () => {
  await chrome.storage.local.set({ sg_recording: false });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "SG_STOP_RECORDING" }); } catch (_) {}
  }
  showSetupView();
});

function showRecordingView(title, count) {
  $("setup-view").style.display = "none";
  $("recording-view").style.display = "block";
  $("rec-title").textContent = title;
  $("step-count").textContent = count;
}

function showSetupView() {
  $("setup-view").style.display = "block";
  $("recording-view").style.display = "none";
}

function showError(msg) {
  const el = $("error-msg");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 6000);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SG_STEP_ADDED") {
    $("step-count").textContent = msg.count;
  }
});
