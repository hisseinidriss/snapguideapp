// SnapGuide extension — backend configuration
// Points the extension at the Azure Functions API.
// To override (e.g. for local dev), set chrome.storage.local.sg_api_base to a full URL.
const SG_DEFAULT_API_BASE = "https://walkthru-api-hnhpfhg6e7erhvf0.uaenorth-01.azurewebsites.net/api";

async function sgApiBase() {
  try {
    const { sg_api_base } = await chrome.storage.local.get("sg_api_base");
    if (sg_api_base && typeof sg_api_base === "string") return sg_api_base.replace(/\/$/, "");
  } catch (_) {}
  return SG_DEFAULT_API_BASE;
}

async function sgApi(path, init = {}) {
  const base = await sgApiBase();
  const url = `${base}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
  if (!res.ok) {
    const msg = (json && json.error) || res.statusText || "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }
  return json;
}
