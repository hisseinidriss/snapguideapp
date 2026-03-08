const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function tryScreenshot(url: string, apiKey: string): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  console.log("Attempting screenshot for:", url);
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["screenshot"],
      waitFor: 3000,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return { success: false, error: data.error || `Status ${res.status}` };
  }

  const screenshot = data.data?.screenshot || data.screenshot;
  if (!screenshot) {
    return { success: false, error: "No screenshot in response" };
  }

  return { success: true, screenshot };
}

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
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    // Ensure https
    formattedUrl = formattedUrl.replace(/^http:\/\//, "https://");

    // Try original URL first
    let result = await tryScreenshot(formattedUrl, firecrawlKey);

    // If DNS fails and no www, try with www
    if (!result.success && result.error?.includes("DNS")) {
      const urlObj = new URL(formattedUrl);
      if (!urlObj.hostname.startsWith("www.")) {
        urlObj.hostname = "www." + urlObj.hostname;
        console.log("Retrying with www:", urlObj.toString());
        result = await tryScreenshot(urlObj.toString(), firecrawlKey);
      }
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ screenshot: result.screenshot }), {
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
