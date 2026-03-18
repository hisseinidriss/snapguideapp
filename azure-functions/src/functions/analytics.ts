import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("analytics-events", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "analytics/events",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const appId = req.query.get("app_id");
      if (!appId) return errorResponse("app_id required", 400);
      const result = await query(
        "SELECT * FROM tour_events WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1000",
        [appId]
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Analytics error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("track-events", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "track-events",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { events } = body;
      if (!events || !Array.isArray(events) || events.length === 0) {
        return errorResponse("events array is required", 400);
      }

      const validEventTypes = ["tour_started", "step_viewed", "tour_completed", "tour_abandoned", "video_started", "video_completed", "video_skipped"];
      const validEvents = events.filter(
        (e: any) => e.tour_id && e.app_id && e.event_type && e.session_id && validEventTypes.includes(e.event_type)
      );

      if (validEvents.length === 0) return errorResponse("No valid events", 400);

      // Batch insert
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const e of validEvents) {
        valuePlaceholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(e.tour_id, e.app_id, e.event_type, e.session_id, typeof e.step_index === "number" ? e.step_index : null);
      }

      await query(
        `INSERT INTO tour_events (tour_id, app_id, event_type, session_id, step_index) VALUES ${valuePlaceholders.join(", ")}`,
        values
      );

      return jsonResponse({ success: true, count: validEvents.length });
    } catch (err: any) {
      context.error("Track events error:", err);
      return errorResponse(err.message);
    }
  },
});
