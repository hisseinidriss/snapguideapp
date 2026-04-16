import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, steps, targetLanguage } = await req.json();

    const langName =
      targetLanguage === "ar" ? "Arabic"
      : targetLanguage === "fr" ? "French"
      : "English";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stepsForModel = (steps || []).map(
      (s: { instruction: string; notes?: string | null }, i: number) => ({
        index: i,
        instruction: s.instruction,
        notes: s.notes ?? null,
      })
    );

    const systemPrompt = `You are a professional translator specialised in technical Standard Operating Procedure (SOP) documentation. Translate the provided SOP content into ${langName}. Preserve meaning, technical terms, UI element names, button labels, and proper nouns. Keep the tone clear, concise, and instructional. Do not add or remove steps. Return your output strictly via the provided tool.`;

    const userPayload = JSON.stringify({
      title: title || "",
      description: description || "",
      steps: stepsForModel,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate to ${langName}:\n${userPayload}` },
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
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Translation service error", detail: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    let translated: { title: string; description: string; steps: Array<{ instruction: string; notes: string | null }> } | null = null;

    if (toolCall?.function?.arguments) {
      try {
        translated = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments", e, toolCall.function.arguments);
      }
    }

    // Fallback: try plain content as JSON
    if (!translated) {
      const content = (result.choices?.[0]?.message?.content || "")
        .replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      if (content) {
        try { translated = JSON.parse(content); } catch (_) { /* ignore */ }
      }
    }

    if (!translated) {
      return new Response(JSON.stringify({ error: "Empty translation response from model" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(translated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("translate-steps error", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
