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
    const { fileBase64, fileName, mimeType } = await req.json();

    if (!fileBase64) {
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
        text: `I have uploaded a user manual / documentation file: "${fileName}".

Analyze the document and extract ALL distinct business processes described in it. A business process is a series of steps a user performs to accomplish a task — such as adding data, updating records, deleting entries, running reports, approvals, validations, etc.

For EACH business process found, provide:
- A clear process name (e.g. "Add New Member", "Update Payment Details", "Delete Record", "Run Monthly Report")
- 5-15 ordered steps that walk a user through the process, including any checks, validations, approvals, or conditions mentioned in the manual`,
      },
    ];

    if (resolvedMime === "application/pdf") {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${resolvedMime};base64,${fileBase64}`,
        },
      });
    } else {
      const textContent = atob(fileBase64);
      userContent[0].text += `\n\nDocument content:\n${textContent.slice(0, 15000)}`;
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
            content: `You are a business process analyst. Your job is to extract business processes from user manuals and documentation.

Analyze the document and identify ALL distinct business processes. Each process should represent a complete workflow (e.g. creating a record, updating data, running a report, approval flow, deletion with checks).

For each process, create ordered steps that include:
1. A welcome/overview step explaining what this process does (placement: center)
2. Detailed steps covering each action, input, validation, check, or approval required
3. Any conditions or branches (e.g. "If the record exists...", "Verify the data before...")
4. A completion step summarizing what was accomplished (placement: center)

CONTENT RULES:
- Write in second person ("You need to...", "Click on...", "Verify that...")
- Be specific about fields, buttons, menus mentioned in the manual
- Include validation checks and conditions as separate steps
- Keep titles to 2-6 words
- Keep content to 1-3 actionable sentences
- Leave selector empty (user will assign CSS selectors later)

Extract as many processes as are described in the document (typically 3-15).`,
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
              description: "Extract business processes and their steps from a document",
              parameters: {
                type: "object",
                properties: {
                  processes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Business process name" },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              content: { type: "string" },
                              selector: { type: "string" },
                              placement: {
                                type: "string",
                                enum: ["top", "bottom", "left", "right", "center"],
                              },
                            },
                            required: ["title", "content", "selector", "placement"],
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
