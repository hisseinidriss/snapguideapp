// SnapGuide Scribe - Popup script
const SUPABASE_URL = "https://hubuhcerqyijytmxqesr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnVoY2VycXlpanl0bXhxZXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDMxNDgsImV4cCI6MjA5MTIxOTE0OH0.2ryjODkjIpdpzAzAPqGhnrDM3ynL0D58Ob8mzdffxRk";

const headers = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

async function supaGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  return res.json();
}

async function supaPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json();
}

const $ = (id) => document.getElementById(id);

let apps = [];
let recordings = [];

// Load apps on popup open
(async () => {
  try {
    apps = await supaGet("apps", "order=created_at.desc");
    const sel = $("app-select");
    sel.innerHTML = '<option value="">Select an application</option>';
    apps.forEach(a => { const o = document.createElement("option"); o.value = a.id; o.textContent = a.name; sel.appendChild(o); });
  } catch (e) { showError("Failed to load apps: " + e.message); }

  // Check if already recording
  const state = await chrome.storage.local.get(["sg_recording", "sg_recording_id", "sg_recording_title", "sg_step_count"]);
  if (state.sg_recording) {
    showRecordingView(state.sg_recording_title || "Recording", state.sg_step_count || 0);
  }
})();

$("app-select").addEventListener("change", async (e) => {
  const appId = e.target.value;
  const recSel = $("recording-select");
  if (!appId) { recSel.innerHTML = '<option value="">Select an app first</option>'; updateStartBtn(); return; }
  try {
    recordings = await supaGet("process_recordings", `app_id=eq.${appId}&order=created_at.desc`);
    recSel.innerHTML = '<option value="">Create new (enter name below)</option>';
    recordings.forEach(r => { const o = document.createElement("option"); o.value = r.id; o.textContent = r.title; recSel.appendChild(o); });
  } catch (e) { showError("Failed to load recordings"); }
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
      const [created] = await supaPost("process_recordings", { app_id: appId, title: name, status: "draft" });
      recId = created.id;
      recTitle = name;
    } catch (e) { showError("Failed to create recording: " + e.message); return; }
  } else {
    recTitle = recordings.find(r => r.id === recId)?.title || "Recording";
  }

  // Get existing step count
  let existingSteps = [];
  try {
    existingSteps = await supaGet("process_recording_steps", `recording_id=eq.${recId}&select=id`);
  } catch(e) {}

  await chrome.storage.local.set({
    sg_recording: true,
    sg_recording_id: recId,
    sg_recording_title: recTitle,
    sg_app_id: appId,
    sg_step_count: existingSteps.length || 0,
  });

  // Notify all tabs to start capturing
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "SG_START_RECORDING" }); } catch(e) {}
  }

  showRecordingView(recTitle, existingSteps.length || 0);
});

$("stop-btn").addEventListener("click", async () => {
  await chrome.storage.local.set({ sg_recording: false });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "SG_STOP_RECORDING" }); } catch(e) {}
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
  setTimeout(() => el.style.display = "none", 5000);
}

// Listen for step count updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SG_STEP_ADDED") {
    $("step-count").textContent = msg.count;
  }
});
