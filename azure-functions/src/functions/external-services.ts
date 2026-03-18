import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("screenshot-url", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "screenshot-url",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { url } = body;
      if (!url) return errorResponse("URL is required", 400);

      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) return errorResponse("Firecrawl not configured", 500);

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
      formattedUrl = formattedUrl.replace(/^http:\/\//, "https://");

      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ url: formattedUrl, formats: ["screenshot"], waitFor: 3000 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return errorResponse(data.error || `Status ${res.status}`);
      }

      const screenshot = data.data?.screenshot || data.screenshot;
      if (!screenshot) return errorResponse("No screenshot in response");

      return jsonResponse({ screenshot });
    } catch (err: any) {
      context.error("Screenshot error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("validate-selectors", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "validate-selectors",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { url, selectors } = body;
      if (!url || !selectors || !Array.isArray(selectors)) {
        return errorResponse("URL and selectors array are required", 400);
      }

      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) return errorResponse("Firecrawl not configured", 500);

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ url: formattedUrl, formats: ["rawHtml"], waitFor: 3000 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return errorResponse(data.error || `Failed to fetch page (${res.status})`);
      }

      const html = data.data?.rawHtml || data.rawHtml || "";
      if (!html) return errorResponse("No HTML content returned");

      const results: Record<string, { found: boolean; context?: string }> = {};
      for (const selector of selectors) {
        if (!selector || selector.trim() === "") {
          results[selector] = { found: true, context: "No selector (centered modal)" };
          continue;
        }
        try {
          let found = false;
          const sel = selector.trim();
          if (sel.startsWith("#") && !/[\s>+~]/.test(sel)) {
            const id = sel.slice(1).replace(/:[^\s(.#[]+(\([^)]*\))?/g, "").replace(/\\/g, "");
            found = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
          } else if (sel.startsWith(".") && !sel.includes(" ") && !sel.includes(">")) {
            const cls = sel.slice(1).replace(/\\/g, "").split(".")[0];
            found = html.includes(cls);
          } else if (/^[a-z]+$/i.test(sel)) {
            found = html.toLowerCase().includes(`<${sel.toLowerCase()}`);
          } else if (sel.includes("[") && sel.includes("]")) {
            const attrMatch = sel.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
            if (attrMatch) {
              const [, attr, value] = attrMatch;
              found = value ? (html.includes(`${attr}="${value}"`) || html.includes(`${attr}='${value}'`)) : html.includes(attr);
            }
          } else {
            const parts = sel.split(/[\s>+~]+/).filter(Boolean);
            let allFound = true;
            for (const part of parts) {
              const cleanPart = part.replace(/:[^\s.#[(]+(\([^)]*\))?/g, "").replace(/\\/g, "");
              if (cleanPart.startsWith("#")) {
                if (!html.includes(cleanPart.slice(1))) { allFound = false; break; }
              } else if (cleanPart.startsWith(".")) {
                if (!html.includes(cleanPart.slice(1).split(".")[0])) { allFound = false; break; }
              } else if (/^[a-z]+/i.test(cleanPart)) {
                const tag = cleanPart.match(/^[a-z]+/i)?.[0] || "";
                if (!html.toLowerCase().includes(`<${tag.toLowerCase()}`)) { allFound = false; break; }
              }
            }
            found = allFound;
          }
          results[selector] = { found };
        } catch {
          results[selector] = { found: false, context: "Invalid selector syntax" };
        }
      }

      return jsonResponse({ results });
    } catch (err: any) {
      context.error("Validate selectors error:", err);
      return errorResponse(err.message);
    }
  },
});
