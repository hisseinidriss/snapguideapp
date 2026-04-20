// POST /api/translate-steps
// Body: { title, description, steps: [{instruction, notes}], targetLanguage: 'ar'|'fr'|'en' }
// Uses Perplexity AI (sonar model) with JSON schema response_format for structured translation.
const { app } = require("@azure/functions");
const { json, preflight, handleError } = require("../shared/http");
const { chat } = require("../shared/perplexity");

const langMap = { ar: "Arabic", fr: "French", en: "English" };

const translationSchema = {
  type: "json_schema",
  json_schema: {
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instruction: { type: "string" },
              notes: { type: ["string", "null"] },
            },
            required: ["instruction", "notes"],
          },
        },
      },
      required: ["title", "description", "steps"],
    },
  },
};

app.http("translate-steps", {
  route: "translate-steps",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const { title, description, steps, targetLanguage } = await req.json();
      const langName = langMap[targetLanguage] || "English";

      const stepsForModel = (steps || []).map((s, i) => ({
        index: i,
        instruction: s.instruction,
        notes: s.notes ?? null,
      }));

      const systemPrompt = `You are a professional translator specialised in technical Standard Operating Procedure (SOP) documentation. Translate the provided SOP content into ${langName}. Preserve meaning, technical terms, UI element names, button labels, and proper nouns. Keep the tone clear, concise, and instructional. Do not add or remove steps. Respond ONLY with a JSON object matching the required schema — no prose, no markdown, no citations in the output.`;

      const userPayload = JSON.stringify({
        title: title || "",
        description: description || "",
        steps: stepsForModel,
      });

      const completion = await chat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate to ${langName}:\n${userPayload}` },
        ],
        response_format: translationSchema,
        temperature: 0.1,
      });

      const content = completion.choices?.[0]?.message?.content || "";
      let translated = null;

      // Primary: parse the JSON content directly
      try {
        translated = JSON.parse(content);
      } catch {
        // Fallback: strip markdown fences if model wrapped output
        const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        try {
          translated = JSON.parse(cleaned);
        } catch (e) {
          ctx.log.error("Failed to parse Perplexity translation JSON", { content });
        }
      }

      if (!translated) {
        return json(502, { error: "Empty or invalid translation response from model" });
      }

      return json(200, translated);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
