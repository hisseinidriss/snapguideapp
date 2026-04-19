// POST /api/upload-screenshot
// Body: { recording_id, step_number, image (data URL or base64 PNG) }
// Uploads to recording-screenshots/<recording_id>/step-<n>.png and returns the public URL.
const { app } = require("@azure/functions");
const { json, preflight, handleError } = require("../shared/http");
const { uploadBuffer } = require("../shared/storage");

function decodeImage(input) {
  let b64 = input;
  let contentType = "image/png";
  if (b64.startsWith("data:")) {
    const m = b64.match(/^data:(.*?);base64,(.*)$/);
    if (m) { contentType = m[1]; b64 = m[2]; }
  }
  return { buffer: Buffer.from(b64, "base64"), contentType };
}

app.http("upload-screenshot", {
  route: "upload-screenshot",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const { recording_id, step_number, image } = await req.json();
      if (!recording_id || step_number == null || !image) {
        return json(400, { error: "recording_id, step_number and image required" });
      }
      const { buffer, contentType } = decodeImage(image);
      const path = `${recording_id}/step-${step_number}.png`;
      const url = await uploadBuffer({
        container: "recording-screenshots",
        path,
        buffer,
        contentType,
      });
      return json(200, { screenshot_url: `${url}?v=${Date.now()}` });
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
