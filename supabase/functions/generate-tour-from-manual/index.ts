import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName, mimeType, textContent } = await req.json();

    if (!fileBase64 && !textContent) {
      return new Response(JSON.stringify({ error: "File content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing manual: ${fileName} (${mimeType})`);

    const resolvedMime = mimeType === "application/pdf" ? "application/pdf" : mimeType;

    const userContent: any[] = [
      {
        type: "text",
        text: `I have uploaded a document: "${fileName}".

This document contains business process walkthrough definitions in a STRUCTURED TABLE format. Each row in the table represents one step of a business process.

The table columns are (in order):
1. Business Process - the name of the process this step belongs to
2. Step # - the step number within that process
3. Title - the step title
4. New Step - the step type: "Modal" means a centered overlay, "Tooltip" means attached to an element
5. Content - the step description/instruction text
6. CSS Selector - the CSS selector for targeting the element (may be empty for Modal steps)
7. Pick Element - a human-readable label for the target element (ignore this)
8. Target URL (optional) - URL to navigate to before showing this step
9. Click Selector (optional) - element to click before showing the step
10. Placement - tooltip placement (Top, Bottom, Left, Right)

CRITICAL INSTRUCTIONS:
- Extract the EXACT data from the table rows. Do NOT paraphrase, rewrite, or invent new content.
- Group rows by the "Business Process" column to form distinct processes.
- Preserve the exact step order using the "Step #" column.
- Copy the Title, Content, CSS Selector, Target URL, and Click Selector values EXACTLY as they appear.
- For step_type: "Modal" → "center" placement with empty selector. "Tooltip" → use the specified Placement value.
- If a CSS selector is empty, set it to empty string "".
- If Target URL or Click Selector is empty, set them to empty string "".
- Handle escaped characters: \\: should become :, \\[ should become [, \\] should become ], \\* should become *.
- Remove duplicate rows if the same step appears multiple times across pages.`,
      },
    ];

    if (textContent) {
      // Pre-extracted text from client-side parsing (e.g., DOCX via mammoth)
      userContent[0].text += `\n\nDocument content:\n${textContent.slice(0, 50000)}`;
    } else if (resolvedMime === "application/pdf") {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${resolvedMime};base64,${fileBase64}`,
        },
      });
    } else {
      const decodedText = atob(fileBase64);
      userContent[0].text += `\n\nDocument content:\n${decodedText.slice(0, 50000)}`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a precise data extraction tool. Your ONLY job is to read structured table data from documents and return it exactly as written.

You will receive a document containing a table of business process steps. Each row has columns: Business Process, Step #, Title, New Step type, Content, CSS Selector, Pick Element, Target URL, Click Selector, Placement.

RULES:
1. Extract data VERBATIM from the table. Do not rephrase, summarize, or generate new content.
2. Group steps by the "Business Process" column name.
3. Order steps by "Step #" within each process.
4. Map "Modal" step type → placement "center", selector "" (empty).
5. Map "Tooltip" step type → use the Placement column value (lowercase: "top", "bottom", "left", "right").
6. Unescape selectors: remove backslashes before special characters (\\: → :, \\[ → [, \\] → ], \\* → *).
7. Remove duplicate steps (same process + step number appearing on multiple pages).
8. Copy CSS Selector, Target URL, and Click Selector exactly (after unescaping). Use "" for empty values.
9. Do NOT add extra steps, modify titles, rewrite content, or invent CSS selectors.

If the document does not contain a structured table, then analyze the content and create reasonable process steps, but ALWAYS prefer exact extraction over interpretation.`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_processes",
              description: "Extract business processes and their steps from a structured document table",
              parameters: {
                type: "object",
                properties: {
                  processes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Exact business process name from the table" },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string", description: "Exact step title from the table" },
                              content: { type: "string", description: "Exact step content/description from the table" },
                              selector: { type: "string", description: "CSS selector from the table (unescaped). Empty string if none." },
                              target_url: { type: "string", description: "Target URL from the table. Empty string if none." },
                              click_selector: { type: "string", description: "Click selector from the table. Empty string if none." },
                              placement: {
                                type: "string",
                                enum: ["top", "bottom", "left", "right", "center"],
                                description: "For Modal steps: 'center'. For Tooltip steps: lowercase value from Placement column.",
                              },
                            },
                            required: ["title", "content", "selector", "placement", "target_url", "click_selector"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "steps"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["processes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_processes" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const processes = parsed.processes || [];

    console.log(`Extracted ${processes.length} business processes from manual`);
    for (const p of processes) {
      console.log(`  - "${p.name}": ${p.steps.length} steps`);
    }

    return new Response(JSON.stringify({ processes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
