// Standard CORS + JSON helpers used by every HTTP function.
const ORIGIN = process.env.CORS_ALLOWED_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

function json(status, body) {
  return {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    jsonBody: body,
  };
}

function preflight() {
  return { status: 204, headers: corsHeaders };
}

function handleError(ctx, err) {
  ctx.error("Function error", err);
  return json(500, { error: err?.message || "Internal error" });
}

module.exports = { corsHeaders, json, preflight, handleError };
