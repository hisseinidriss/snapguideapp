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
    const { url, tourName } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Scrape the page with Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: scrapeData.error || "Failed to scrape page" }),
        { status: scrapeRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const html = scrapeData.data?.html || scrapeData.html || "";
    const pageTitle = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || "";

    if (!markdown) {
      return new Response(
        JSON.stringify({ error: "Could not extract content from the page" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Use AI to generate tour steps
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract interactive elements from HTML for better selector hints
    // Strip large chunks but keep structure with IDs, classes, roles, aria labels
    const extractUIHints = (rawHtml: string): string => {
      // Match elements with id, class, role, aria-label, type, placeholder, data-* attributes
      const interactivePattern = /<(button|a|input|select|textarea|nav|form|header|footer|main|aside|dialog|details|summary|[a-z]+-[a-z]+)[^>]*(id=|class=|role=|aria-label=|data-|placeholder=|type=)[^>]*>/gi;
      const matches = rawHtml.match(interactivePattern) || [];
      return matches.slice(0, 150).join("\n");
    };

    const uiHints = extractUIHints(html);
    const truncatedMarkdown = markdown.slice(0, 6000);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a UX onboarding expert. Your job is to create a product tour that teaches a NEW USER how to use an application step by step.

Analyze the page's actual UI structure (buttons, navigation, forms, inputs, CTAs) and create a guided walkthrough that:
1. Welcomes the user and explains what the app does (first step, centered, no selector)
2. Points to REAL interactive UI elements (navigation menus, key buttons, search bars, forms, settings) using precise CSS selectors
3. Explains what each element does and WHY the user would use it
4. Follows a logical workflow order (e.g., navigate → find content → take action → review results)
5. Ends with a completion/next-steps message (last step, centered, no selector)

SELECTOR RULES:
- Use selectors from the actual HTML: IDs (#sidebar), classes (.nav-menu), aria-labels ([aria-label="Search"]), data attributes ([data-testid="submit"]), or tag+class combos (nav.main-nav)
- Prefer IDs and aria-labels (most stable), then unique classes, then tag+class combos
- NEVER invent selectors — only use what exists in the HTML structure provided
- For elements without good selectors, use tag-based selectors (header, nav, main, footer)

CONTENT RULES:
- Write in second person ("You can...", "Click here to...", "This is where you...")
- Be specific about what the element does, not just what it is
- Keep titles to 2-5 words, content to 1-2 actionable sentences

Return 5-8 steps.`,
          },
          {
            role: "user",
            content: `Page title: ${pageTitle}
Tour name: ${tourName || "Getting Started"}

HTML UI elements found on the page:
${uiHints}

Page content summary:
${truncatedMarkdown}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_steps",
              description: "Generate tour steps from page content",
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

    console.log(`Generated ${steps.length} tour steps`);

    return new Response(JSON.stringify({ steps, pageTitle }), {
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
