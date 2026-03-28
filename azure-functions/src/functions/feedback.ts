// Feedback API endpoints - collects and retrieves user tour ratings (3-12-2026)
// Users rate tours with thumbs up/down after completing a walkthrough
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("feedback", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "feedback",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    // Submit new feedback from the extension's feedback dialog - Hissein
    if (req.method === "POST") {
      try {
        const body = await req.json() as any;
        const { tour_id, app_id, session_id, rating, comment } = body;

        // Validate required fields for feedback submission
        if (!tour_id || !app_id || !session_id || !rating) {
          return errorResponse("tour_id, app_id, session_id, and rating are required", 400);
        }
        // Only accept binary rating values (Hissein 3-21-2026)
        if (rating !== "up" && rating !== "down") {
          return errorResponse("rating must be 'up' or 'down'", 400);
        }

        const result = await query(
          `INSERT INTO tour_feedback (tour_id, app_id, session_id, rating, comment)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [tour_id, app_id, session_id, rating, comment || null]
        );

        return jsonResponse(result.rows[0]);
      } catch (err: any) {
        context.error("Feedback error:", err);
        return errorResponse(err.message);
      }
    }

    // Retrieve feedback entries for the admin analytics dashboard (3-19-2026)
    if (req.method === "GET") {
      try {
        const appId = req.query.get("app_id");
        if (!appId) return errorResponse("app_id required", 400);

        // Limit to 500 most recent feedback entries - Hissein
        const result = await query(
          "SELECT * FROM tour_feedback WHERE app_id = $1 ORDER BY created_at DESC LIMIT 500",
          [appId]
        );
        return jsonResponse(result.rows);
      } catch (err: any) {
        context.error("Feedback fetch error:", err);
        return errorResponse(err.message);
      }
    }

    return errorResponse("Method not allowed", 405);
  },
});