import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("generate-tour-steps", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "generate-tour-steps",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { url, tourName } = body;
      if (!url) return errorResponse("URL is required", 400);

      const perplexityKey = process.env.PERPLEXITY_API_KEY;
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;

      if (!openaiKey || !firecrawlKey) {
        return errorResponse("AI services not configured", 500);
      }

      // Scrape the page
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ url: formattedUrl, formats: ["markdown", "rawHtml"], waitFor: 3000 }),
      });

      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok || !scrapeData.success) {
        return errorResponse("Failed to scrape page");
      }

      const markdown = scrapeData.data?.markdown || "";
      const html = scrapeData.data?.rawHtml || "";
      const truncatedHtml = html.substring(0, 15000);

      const prompt = `Analyze this webpage and generate interactive tour steps for "${tourName || "Product Tour"}".

Page content (markdown): ${markdown.substring(0, 5000)}

Page HTML (for selectors): ${truncatedHtml}

Generate 4-8 tour steps. Each step should have:
- title: Short, action-oriented title
- content: 1-2 sentences explaining what the user should do
- selector: CSS selector for the target element (use IDs, classes, or data attributes)
- placement: "top", "bottom", "left", or "right"
- step_type: "standard"

Return ONLY a JSON array of steps.`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";
      let steps;
      try {
        const parsed = JSON.parse(content);
        steps = Array.isArray(parsed) ? parsed : parsed.steps || [];
      } catch {
        steps = [];
      }

      return jsonResponse({ steps });
    } catch (err: any) {
      context.error("Generate tour steps error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("generate-tour-from-manual", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "generate-tour-from-manual",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { textContent, fileBase64, fileName, mimeType } = body;

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) return errorResponse("AI services not configured", 500);

      const content = textContent || (fileBase64 ? Buffer.from(fileBase64, "base64").toString("utf-8") : "");
      if (!content) return errorResponse("No content provided", 400);

      const prompt = `Convert this user manual/documentation into interactive tour steps.

Content: ${content.substring(0, 10000)}

Generate tour steps. Each step should have:
- title: Short, action-oriented title
- content: 1-2 sentences explaining what the user should do
- selector: CSS selector if identifiable, otherwise empty string
- placement: "bottom"
- step_type: "standard"

Return ONLY a JSON object with a "steps" array.`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      const aiData = await aiRes.json();
      const responseContent = aiData.choices?.[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(responseContent);
      } catch {
        parsed = { steps: [] };
      }

      return jsonResponse(parsed);
    } catch (err: any) {
      context.error("Generate from manual error:", err);
      return errorResponse(err.message);
    }
  },
});
