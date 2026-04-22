// /api/ffmpeg-check — diagnostic endpoint. Reports whether the ffmpeg binary
// shipped with the deployment is present, executable, and runnable on this host.
const fs = require("fs");
const { execFile } = require("child_process");
const { app } = require("@azure/functions");
const { json, preflight } = require("../shared/http");

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
      const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
      result.ffmpeg.path = ffmpegPath;
      result.ffmpeg.resolved = true;
      try {
        const st = fs.statSync(ffmpegPath);
        result.ffmpeg.exists = true;
        result.ffmpeg.size = st.size;
        result.ffmpeg.mode = "0" + (st.mode & 0o777).toString(8);
      } catch (e) {
        result.ffmpeg.exists = false;
        result.ffmpeg.statError = e.message;
      }
      if (result.ffmpeg.exists) {
        await new Promise((resolve) => {
          execFile(ffmpegPath, ["-version"], { timeout: 5000 }, (err, stdout, stderr) => {
            if (err) {
              result.ffmpeg.execError = err.message;
              result.ffmpeg.stderr = (stderr || "").slice(0, 500);
            } else {
              result.ffmpeg.version = (stdout || "").split("\n")[0];
            }
            resolve();
          });
        });
      }
    } catch (e) {
      result.ffmpeg.requireError = e.message;
    }

    try {
      const ffprobePath = require("@ffprobe-installer/ffprobe").path;
      result.ffprobe.path = ffprobePath;
      result.ffprobe.resolved = true;
      try {
        const st = fs.statSync(ffprobePath);
        result.ffprobe.exists = true;
        result.ffprobe.size = st.size;
        result.ffprobe.mode = "0" + (st.mode & 0o777).toString(8);
      } catch (e) {
        result.ffprobe.exists = false;
        result.ffprobe.statError = e.message;
      }
    } catch (e) {
      result.ffprobe.requireError = e.message;
    }

    return json(200, result);
  },
});
