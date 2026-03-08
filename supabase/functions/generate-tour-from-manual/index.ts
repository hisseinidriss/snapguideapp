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
    const { fileBase64, fileName, mimeType, tourName } = await req.json();

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

    // Determine the media type for the AI model
    const supportedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const resolvedMime = supportedTypes.includes(mimeType) ? mimeType : "application/pdf";

    // Build messages with inline document for Gemini
    const userContent: any[] = [
      {
        type: "text",
        text: `Tour name: ${tourName || "Getting Started"}

I have uploaded a user manual / documentation file: "${fileName}".
Please analyze it thoroughly and create a product tour with 5-10 steps that guides a new user through the application's key features and workflows described in the manual.

Focus on:
- The most important features and how to access them
- Key workflows the user needs to learn
- Navigation and UI elements mentioned in the manual
- Settings or configuration steps if relevant`,
      },
    ];

    // For PDFs and supported binary docs, include as inline_data
    if (resolvedMime === "application/pdf") {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${resolvedMime};base64,${fileBase64}`,
        },
      });
    } else {
      // For text-based files, decode and include as text
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
            content: `You are a UX onboarding expert. Your job is to create a product tour from a user manual or documentation file.

Analyze the document and create a guided walkthrough that:
1. Welcomes the user and explains what the application does (first step, no selector, placement: center)
2. Walks through the key features described in the manual in logical order
3. Explains what each feature does and WHY the user would use it
4. Follows a logical workflow order
5. Ends with a summary / next-steps message (last step, no selector, placement: center)

SELECTOR RULES:
- Since this is generated from a manual (not live HTML), leave selector empty for all steps
- The user can manually assign CSS selectors later in the editor

CONTENT RULES:
- Write in second person ("You can...", "Click here to...", "This is where you...")
- Be specific about what each feature does
- Keep titles to 2-5 words
- Keep content to 1-3 actionable sentences
- Reference specific UI elements, buttons, or menu items mentioned in the manual

Return 5-10 steps.`,
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
              name: "generate_steps",
              description: "Generate tour steps from a user manual",
              parameters: {
                type: "object",
                properties: {
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
                required: ["steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_steps" } },
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
      return new Response(JSON.stringify({ error: "AI did not return structured steps" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const steps = parsed.steps || [];

    console.log(`Generated ${steps.length} tour steps from manual`);

    return new Response(JSON.stringify({ steps }), {
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
