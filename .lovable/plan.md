

## Problem Diagnosis

The feedback dialog appears and submits, but data doesn't show in the analytics dashboard. The root cause is an **Azure Functions route conflict**: two separate function registrations (`submit-feedback` and `get-feedback`) both use `route: "feedback"`. Azure Functions v4 does not support multiple function registrations on the same route — the second overwrites the first, meaning the POST (submit) likely never executes, or the GET (list) is broken.

Additionally, the extension's feedback POST may be silently failing due to CORS (same issue as analytics tracking).

## Plan

### 1. Merge feedback functions into a single handler
Combine `submit-feedback` and `get-feedback` into one function registration that accepts `GET`, `POST`, and `OPTIONS` methods, then routes internally based on `req.method`.

**File**: `azure-functions/src/functions/feedback.ts`

```typescript
app.http("feedback", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "feedback",
  handler: async (req, context) => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };
    if (req.method === "POST") { /* submit logic */ }
    if (req.method === "GET") { /* list logic */ }
  },
});
```

### 2. Re-deploy to Azure
After the code change, rebuild and publish the Azure Functions:
```bash
cd azure-functions && npm run build && func azure functionapp publish walkthru-api
```

### 3. Verify CORS
Ensure `https://careers.isdb.org` is in the Azure Function App CORS allowed origins so the extension's POST requests are not blocked.

---

**This is a backend-only fix.** No frontend or extension changes needed — just re-deploy the function app.

