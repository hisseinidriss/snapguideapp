

## Auto-Redact Sensitive Data in Screenshots

Detect and blur PII (emails, names, credit cards, API keys, phone numbers, etc.) in captured screenshots before they're saved to storage.

### Approach

Use **Lovable AI (Gemini 2.5 Flash)** with vision capability to detect bounding boxes of sensitive regions, then blur those regions server-side using an edge function before uploading to storage.

### Architecture

```text
Extension captures screenshot
        ↓
Edge function: redact-screenshot
  1. Send image to Gemini 2.5 Flash (vision)
  2. Ask for bounding boxes of PII regions
  3. Apply blur to those regions (canvas/image lib)
  4. Return redacted image
        ↓
Upload redacted image to storage
        ↓
Save step with redacted screenshot_url
```

### Implementation Plan

**1. New edge function: `supabase/functions/redact-screenshot/index.ts`**
- Accepts: `{ image: base64, recording_id, step_number }`
- Calls Gemini 2.5 Flash via Lovable AI gateway with structured tool-call to return PII bounding boxes (`[{x, y, width, height, type}]` in normalized 0–1 coords)
- Uses Deno's `ImageScript` library to load PNG, apply pixelation/blur over each region, re-encode
- Uploads redacted image to `recording-screenshots` bucket
- Returns public URL

**2. App settings — toggle per-app**
- Add `auto_redact` boolean column to `apps` table (default `true`)
- Add toggle UI in `AppDetail.tsx` settings area (label: "Auto-redact sensitive data in screenshots")

**3. Update extension `background.js`**
- Before uploading screenshot directly, if `auto_redact` enabled (fetch app setting once per recording start), call `redact-screenshot` edge function instead
- Fallback: if redaction fails, upload original (with console warning) — don't block the recording

**4. Update web UI step view (`ScribeRecording.tsx`)**
- Add small "Re-redact" / "Restore original" button per step (optional, nice-to-have, included in scope)
- Show a small shield badge on screenshots that were auto-redacted

### What gets detected

Prompt the model to identify and return boxes for:
- Email addresses
- Person names (full names)
- Credit/debit card numbers
- API keys, tokens, secrets
- Phone numbers
- Physical addresses
- National IDs / SSN-like numbers
- Account/IBAN numbers

### Technical notes

- **Cost**: ~1 vision call per captured step. Gemini 2.5 Flash is cheap; toggle lets users disable.
- **Latency**: adds ~1–2 s per step capture. Acceptable since capture is async.
- **Blur method**: heavy box blur (radius ~25 px) using ImageScript — irreversible.
- **Privacy-by-default**: redaction happens server-side, original screenshot is never stored.

### Files to create / change

- **New**: `supabase/functions/redact-screenshot/index.ts`
- **Migration**: add `auto_redact` boolean to `apps` (default true)
- **Edit**: `extension/background.js` — route uploads through redact function when enabled
- **Edit**: `src/pages/AppDetail.tsx` — settings toggle
- **Edit**: `src/pages/ScribeRecording.tsx` — redacted badge on screenshots
- **Edit**: `src/types/app.ts` — add `auto_redact` field

### Out of scope (can add later)
- Manual redaction editor (draw your own blur boxes)
- Face/photo blurring
- Whitelist of allowed values (e.g. "don't redact my own name")

