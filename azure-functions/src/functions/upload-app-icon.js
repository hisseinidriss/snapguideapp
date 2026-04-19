// POST /api/upload-app-icon
// Body: { app_id, filename, image (data URL or base64) }
// Uploads to app-icons/<app_id>/icon.<ext> and returns the public URL.
const { app } = require("@azure/functions");
const { json, preflight, handleError } = require("../shared/http");
const { uploadBuffer } = require("../shared/storage");

app.http("upload-app-icon", {
  route: "upload-app-icon",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const { app_id, filename, image } = await req.json();
      if (!app_id || !image) {
        return json(400, { error: "app_id and image required" });
      }
      let b64 = image;
      let contentType = "image/png";
      if (b64.startsWith("data:")) {
        const m = b64.match(/^data:(.*?);base64,(.*)$/);
        if (m) { contentType = m[1]; b64 = m[2]; }
      }
      const ext = (filename?.split(".").pop() || "png").toLowerCase();
      const path = `${app_id}/icon.${ext}`;
      const url = await uploadBuffer({
        container: "app-icons",
        path,
        buffer: Buffer.from(b64, "base64"),
        contentType,
      });
      return json(200, { icon_url: `${url}?v=${Date.now()}` });
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
