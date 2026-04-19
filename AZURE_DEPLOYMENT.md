# SnapGuide — Azure Deployment Guide

End-to-end setup for shipping SnapGuide to your own Azure subscription using GitHub → Azure CI/CD. Uses **Static Web Apps** (frontend), **Azure Functions** (Node.js API), **Azure Database for PostgreSQL — Flexible Server** (data), **Azure Blob Storage** (screenshots & icons), and **your OpenAI API key** for translation + PII redaction.

---

## 0. Architecture at a glance

```
GitHub repo ──► GitHub Actions ──► Azure Static Web Apps (React + Vite, /dist)
                                │
                                └─► Azure Functions (Node.js 20, /api/*)
                                        │   │   │
                                        │   │   └─► OpenAI API (your key)
                                        │   └─► Azure Blob Storage (screenshots, icons)
                                        └─► Azure Database for PostgreSQL
```

The frontend calls `/api/*`. When the Function App is **linked** to the Static Web App (Step 6), SWA proxies `/api/*` → Functions automatically — no CORS, no separate URL.

---

## 1. Prerequisites

- An **Azure subscription** with permission to create resources
- A **GitHub** account hosting this repo (push it from Lovable → GitHub first)
- An **OpenAI API key** (https://platform.openai.com/api-keys)
- Azure CLI installed locally (optional, but commands below assume it):
  `az login` then `az account set --subscription "<your-subscription-id>"`

Set a few variables you'll reuse:

```bash
RG="snapguide-rg"
LOC="uaenorth"                        # any region you prefer
PG_NAME="snapguide-db"                # globally unique
PG_USER="snapadmin"
PG_PASS='<choose-a-strong-password>'
ST_ACCT="snapguidestg$RANDOM"         # must be globally unique, lowercase, ≤24 chars
FUNC_APP="snapguide-api"              # globally unique
SWA_NAME="snapguide-web"
```

Create the resource group:

```bash
az group create -n $RG -l $LOC
```

---

## 2. Azure Database for PostgreSQL (Flexible Server)

```bash
az postgres flexible-server create \
  -g $RG -n $PG_NAME -l $LOC \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
  --version 16 --admin-user $PG_USER --admin-password "$PG_PASS" \
  --public-access 0.0.0.0       # allow Azure services; tighten later
az postgres flexible-server db create -g $RG -s $PG_NAME -d snapguide
```

Then load the schema (`azure-functions/sql/schema.sql`):

```bash
PGPASSWORD="$PG_PASS" psql \
  "host=$PG_NAME.postgres.database.azure.com port=5432 dbname=snapguide user=$PG_USER sslmode=require" \
  -f azure-functions/sql/schema.sql
```

Save the connection string for later:

```
postgresql://snapadmin:<URL-ENCODED-PASS>@snapguide-db.postgres.database.azure.com:5432/snapguide?sslmode=require
```

---

## 3. Azure Storage (Blob)

```bash
az storage account create -g $RG -n $ST_ACCT -l $LOC \
  --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access true

# Public-read containers for screenshots and app icons (URLs are embedded in the DB)
CONN=$(az storage account show-connection-string -g $RG -n $ST_ACCT -o tsv)

az storage container create --name recording-screenshots --public-access blob --connection-string "$CONN"
az storage container create --name app-icons              --public-access blob --connection-string "$CONN"

echo $CONN     # save this — you'll paste it into the Function App
```

> Don't want public blobs? Skip `--allow-blob-public-access` and serve via SAS instead — the API code centralises URL generation in `azure-functions/src/shared/storage.js` so you can swap to SAS in one place.

---

## 4. Azure Function App (Node.js 20)

```bash
# Functions need their own storage account too — reuse $ST_ACCT for simplicity
az functionapp create \
  -g $RG -n $FUNC_APP \
  --consumption-plan-location $LOC \
  --runtime node --runtime-version 20 \
  --functions-version 4 --os-type Linux \
  --storage-account $ST_ACCT
```

### App settings (environment variables)

```bash
az functionapp config appsettings set -g $RG -n $FUNC_APP --settings \
  DATABASE_URL="postgresql://$PG_USER:<URL-ENCODED-PASS>@$PG_NAME.postgres.database.azure.com:5432/snapguide?sslmode=require" \
  AZURE_STORAGE_CONNECTION_STRING="$CONN" \
  STORAGE_PUBLIC_BASE_URL="https://$ST_ACCT.blob.core.windows.net" \
  OPENAI_API_KEY="sk-..." \
  OPENAI_TEXT_MODEL="gpt-4o-mini" \
  OPENAI_VISION_MODEL="gpt-4o-mini" \
  CORS_ALLOWED_ORIGIN="*" \
  WEBSITE_NODE_DEFAULT_VERSION="~20"
```

> When you link the Function App to SWA (Step 6), set `CORS_ALLOWED_ORIGIN` to your SWA hostname (e.g. `https://snapguide-web.azurestaticapps.net`).

### Get the publish profile for GitHub Actions

```bash
az functionapp deployment list-publishing-profiles \
  -g $RG -n $FUNC_APP --xml > publish-profile.xml
cat publish-profile.xml
```

Copy the **entire XML** content — you'll add it as a GitHub secret in Step 7.

---

## 5. Azure Static Web App (frontend)

The easiest path is creating it from the **Azure Portal** so it can connect to your GitHub repo and configure CI/CD itself:

1. Portal → **Create resource → Static Web Apps**
2. Plan: **Free** (or Standard if you need linked Functions for production scale)
3. Source: **GitHub** → authorise → pick your repo + `main` branch
4. Build presets: **Custom**
   - **App location**: `/`
   - **Api location**: *(leave blank — Functions deployed separately)*
   - **Output location**: `dist`
5. Click **Create**. Azure injects a workflow file into your repo and triggers the first build.

> **Replace** the auto-generated workflow file with the one already in this repo at `.github/workflows/azure-static-web-apps.yml` (it adds `npm ci`, `VITE_API_BASE_URL`, and `skip_app_build: true`). Keep the **deployment token** the portal added — copy its value out of the auto-generated YAML before deleting it, then add it as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub secrets (Step 7).

---

## 6. Link the Function App to the Static Web App

This is what makes `/api/*` work without CORS or separate hostnames.

Portal → your Static Web App → **APIs** → **Link** → **Azure Functions** → pick `snapguide-api` → environment **Production**.

After linking, requests from the SWA hostname are proxied to the Function App as `/api/*`. You can leave `VITE_API_BASE_URL` blank in the build.

> **Free tier note**: SWA Free supports linked Functions in *managed* mode only (no BYOF). If you provisioned a dedicated Function App as above, upgrade the SWA to **Standard** (~$9/month) to use BYOF linking. Alternatively, skip linking and set `VITE_API_BASE_URL=https://snapguide-api.azurewebsites.net` as a GitHub secret — CORS is already enabled in the API code.

---

## 7. GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | The token from the SWA-generated workflow |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | Full XML from `publish-profile.xml` (Step 4) |
| `VITE_API_BASE_URL` | *(only if you didn't link in Step 6)* `https://snapguide-api.azurewebsites.net` |

The two workflows in `.github/workflows/` will now run on every push to `main`:

- `azure-static-web-apps.yml` — builds Vite, deploys `dist/` to SWA
- `azure-functions.yml` — installs prod deps in `azure-functions/`, deploys to your Function App

---

## 8. First deploy

```bash
git push origin main
```

Watch GitHub → **Actions**. Both workflows should go green. Then:

- Frontend: `https://<swa-name>.azurestaticapps.net`
- API health check: `https://<swa-name>.azurestaticapps.net/api/health`
  (or `https://snapguide-api.azurewebsites.net/api/health` if not linked)

---

## 9. Smoke-test checklist

1. Open the SWA URL — Dashboard loads.
2. Create a new App — record appears (writes `apps` row).
3. Upload an icon — image displays (writes blob to `app-icons`).
4. Open the App, create a recording, add a step manually.
5. Open the recording → click **Annotate** on a screenshot → save → image updates (writes blob to `recording-screenshots`).
6. Click **Translate to Arabic** — Arabic text appears (calls OpenAI via `/api/translate-steps`).
7. Delete the recording — DB rows + blobs both vanish.

If any call returns 5xx: Function App → **Log stream** in the portal shows the error live.

---

## 10. Local development

### Frontend

```bash
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:7071 if running Functions locally
npm install
npm run dev
```

### Backend

```bash
cd azure-functions
cp local.settings.json.example local.settings.json
# Fill DATABASE_URL, AZURE_STORAGE_CONNECTION_STRING, OPENAI_API_KEY
npm install
npm install -g azure-functions-core-tools@4   # one-time
func start
```

API will be at `http://localhost:7071/api/...`.

---

## 11. Hardening (recommended after smoke-test)

- **Tighten Postgres firewall**: remove `0.0.0.0` and add only Function App outbound IPs (or use Private Endpoint).
- **Restrict CORS**: set `CORS_ALLOWED_ORIGIN` to your SWA hostname.
- **Move OpenAI key to Key Vault**: reference it in app settings as `@Microsoft.KeyVault(...)`.
- **Enable Application Insights** on the Function App for distributed tracing (`az monitor app-insights component create` then link it).
- **Custom domain**: SWA → Custom domains → add CNAME / TXT records.
- **Auth**: this build keeps the open-access mock user. If you later want real users, swap `src/contexts/AuthContext.tsx` to use Microsoft Entra ID via SWA's built-in `/.auth/*` endpoints — no code in the API needs to change.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/health` 404 | Function App not linked to SWA, or wrong route prefix | Confirm the link in SWA → APIs, or hit Function URL directly |
| `DATABASE_URL is not configured` in logs | App setting missing | Re-run `az functionapp config appsettings set` and restart the app |
| 500 from `/api/translate-steps` | OpenAI key invalid or quota exceeded | Check Function App logs; rotate the key |
| Screenshot uploads succeed but images don't load | Container is private | Set container access to **blob**, or generate SAS URLs in `storage.js` |
| GitHub Action fails on `npm ci` for functions | Missing `package-lock.json` | Run `npm install` once inside `azure-functions/`, commit the lock file |

You're done. 🎉
