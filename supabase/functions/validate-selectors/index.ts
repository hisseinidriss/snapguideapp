const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, selectors } = await req.json();

    if (!url || !selectors || !Array.isArray(selectors)) {
      return new Response(
        JSON.stringify({ error: "URL and selectors array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Fetching HTML for selector validation:", formattedUrl);

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["rawHtml"],
        waitFor: 3000,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return new Response(
        JSON.stringify({ error: data.error || `Failed to fetch page (${res.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = data.data?.rawHtml || data.rawHtml || "";
    if (!html) {
      return new Response(
        JSON.stringify({ error: "No HTML content returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check each selector against the HTML using string/regex matching
    // Since Deno doesn't have a full DOM parser, we do basic checks
    const results: Record<string, { found: boolean; context?: string }> = {};

    for (const selector of selectors) {
      if (!selector || selector.trim() === "") {
        results[selector] = { found: true, context: "No selector (centered modal)" };
        continue;
      }

      try {
        let found = false;
        const sel = selector.trim();

        // Check for simple ID selectors: #someId (no spaces or combinators)
        if (sel.startsWith("#") && !/[\s>+~]/.test(sel)) {
          const id = sel.slice(1).replace(/:[^\s(.#[]+(\([^)]*\))?/g, "").replace(/\\/g, "");
          found = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
        }
        // Check for class selectors: .someClass
        else if (sel.startsWith(".") && !sel.includes(" ") && !sel.includes(">")) {
          const cls = sel.slice(1).replace(/\\/g, "").split(".")[0];
          found = html.includes(cls);
        }
        // Check for tag selectors
        else if (/^[a-z]+$/i.test(sel)) {
          found = html.toLowerCase().includes(`<${sel.toLowerCase()}`);
        }
        // Check for attribute selectors: [role="banner"], input[type="text"]
        else if (sel.includes("[") && sel.includes("]")) {
          const attrMatch = sel.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
          if (attrMatch) {
            const [, attr, value] = attrMatch;
            if (value) {
              found = html.includes(`${attr}="${value}"`) || html.includes(`${attr}='${value}'`);
            } else {
              found = html.includes(attr);
            }
          }
        }
        // For complex selectors, check parts
        else {
          const parts = sel.split(/[\s>+~]+/).filter(Boolean);
          // If all major parts exist in the HTML, consider it likely valid
          let allFound = true;
          for (const part of parts) {
            const cleanPart = part.replace(/:[^\s.#[]+/g, "").replace(/\\/g, "");
            if (cleanPart.startsWith("#")) {
              const id = cleanPart.slice(1);
              if (!html.includes(id)) { allFound = false; break; }
            } else if (cleanPart.startsWith(".")) {
              const cls = cleanPart.slice(1).split(".")[0];
              if (!html.includes(cls)) { allFound = false; break; }
            } else if (/^[a-z]+/i.test(cleanPart)) {
              const tag = cleanPart.match(/^[a-z]+/i)?.[0] || "";
              if (!html.toLowerCase().includes(`<${tag.toLowerCase()}`)) { allFound = false; break; }
            }
          }
          found = allFound;
        }

        results[selector] = { found };
      } catch (e) {
        results[selector] = { found: false, context: "Invalid selector syntax" };
      }
    }

    console.log("Validation results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
