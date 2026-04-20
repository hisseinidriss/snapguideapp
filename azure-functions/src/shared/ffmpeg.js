// ffmpeg helpers for stitching narrated MP4 walkthroughs.
// Bundles its own ffmpeg binary so this works on Windows or Linux Function Apps.
//
// IMPORTANT: requires here are lazy. The ffmpeg installer packages download
// platform-specific binaries during `npm install`. If that didn't happen on
// the deploy host, requiring them at module load time would crash the whole
// Functions host and every route would 404. We isolate the failure to the
// render endpoint instead.
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");

let _ffmpeg = null;
function getFfmpeg() {
  if (_ffmpeg) return _ffmpeg;
  const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  const ffprobePath = require("@ffprobe-installer/ffprobe").path;
  const ffmpeg = require("fluent-ffmpeg");
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  _ffmpeg = ffmpeg;
  return ffmpeg;
}

const VIDEO_W = 1280;
const VIDEO_H = 720;
const FPS = 30;

function workDir() {
  const dir = path.join(os.tmpdir(), `snapguide-${randomUUID()}`);
  return fs.mkdir(dir, { recursive: true }).then(() => dir);
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return destPath;
}

/**
 * Build a single MP4 clip: looped still image with audio overlay.
 * Image is letterboxed/scaled to fit 1280x720.
 */
function makeStepClip({ imagePath, audioPath, outPath, durationSeconds }) {
  const ffmpeg = getFfmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1"])
      .input(audioPath)
      .complexFilter([
        `[0:v]scale=${VIDEO_W}:${VIDEO_H}:force_original_aspect_ratio=decrease,pad=${VIDEO_W}:${VIDEO_H}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps=${FPS},format=yuv420p[v]`,
      ])
      .outputOptions([
        "-map [v]",
        "-map 1:a",
        "-c:v libx264",
        "-preset veryfast",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 128k",
        "-ar 44100",
        "-shortest",
        "-movflags +faststart",
        `-t ${durationSeconds}`,
      ])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => reject(err));
  });
}

/**
 * Concatenate multiple MP4 clips using the concat demuxer.
 */
async function concatClips(clipPaths, outPath, dir) {
  const ffmpeg = getFfmpeg();
  const listFile = path.join(dir, "concat.txt");
  const lines = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listFile, lines, "utf8");

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy", "-movflags +faststart"])
      .save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => reject(err));
  });
}

/**
 * Probe an mp3/audio file's duration (ms) using ffprobe.
 * Lazy so missing binary doesn't crash module load.
 */
function probeDurationMs(filePath) {
  const ffmpeg = getFfmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      const seconds = meta?.format?.duration || 0;
      resolve(Math.round(seconds * 1000));
    });
  });
}

module.exports = {
  workDir,
  downloadToFile,
  makeStepClip,
  concatClips,
  probeDurationMs,
  VIDEO_W,
  VIDEO_H,
  FPS,
};
