import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("checklists-list", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "checklists",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const appId = req.query.get("app_id");
      if (!appId) return errorResponse("app_id required", 400);
      const result = await query(
        "SELECT * FROM checklists WHERE app_id = $1 ORDER BY created_at DESC",
        [appId]
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Checklists error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("checklists-get-update-delete", {
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "checklists/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "GET") {
        const result = await query("SELECT * FROM checklists WHERE id = $1", [id]);
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["name", "description", "is_active"];
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        for (const [key, value] of Object.entries(body)) {
          if (allowedFields.includes(key)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
          }
        }
        if (fields.length === 0) return errorResponse("No valid fields", 400);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await query(
          `UPDATE checklists SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM checklists WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Checklist detail error:", err);
      return errorResponse(err.message);
    }
  },
});

// Checklist items under checklist
app.http("checklist-items-list", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "checklists/{checklistId}/items",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const checklistId = req.params.checklistId;
      const result = await query(
        "SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY sort_order ASC",
        [checklistId]
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Checklist items error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("checklist-items-create", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "checklist-items",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { checklist_id, tour_id, sort_order } = body;
      const result = await query(
        "INSERT INTO checklist_items (checklist_id, tour_id, sort_order) VALUES ($1, $2, $3) RETURNING *",
        [checklist_id, tour_id, sort_order || 0]
      );
      return jsonResponse(result.rows[0], 201);
    } catch (err: any) {
      context.error("Checklist item create error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("checklist-items-update-delete", {
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "checklist-items/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["tour_id", "sort_order", "is_required"];
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        for (const [key, value] of Object.entries(body)) {
          if (allowedFields.includes(key)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
          }
        }
        if (fields.length === 0) return errorResponse("No valid fields", 400);
        values.push(id);
        const result = await query(
          `UPDATE checklist_items SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM checklist_items WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Checklist item detail error:", err);
      return errorResponse(err.message);
    }
  },
});
