// ffmpeg helpers for stitching narrated MP4 walkthroughs.
// Uses project-bundled binaries with explicit platform resolution instead of
// npm installer packages or system PATH discovery.
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const fsSync = require("fs");
const { execFileSync } = require("child_process");
const { randomUUID } = require("crypto");

const BUNDLE_ROOT = path.join(__dirname, "..", "vendor", "ffmpeg");
const RUNTIME_ROOT = path.join(os.tmpdir(), "snapguide-ffmpeg-runtime");

const TARGETS = {
  "linux-x64": { dir: "linux-x64", ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  "linux-arm64": { dir: "linux-arm64", ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  "darwin-x64": { dir: "darwin-x64", ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  "darwin-arm64": { dir: "darwin-arm64", ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  "win32-x64": { dir: "win32-x64", ffmpeg: "ffmpeg.exe", ffprobe: "ffprobe.exe" },
};

const VIDEO_W = 1280;
const VIDEO_H = 720;
const FPS = 30;

let _ffmpegPromise = null;
let _binaryPathsPromise = null;

function getTarget() {
  const key = `${process.platform}-${process.arch}`;
  const target = TARGETS[key];
  if (!target) {
    throw new Error(
      `Unsupported ffmpeg runtime target: ${key}. ` +
        `Supported targets: ${Object.keys(TARGETS).join(", ")}`
    );
  }
  return { key, ...target };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath, fsSync.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function verifyBinary(binaryPath) {
  execFileSync(binaryPath, ["-version"], { stdio: "ignore", timeout: 5000 });
}

async function ensureRuntimeBinary(sourcePath, runtimePath) {
  await fs.mkdir(path.dirname(runtimePath), { recursive: true });
  const sourceStat = await fs.stat(sourcePath);

  let needsCopy = true;
  try {
    const runtimeStat = await fs.stat(runtimePath);
    needsCopy =
      runtimeStat.size !== sourceStat.size || runtimeStat.mtimeMs < sourceStat.mtimeMs;
  } catch {}

  if (needsCopy) {
    await fs.copyFile(sourcePath, runtimePath);
  }

  if (process.platform !== "win32") {
    await fs.chmod(runtimePath, 0o755);
  }

  verifyBinary(runtimePath);
  return runtimePath;
}

async function resolveBundledBinaryPaths() {
  if (_binaryPathsPromise) return _binaryPathsPromise;

  _binaryPathsPromise = (async () => {
    const target = getTarget();
    const ffmpegBundledPath = process.env.SNAPGUIDE_FFMPEG_PATH || path.join(BUNDLE_ROOT, target.dir, target.ffmpeg);
    const ffprobeBundledPath = process.env.SNAPGUIDE_FFPROBE_PATH || path.join(BUNDLE_ROOT, target.dir, target.ffprobe);

    if (!(await pathExists(ffmpegBundledPath))) {
      throw new Error(`Bundled ffmpeg binary not found at ${ffmpegBundledPath}`);
    }
    if (!(await pathExists(ffprobeBundledPath))) {
      throw new Error(`Bundled ffprobe binary not found at ${ffprobeBundledPath}`);
    }

    const runtimeDir = path.join(RUNTIME_ROOT, target.dir);
    const ffmpegPath = await ensureRuntimeBinary(
      ffmpegBundledPath,
      path.join(runtimeDir, target.ffmpeg)
    );
    const ffprobePath = await ensureRuntimeBinary(
      ffprobeBundledPath,
      path.join(runtimeDir, target.ffprobe)
    );

    return {
      target,
      runtimeDir,
      ffmpegPath,
      ffprobePath,
      ffmpegBundledPath,
      ffprobeBundledPath,
    };
  })().catch((error) => {
    _binaryPathsPromise = null;
    throw error;
  });

  return _binaryPathsPromise;
}

async function getFfmpeg() {
  if (_ffmpegPromise) return _ffmpegPromise;

  _ffmpegPromise = resolveBundledBinaryPaths()
    .then(({ ffmpegPath, ffprobePath }) => {
      const ffmpeg = require("fluent-ffmpeg");
      ffmpeg.setFfmpegPath(ffmpegPath);
      ffmpeg.setFfprobePath(ffprobePath);
      return ffmpeg;
    })
    .catch((error) => {
      _ffmpegPromise = null;
      throw error;
    });

  return _ffmpegPromise;
}

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

async function makeStepClip({ imagePath, audioPath, outPath, durationSeconds }) {
  const ffmpeg = await getFfmpeg();
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

async function concatClips(clipPaths, outPath, dir) {
  const ffmpeg = await getFfmpeg();
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

async function probeDurationMs(filePath) {
  const ffmpeg = await getFfmpeg();
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
  resolveBundledBinaryPaths,
  VIDEO_W,
  VIDEO_H,
  FPS,
};
