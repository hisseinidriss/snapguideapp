
## AI-narrated MP4 walkthroughs — final plan

Stays on your current Windows Function App. Bundles ffmpeg via npm so no infra change is needed.

### Flow
```text
ScribeRecording UI
  click "Generate AI video"
        │
        ▼
POST /api/generate-narration
   ├─ Perplexity (sonar) → spoken-style line per step
   ├─ ElevenLabs TTS     → mp3 per step
   └─ Azure Blob upload  → recording-narration/<rec_id>/step-<n>.mp3
        │
        ▼
POST /api/render-recording-video
   ├─ Download screenshots + mp3s
   ├─ ffmpeg per step: still image clip = mp3 duration, mux audio
   ├─ ffmpeg concat → final mp4
   └─ Azure Blob upload → recording-videos/<rec_id>.mp4
        │
        ▼
recording.video_url → Download MP4 button
```

### Database changes (migration)
- `process_recording_steps` add: `narration_text text`, `narration_url text`, `narration_duration_ms int`
- `process_recordings` add: `video_url text`, `video_status text default 'idle'` (values: `idle | narrating | rendering | ready | failed`), `video_error text`

### Backend (Azure Functions, Windows-compatible)
- `azure-functions/package.json` — add deps: `@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg`, `node-fetch` (only if needed).
- `azure-functions/src/shared/elevenlabs.js` — `synthesize(text, voiceId)` → returns `{ buffer, durationMs }`. Uses `mp3_44100_128`. Default voice `JBFqnCBsd6RMkjVDRZzb` (George).
- `azure-functions/src/shared/ffmpeg.js` — wraps `@ffmpeg-installer/ffmpeg` binary path; helpers `makeStepClip(image, audio, outPath)` and `concatClips(clipPaths, outPath)`.
- `azure-functions/src/functions/generate-narration.js` — `POST /api/generate-narration` body `{ recording_id }`:
  1. Set `recordings.video_status='narrating'`.
  2. Load steps in order.
  3. For each step: Perplexity rewrite of `instruction` → ~1 short sentence; ElevenLabs TTS; upload mp3; update step row with `narration_text/url/duration_ms`.
  4. Return updated steps.
- `azure-functions/src/functions/render-recording-video.js` — `POST /api/render-recording-video` body `{ recording_id }`:
  1. Set `video_status='rendering'`.
  2. Download each step's screenshot + mp3 to `os.tmpdir()`.
  3. Build per-step mp4 clip (image looped to audio length, 1280×720, yuv420p, 30fps).
  4. Concat clips into one mp4.
  5. Upload to `recording-videos/<rec_id>.mp4`; save `video_url`; set `video_status='ready'`.
  6. On any error: `video_status='failed'`, `video_error=message`.
- `azure-functions/src/index.js` — register both new functions.
- `azure-functions/local.settings.json.example` — add `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

### Frontend
- `src/api/recordings.ts` — add `generateNarration(id)` and `renderVideo(id)`.
- `src/pages/ScribeRecording.tsx` — new "Generate AI video" button beside PDF/DOCX. Disabled while `video_status` is `narrating` or `rendering`. Polls the recording every 3s until `ready` or `failed`. Shows toast on failure. When `ready`, render "Download MP4" link to `video_url`.
- Optional small per-step preview: play button next to each step that plays its `narration_url`.

### What you need to do
1. In Azure Function App → **Application settings**, add:
   - `ELEVENLABS_API_KEY` = your key
   - (optional) `ELEVENLABS_VOICE_ID` = voice id
2. Save (auto-restart) and redeploy the Functions code via your existing GitHub Action.
3. I'll request `ELEVENLABS_API_KEY` via the secret tool when implementation starts so it's also stored in Lovable for reference.

### Out of scope this round
- Multi-language narration (English first; Arabic/French TTS later — `eleven_multilingual_v2` supports it, easy follow-up).
- Background music, transitions, Ken-Burns zoom.
- Streaming progress (we poll).

### Risks
- Windows Function App cold start with bundled ffmpeg ≈ 6–10s (acceptable for an on-demand action).
- Long recordings (>20 steps) may exceed default 5-min Functions timeout — I'll set `functionTimeout` to `00:10:00` in `host.json` if not already.
