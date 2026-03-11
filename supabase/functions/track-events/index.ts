const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { events } = await req.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "events array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate and sanitize events
    const validEvents = events
      .filter(
        (e: any) =>
          e.tour_id && e.app_id && e.event_type && e.session_id &&
          ["tour_started", "step_viewed", "tour_completed", "tour_abandoned", "video_started", "video_completed", "video_skipped"].includes(e.event_type)
      )
      .map((e: any) => ({
        tour_id: e.tour_id,
        app_id: e.app_id,
        event_type: e.event_type,
        step_index: typeof e.step_index === "number" ? e.step_index : null,
        session_id: e.session_id,
      }));

    if (validEvents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("tour_events").insert(validEvents);
    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: validEvents.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
