# Azure Functions - WalkThru API

## Setup

```bash
cd azure-functions
npm install
```

## Local Development

1. Copy `local.settings.json` and fill in actual values
2. Run: `npm start`

## Deploy to Azure

```bash
# Login to Azure
az login

# Deploy to the walkthru-api function app
func azure functionapp publish walkthru-api
```

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL server hostname |
| `DB_NAME` | Database name |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_SSL` | Enable SSL (`true`/`false`) |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `FIRECRAWL_API_KEY` | (Optional) Firecrawl API key for screenshots |
| `OPENAI_API_KEY` | (Optional) OpenAI API key for AI generation |

## API Endpoints

- `GET/POST /api/apps` - List/Create apps
- `GET/PATCH/DELETE /api/apps/{id}` - Get/Update/Delete app
- `GET/POST /api/tours` - List/Create tours
- `GET/PATCH/DELETE /api/tours/{id}` - Get/Update/Delete tour
- `GET/POST /api/tour-steps` - List/Create tour steps
- `POST /api/tour-steps/by-tours` - Get steps by tour IDs
- `PATCH/DELETE /api/tour-steps/{id}` - Update/Delete step
- `GET /api/launchers` - List launchers
- `POST /api/launchers` - Create launcher
- `PATCH/DELETE /api/launchers/{id}` - Update/Delete launcher
- `GET /api/checklists` - List checklists
- `GET/PATCH/DELETE /api/checklists/{id}` - Get/Update/Delete checklist
- `GET /api/checklists/{id}/items` - List checklist items
- `POST /api/checklist-items` - Create checklist item
- `PATCH/DELETE /api/checklist-items/{id}` - Update/Delete item
- `GET /api/recordings` - List recordings
- `GET/PATCH/DELETE /api/recordings/{id}` - Get/Update/Delete recording
- `GET /api/recordings/{id}/steps` - List recording steps
- `POST /api/recording-steps` - Create recording step
- `PATCH/DELETE /api/recording-steps/{id}` - Update/Delete step
- `GET /api/analytics/events` - Get analytics events
- `POST /api/track-events` - Track events
- `POST /api/upload` - Upload file
- `POST /api/screenshot-url` - Take screenshot
- `POST /api/validate-selectors` - Validate CSS selectors
- `POST /api/generate-tour-steps` - AI generate tour steps
- `POST /api/generate-tour-from-manual` - AI generate from manual
