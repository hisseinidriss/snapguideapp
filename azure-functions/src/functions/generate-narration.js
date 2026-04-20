// /api/generate-narration — generates a spoken-style narration line per step,
// runs ElevenLabs TTS, uploads MP3s to Azure Blob, and saves results on each step.
const { app } = require("@azure/functions");
const { query } = require("../shared/db");
const { json, preflight, handleError } = require("../shared/http");
const { uploadBuffer } = require("../shared/storage");
const { chat } = require("../shared/perplexity");
const { synthesize } = require("../shared/elevenlabs");

const NARRATION_CONTAINER = "recording-narration";

async function setStatus(recordingId, status, error = null) {
  await query(
    `UPDATE process_recordings
       SET video_status = $1, video_error = $2, updated_at = now()
     WHERE id = $3`,
    [status, error, recordingId]
  );
}

async function rewriteForSpeech(instruction) {
  // Short, friendly, single-sentence narration. Keep it under ~18 words.
  const messages = [
    {
      role: "system",
      content:
        "You rewrite UI step instructions into a single short spoken sentence " +
        "for a friendly voiceover narrator. Plain English, present tense, " +
        "no markdown, no quotes, no numbering, no emojis. Maximum 18 words.",
    },
    { role: "user", content: instruction },
  ];
  try {
    const r = await chat({ messages, temperature: 0.3 });
    const text = r?.choices?.[0]?.message?.content?.trim();
    return (text && text.length > 0 ? text : instruction).replace(/^[\\"']|[\\"']$/g, "");
  } catch {
    return instruction; // fallback to original
  }
}

app.http("generate-narration", {
  route: "generate-narration",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      const body = await req.json();
      const recordingId = body?.recording_id;
      if (!recordingId) return json(400, { error: "recording_id required" });

      await setStatus(recordingId, "narrating");

      const stepsRes = await query(
        `SELECT id, sort_order, instruction
           FROM process_recording_steps
          WHERE recording_id = $1
          ORDER BY sort_order ASC`,
        [recordingId]
      );
      const steps = stepsRes.rows;
      if (!steps.length) {
        await setStatus(recordingId, "failed", "Recording has no steps");
        return json(400, { error: "Recording has no steps" });
      }

      const out = [];
      for (const step of steps) {
        const narration = await rewriteForSpeech(step.instruction || "");
        const { buffer, durationMs } = await synthesize(narration);
        const blobPath = `${recordingId}/step-${step.sort_order}-${step.id}.mp3`;
        const url = await uploadBuffer({
          container: NARRATION_CONTAINER,
          path: blobPath,
          buffer,
          contentType: "audio/mpeg",
        });
        await query(
          `UPDATE process_recording_steps
              SET narration_text = $1,
                  narration_url = $2,
                  narration_duration_ms = $3,
                  updated_at = now()
            WHERE id = $4`,
          [narration, url, durationMs, step.id]
        );
        out.push({ id: step.id, narration, narration_url: url, narration_duration_ms: durationMs });
      }

      // Don't flip back to idle yet — caller will trigger render-recording-video next.
      return json(200, { recording_id: recordingId, steps: out });
    } catch (e) {
      ctx.error("generate-narration error", e);
      try {
        const body = await req.clone().json().catch(() => ({}));
        if (body?.recording_id) await setStatus(body.recording_id, "failed", e?.message || "Narration failed");
      } catch {}
      return handleError(ctx, e);
    }
  },
});
