const { app } = require("@azure/functions");
const { corsHeaders, preflight, handleError } = require("../shared/http");

function isAllowedUrl(rawUrl) {
  if (!rawUrl) return false;

  try {
    const target = new URL(rawUrl);
    if (!["http:", "https:"].includes(target.protocol)) return false;

    const storageBase = process.env.STORAGE_PUBLIC_BASE_URL;
    if (storageBase) {
      try {
        const storageUrl = new URL(storageBase);
        if (target.host === storageUrl.host) return true;
      } catch (_) {}
    }

    return target.hostname.endsWith(".blob.core.windows.net");
  } catch (_) {
    return false;
  }
}

app.http("screenshot-file", {
  route: "screenshot-file",
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();

    try {
      const rawUrl = req.query.get("url");
      if (!rawUrl) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          jsonBody: { error: "url is required" },
        };
      }

      if (!isAllowedUrl(rawUrl)) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          jsonBody: { error: "Only Azure Blob screenshot URLs are allowed" },
        };
      }

      const upstream = await fetch(rawUrl, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!upstream.ok) {
        return {
          status: upstream.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          jsonBody: { error: `Failed to fetch screenshot (${upstream.status})` },
        };
      }

      const body = await upstream.arrayBuffer();
      return {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("content-type") || "image/png",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        body: Buffer.from(body),
      };
    } catch (err) {
      return handleError(ctx, err);
    }
  },
});
