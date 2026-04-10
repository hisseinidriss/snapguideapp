import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const langName = targetLanguage === "ar" ? "Arabic" : targetLanguage === "fr" ? "French" : "English";

    const stepsText = steps
      .map((s: { instruction: string; notes?: string }, i: number) =>
        `Step ${i + 1}: ${s.instruction}${s.notes ? ` | Notes: ${s.notes}` : ""}`
      )
      .join("\n");

    const prompt = `Translate the following SOP (Standard Operating Procedure) content to ${langName}. 
Return ONLY valid JSON with this exact structure:
{
  "title": "translated title",
  "description": "translated description",
  "steps": [{"instruction": "...", "notes": "...or null"}]
}

Title: ${title}
Description: ${description || "N/A"}
Steps:
${stepsText}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a professional translator. Translate accurately to ${langName}. Return only JSON.` },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${errText}`);
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const translated = JSON.parse(content);

    return new Response(JSON.stringify(translated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
