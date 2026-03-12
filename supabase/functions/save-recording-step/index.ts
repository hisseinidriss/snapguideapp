const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { recording_id, steps, screenshot_data, step_id } = body;

    // If screenshot_data is provided, upload it and return URL
    if (screenshot_data && step_id) {
      const base64Data = screenshot_data.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const path = `${recording_id}/${step_id}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("recording-screenshots")
        .upload(path, bytes, { contentType: "image/png", upsert: true });

      if (uploadErr) {
        return new Response(JSON.stringify({ error: uploadErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = supabase.storage
        .from("recording-screenshots")
        .getPublicUrl(path);

      // Update step with screenshot URL
      await supabase
        .from("process_recording_steps")
        .update({ screenshot_url: urlData.publicUrl })
        .eq("id", step_id);

      return new Response(JSON.stringify({ screenshot_url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch insert steps
    if (recording_id && steps?.length) {
      const inserts = steps.map((s: any, i: number) => ({
        recording_id,
        sort_order: i,
        action_type: s.action_type || "click",
        instruction: s.instruction || "",
        selector: s.selector || "",
        target_url: s.target_url || "",
        element_text: s.element_text || "",
        element_tag: s.element_tag || "",
        input_value: s.input_value || "",
      }));

      const { data, error } = await supabase
        .from("process_recording_steps")
        .insert(inserts)
        .select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ steps: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
