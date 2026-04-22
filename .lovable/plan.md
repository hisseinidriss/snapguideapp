

## Fix: deployed app calls SWA instead of the new Linux Function App

### Root cause
`src/api/http.ts` uses `import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE`. The `.env` / SWA build sets `VITE_API_BASE_URL=""` (empty string), and `??` only falls back on `null`/`undefined` — so the empty string wins and every request goes to the SWA origin (`calm-field-…azurestaticapps.net/api/apps`). SWA has no linked Function App, so the SPA fallback returns `index.html`, producing the `Unexpected token '<'` JSON error.

### Changes

1. **`src/api/http.ts`** — make the fallback robust:
   ```ts
   const ENV_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
   const RAW_BASE = ENV_BASE.length > 0 ? ENV_BASE : DEFAULT_API_BASE;
   ```
   So an empty/whitespace value falls back to the new Linux Function App (`https://snapeguide1-hjakarahbzhcc2dk.uaenorth-01.azurewebsites.net`).

2. **`.env.example`** — update guidance to point at the new Linux app and clarify that empty = use built-in default.

3. **CORS reminder** (no code change, action item): in the Azure portal for the new Function App `snapeguide1`, add the SWA origin (`https://calm-field-0ce2a1c00.7.azurestaticapps.net` and `https://snapguideapp.lovable.app`) under **CORS → Allowed Origins**, or set `CORS_ALLOWED_ORIGIN` env var to `*` (used by `shared/http.js`).

### Deploy
- Push the change → SWA rebuilds → new bundle calls the Linux Function App directly → data loads.

### Verification
- Open the deployed app, check Network tab: `/api/apps` request URL should be `https://snapeguide1-…azurewebsites.net/api/apps` and return `200` with JSON.
- "No apps yet" empty state replaces the red error toast.

