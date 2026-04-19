// POST /api/redact-screenshot
// Body: { recording_id, step_number, image (data URL or base64 PNG) }
//
// Uses OpenAI vision (gpt-4o-mini) to detect PII bounding boxes, then uploads the ORIGINAL
// image plus a metadata sidecar listing the regions. Pixel-level blur in Node would require
// `sharp` (native binary); to keep deployment simple we return the regions to the client
// which already has the canvas-based AnnotationEditor that can apply them. The original
// screenshot is still uploaded so the existing flow keeps working.
const { app } = require("@azure/functions");
const { json, preflight, handleError } = require("../shared/http");
const { uploadBuffer } = require("../shared/storage");
const { getOpenAI, VISION_MODEL } = require("../shared/openai");

const PII_PROMPT = `You are a privacy-redaction system. Examine the screenshot and identify ALL regions containing personally identifiable or sensitive information that must be blurred.

Detect:
- Email addresses
- Person full names (first + last together)
- Credit/debit card numbers
- API keys, tokens, secrets, passwords
- Phone numbers
- Physical/mailing addresses
- National IDs, SSN, passport numbers
- Bank account numbers / IBAN

For each region return a tight bounding box in NORMALIZED coordinates (0.0–1.0) where (0,0) is top-left of the image. Boxes must fully cover the sensitive text with small padding. Return an empty array if nothing sensitive is visible. Be conservative — only flag clearly sensitive content, NOT generic UI labels, headings, or button text.`;

async function detectPiiBoxes(dataUrl) {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PII_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "report_pii_regions",
          description: "Return PII bounding boxes found in the image.",
          parameters: {
            type: "object",
            properties: {
              regions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    type: { type: "string" },
                  },
                  required: ["x", "y", "width", "height", "type"],
                  additionalProperties: false,
                },
              },
            },
            required: ["regions"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "report_pii_regions" } },
  });

  const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [];
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return Array.isArray(args.regions) ? args.regions : [];
  } catch {
    return [];
  }
}

app.http("redact-screenshot", {
  route: "redact-screenshot",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const { recording_id, step_number, image } = await req.json();
      if (!image || !recording_id || step_number == null) {
        return json(400, { error: "Missing image, recording_id, or step_number" });
      }

      let dataUrl = image;
      let b64 = image;
      let contentType = "image/png";
      if (b64.startsWith("data:")) {
        const m = b64.match(/^data:(.*?);base64,(.*)$/);
        if (m) { contentType = m[1]; b64 = m[2]; }
      } else {
        dataUrl = `data:image/png;base64,${b64}`;
      }

      let regions = [];
      try {
        regions = await detectPiiBoxes(dataUrl);
      } catch (e) {
        ctx.warn("PII detection failed:", e.message);
      }

      // Upload the original (frontend can apply blur via the AnnotationEditor if needed).
      const path = `${recording_id}/step-${step_number}.png`;
      const url = await uploadBuffer({
        container: "recording-screenshots",
        path,
        buffer: Buffer.from(b64, "base64"),
        contentType,
      });

      return json(200, {
        screenshot_url: `${url}?v=${Date.now()}`,
        redacted: false,
        regions,
      });
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
