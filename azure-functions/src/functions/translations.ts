import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

// GET /api/translations?step_id=xxx  or  GET /api/translations?tour_id=xxx
// POST /api/translations  { step_id, language, title, content }
app.http("translations-list-create", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "translations",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      if (req.method === "GET") {
        const stepId = req.query.get("step_id");
        const tourId = req.query.get("tour_id");

        if (stepId) {
          const result = await query(
            "SELECT * FROM tour_step_translations WHERE step_id = $1 ORDER BY language ASC",
            [stepId]
          );
          return jsonResponse(result.rows);
        }

        if (tourId) {
          const result = await query(
            `SELECT t.* FROM tour_step_translations t
             JOIN tour_steps s ON s.id = t.step_id
             WHERE s.tour_id = $1
             ORDER BY s.sort_order ASC, t.language ASC`,
            [tourId]
          );
          return jsonResponse(result.rows);
        }

        return errorResponse("step_id or tour_id required", 400);
      }

      if (req.method === "POST") {
        const body = await req.json() as any;
        const { step_id, language, title, content } = body;
        if (!step_id || !language) return errorResponse("step_id and language required", 400);

        const result = await query(
          `INSERT INTO tour_step_translations (step_id, language, title, content)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (step_id, language) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             updated_at = NOW()
           RETURNING *`,
          [step_id, language, title || "", content || ""]
        );
        return jsonResponse(result.rows[0], 201);
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Translations error:", err);
      return errorResponse(err.message);
    }
  },
});

// Bulk upsert: POST /api/translations/bulk  { translations: [{ step_id, language, title, content }] }
app.http("translations-bulk", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "translations/bulk",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { translations } = body;
      if (!Array.isArray(translations) || translations.length === 0) {
        return jsonResponse([]);
      }

      const results = [];
      for (const t of translations) {
        if (!t.step_id || !t.language) continue;
        const result = await query(
          `INSERT INTO tour_step_translations (step_id, language, title, content)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (step_id, language) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             updated_at = NOW()
           RETURNING *`,
          [t.step_id, t.language, t.title || "", t.content || ""]
        );
        if (result.rows[0]) results.push(result.rows[0]);
      }

      return jsonResponse(results);
    } catch (err: any) {
      context.error("Translations bulk error:", err);
      return errorResponse(err.message);
    }
  },
});

// DELETE /api/translations/{id}
app.http("translations-delete", {
  methods: ["DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "translations/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      await query("DELETE FROM tour_step_translations WHERE id = $1", [id]);
      return { status: 204, headers: corsHeaders() };
    } catch (err: any) {
      context.error("Translation delete error:", err);
      return errorResponse(err.message);
    }
  },
});
