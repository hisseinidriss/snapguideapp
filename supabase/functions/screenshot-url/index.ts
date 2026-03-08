const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping screenshot for:", formattedUrl);

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["screenshot"],
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    console.log("Firecrawl response status:", scrapeRes.status);
    console.log("Firecrawl response success:", scrapeData.success);

    if (!scrapeRes.ok || !scrapeData.success) {
      console.error("Firecrawl error:", JSON.stringify(scrapeData));
      return new Response(JSON.stringify({ error: scrapeData.error || "Failed to capture screenshot" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Screenshot can be in data.screenshot or directly in screenshot
    const screenshotUrl = scrapeData.data?.screenshot || scrapeData.screenshot;
    console.log("Screenshot URL found:", !!screenshotUrl);

    if (!screenshotUrl) {
      console.error("No screenshot in response:", JSON.stringify(Object.keys(scrapeData.data || scrapeData)));
      return new Response(JSON.stringify({ error: "No screenshot returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ screenshot: screenshotUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Screenshot error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
