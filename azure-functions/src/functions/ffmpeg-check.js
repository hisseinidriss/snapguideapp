// /api/ffmpeg-check — diagnostic endpoint for bundled runtime binaries.
const fs = require("fs");
const { execFile } = require("child_process");
const { app } = require("@azure/functions");
const { json, preflight } = require("../shared/http");
const { resolveBundledBinaryPaths } = require("../shared/ffmpeg");

async function inspectBinary(binaryPath) {
  const result = { path: binaryPath, resolved: true };
  try {
    const st = fs.statSync(binaryPath);
    result.exists = true;
    result.size = st.size;
    result.mode = "0" + (st.mode & 0o777).toString(8);
  } catch (error) {
    result.exists = false;
    result.statError = error.message;
    return result;
  }

  await new Promise((resolve) => {
    execFile(binaryPath, ["-version"], { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        result.execError = err.message;
        result.stderr = (stderr || "").slice(0, 500);
      } else {
        result.version = (stdout || "").split("\n")[0];
      }
      resolve();
    });
  });

  return result;
}

app.http("ffmpeg-check", {
  route: "ffmpeg-check",
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req) => {
    if (req.method === "OPTIONS") return preflight();

    const result = {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      ffmpeg: { resolved: false },
      ffprobe: { resolved: false },
    };

    try {
      const resolved = await resolveBundledBinaryPaths();
      result.target = resolved.target.key;
      result.runtimeDir = resolved.runtimeDir;
      result.ffmpegBundledPath = resolved.ffmpegBundledPath;
      result.ffprobeBundledPath = resolved.ffprobeBundledPath;
      result.ffmpeg = await inspectBinary(resolved.ffmpegPath);
      result.ffprobe = await inspectBinary(resolved.ffprobePath);
    } catch (error) {
      result.error = error.message;
    }

    return json(200, result);
  },
});
