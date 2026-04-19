// POST /api/translate-steps
// Body: { title, description, steps: [{instruction, notes}], targetLanguage: 'ar'|'fr'|'en' }
// Calls OpenAI with a function-tool schema and returns the translated SOP.
const { app } = require("@azure/functions");
const { json, preflight, handleError } = require("../shared/http");
const { getOpenAI, TEXT_MODEL } = require("../shared/openai");

const langMap = { ar: "Arabic", fr: "French", en: "English" };

app.http("translate-steps", {
  route: "translate-steps",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const { title, description, steps, targetLanguage } = await req.json();
      const langName = langMap[targetLanguage] || "English";

      const openai = getOpenAI();
      const stepsForModel = (steps || []).map((s, i) => ({
        index: i,
        instruction: s.instruction,
        notes: s.notes ?? null,
      }));

      const completion = await openai.chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a professional translator specialised in technical Standard Operating Procedure (SOP) documentation. Translate the provided SOP content into ${langName}. Preserve meaning, technical terms, UI element names, button labels, and proper nouns. Keep the tone clear, concise, and instructional. Do not add or remove steps. Return your output strictly via the provided tool.`,
          },
          {
            role: "user",
            content: `Translate to ${langName}:\n${JSON.stringify({
              title: title || "",
              description: description || "",
              steps: stepsForModel,
            })}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translation",
              description: `Return the SOP fully translated into ${langName}.`,
              parameters: {
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
                      required: ["instruction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_translation" } },
      });

      const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        return json(502, { error: "Empty translation response from model" });
      }
      const translated = JSON.parse(toolCall.function.arguments);
      return json(200, translated);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
