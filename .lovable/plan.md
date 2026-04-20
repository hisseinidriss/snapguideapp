
## Fix workflow secret name

**Problem:** workflow references `AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_MEADOW_0A198DD1E` but your repo secret is named `AZURE_STATIC_WEB_APPS_API_TOKEN` (per your screenshot). The deploy fails because the token resolves to empty.

**Fix:** update both `azure_static_web_apps_api_token` references in `.github/workflows/azure-static-web-apps-delightful-meadow-0a198dd1e.yml` (lines 38 and 55) to use `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`.

**Also recommended (optional cleanup):**
- In GitHub → Settings → Secrets, delete the orphaned `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_FIELD_0CE2A1C00` secret since the calm-field SWA and its workflow are gone.
- Confirm the value stored in `AZURE_STATIC_WEB_APPS_API_TOKEN` is the deployment token from the **delightful-meadow** SWA resource in Azure (Portal → Static Web App → Overview → Manage deployment token). If it's from a different SWA, the deploy will succeed but push to the wrong site.

**No other changes needed** — the rest of the workflow (build, dist upload, skip_app_build) is correct.
