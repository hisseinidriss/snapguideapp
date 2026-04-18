// Auto-redact PII in screenshots using Lovable AI (Gemini vision) + ImageScript blur.
// Accepts: { image: dataURL or base64 png, recording_id, step_number }
// Returns: { screenshot_url, redacted: boolean, regions: number }
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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

async function detectPiiBoxes(imageBase64: string, mimeType: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PII_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
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
                      x: { type: "number", description: "Left, normalized 0-1" },
                      y: { type: "number", description: "Top, normalized 0-1" },
                      width: { type: "number", description: "Width, normalized 0-1" },
                      height: { type: "number", description: "Height, normalized 0-1" },
                      type: { type: "string", description: "Category, e.g. email, name, phone, api_key" },
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
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("AI gateway error:", res.status, txt);
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI error ${res.status}`);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return Array.isArray(args.regions) ? args.regions : [];
  } catch (e) {
    console.error("Failed to parse tool args", e);
    return [];
  }
}

function blurRegion(img: Image, x: number, y: number, w: number, h: number) {
  // Clamp + extract region
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.min(img.width - ix, Math.ceil(w));
  const ih = Math.min(img.height - iy, Math.ceil(h));
  if (iw <= 0 || ih <= 0) return;

  // Pixelate: downscale a copy of the region then upscale back, then composite.
  try {
    const region = img.clone().crop(ix, iy, iw, ih);
    const blockW = Math.max(1, Math.floor(iw / 12));
    const blockH = Math.max(1, Math.floor(ih / 12));
    region.resize(blockW, blockH).resize(iw, ih);
    img.composite(region, ix, iy);

    // Then add a solid-ish darkened overlay on top for stronger redaction
    for (let py = iy; py < iy + ih; py++) {
      for (let px = ix; px < ix + iw; px++) {
        const c = img.getPixelAt(px + 1, py + 1);
        // mix with dark gray
        const r = ((c >>> 24) & 0xff) * 0.4 + 60;
        const g = ((c >>> 16) & 0xff) * 0.4 + 60;
        const b = ((c >>> 8) & 0xff) * 0.4 + 60;
        const a = c & 0xff;
        img.setPixelAt(px + 1, py + 1, ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | a);
      }
    }
  } catch (e) {
    console.error("blur region failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { image, recording_id, step_number } = body || {};
    if (!image || !recording_id || step_number == null) {
      return new Response(JSON.stringify({ error: "Missing image, recording_id, or step_number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse data URL or raw base64
    let mimeType = "image/png";
    let base64 = image as string;
    if (base64.startsWith("data:")) {
      const m = base64.match(/^data:(.*?);base64,(.*)$/);
      if (m) { mimeType = m[1]; base64 = m[2]; }
    }

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // Detect PII regions via vision model
    let regions: Array<{ x: number; y: number; width: number; height: number; type: string }> = [];
    try {
      regions = await detectPiiBoxes(base64, mimeType);
    } catch (e) {
      console.warn("PII detection failed, uploading original:", (e as Error).message);
    }

    // Decode + blur
    let outBytes = bytes;
    let appliedRegions = 0;
    if (regions.length > 0) {
      try {
        const img = await Image.decode(bytes);
        const W = img.width, H = img.height;
        for (const r of regions) {
          const x = r.x * W;
          const y = r.y * H;
          const w = r.width * W;
          const h = r.height * H;
          if (w < 2 || h < 2) continue;
          blurRegion(img, x, y, w, h);
          appliedRegions++;
        }
        outBytes = await img.encode();
      } catch (e) {
        console.error("Image processing failed, uploading original:", e);
      }
    }

    // Upload to storage
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const path = `${recording_id}/step-${step_number}.png`;
    const { error: upErr } = await supabase.storage
      .from("recording-screenshots")
      .upload(path, outBytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from("recording-screenshots")
      .getPublicUrl(path);

    return new Response(JSON.stringify({
      screenshot_url: urlData.publicUrl,
      redacted: appliedRegions > 0,
      regions: appliedRegions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("redact-screenshot error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
