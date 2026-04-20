// ffmpeg helpers for stitching narrated MP4 walkthroughs.
// Bundles its own ffmpeg binary so this works on Windows or Linux Function Apps.
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

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

module.exports = { workDir, downloadToFile, makeStepClip, concatClips, VIDEO_W, VIDEO_H, FPS };
