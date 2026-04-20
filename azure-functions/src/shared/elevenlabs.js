// ElevenLabs TTS helper.
// Returns MP3 buffer + duration (ms) computed via ffprobe.
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // George
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

function getKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

function probeDurationMs(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      const seconds = meta?.format?.duration || 0;
      resolve(Math.round(seconds * 1000));
    });
  });
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

  // Probe duration via temp file
  const tmp = path.join(os.tmpdir(), `tts-${randomUUID()}.mp3`);
  await fs.writeFile(tmp, buffer);
  let durationMs = 0;
  try {
    durationMs = await probeDurationMs(tmp);
  } catch {
    // Fallback estimate: ~14 chars/sec speech rate
    durationMs = Math.max(1500, Math.round((text.length / 14) * 1000));
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }

  return { buffer, durationMs };
}

module.exports = { synthesize, DEFAULT_VOICE_ID };
