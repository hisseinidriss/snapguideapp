// ElevenLabs TTS helper.
// Returns MP3 buffer + duration (ms). Duration probe is lazy/optional —
// if ffprobe is unavailable on the host, we fall back to a length estimate
// instead of crashing the module load (which would 404 every route).
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // George
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

function getKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

async function tryProbeDurationMs(filePath, fallbackText) {
  try {
    const { probeDurationMs } = require("./ffmpeg");
    return await probeDurationMs(filePath);
  } catch {
    // Estimate ~14 chars/sec speech rate.
    return Math.max(1500, Math.round(((fallbackText || "").length / 14) * 1000));
  }
}

/**
 * Synthesize narration text to MP3.
 * @param {string} text
 * @param {string} [voiceId]
 * @returns {Promise<{ buffer: Buffer, durationMs: number }>}
 */
async function synthesize(text, voiceId) {
  const id = voiceId || DEFAULT_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": getKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.35,
        use_speaker_boost: true,
        speed: 1.0,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed ${res.status}: ${errText}`);
  }

  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);

  const tmp = path.join(os.tmpdir(), `tts-${randomUUID()}.mp3`);
  await fs.writeFile(tmp, buffer);
  let durationMs = 0;
  try {
    durationMs = await tryProbeDurationMs(tmp, text);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }

  return { buffer, durationMs };
}

module.exports = { synthesize, DEFAULT_VOICE_ID };
