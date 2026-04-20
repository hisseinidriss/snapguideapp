// /api/render-recording-video — stitches per-step screenshots + narration MP3s
// into a single MP4 using ffmpeg, uploads it to Azure Blob, and saves the URL.
const path = require("path");
const fs = require("fs/promises");
const { app } = require("@azure/functions");
const { query } = require("../shared/db");
const { json, preflight, handleError } = require("../shared/http");
const { uploadBuffer } = require("../shared/storage");
const { workDir, downloadToFile, makeStepClip, concatClips } = require("../shared/ffmpeg");

const VIDEO_CONTAINER = "recording-videos";

async function setStatus(recordingId, status, error = null, videoUrl = null) {
  if (videoUrl) {
    await query(
      `UPDATE process_recordings
         SET video_status = $1, video_error = $2, video_url = $3, updated_at = now()
       WHERE id = $4`,
      [status, error, videoUrl, recordingId]
    );
  } else {
    await query(
      `UPDATE process_recordings
         SET video_status = $1, video_error = $2, updated_at = now()
       WHERE id = $3`,
      [status, error, recordingId]
    );
  }
}

app.http("render-recording-video", {
  route: "render-recording-video",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    let recordingId;
    let dir;
    try {
      const body = await req.json();
      recordingId = body?.recording_id;
      if (!recordingId) return json(400, { error: "recording_id required" });

      await setStatus(recordingId, "rendering");

      const stepsRes = await query(
        `SELECT id, sort_order, screenshot_url, narration_url, narration_duration_ms
           FROM process_recording_steps
          WHERE recording_id = $1
          ORDER BY sort_order ASC`,
        [recordingId]
      );
      const steps = stepsRes.rows.filter(
        (s) => s.screenshot_url && s.narration_url
      );
      if (!steps.length) {
        await setStatus(
          recordingId,
          "failed",
          "No steps with both a screenshot and narration audio"
        );
        return json(400, { error: "No usable steps (need screenshot + narration)" });
      }

      dir = await workDir();
      const clipPaths = [];

      for (const step of steps) {
        const idx = step.sort_order;
        const imgExt = (step.screenshot_url.split("?")[0].match(/\.(\w{3,4})$/) || [, "png"])[1];
        const imgPath = path.join(dir, `img-${idx}.${imgExt}`);
        const audPath = path.join(dir, `aud-${idx}.mp3`);
        const clipPath = path.join(dir, `clip-${idx}.mp4`);

        await downloadToFile(step.screenshot_url, imgPath);
        await downloadToFile(step.narration_url, audPath);

        const durationSeconds = Math.max(
          1,
          ((step.narration_duration_ms || 2000) + 250) / 1000 // tiny tail pad
        );

        await makeStepClip({
          imagePath: imgPath,
          audioPath: audPath,
          outPath: clipPath,
          durationSeconds,
        });
        clipPaths.push(clipPath);
      }

      const finalPath = path.join(dir, "final.mp4");
      await concatClips(clipPaths, finalPath, dir);

      const buffer = await fs.readFile(finalPath);
      const blobPath = `${recordingId}.mp4`;
      const videoUrl = await uploadBuffer({
        container: VIDEO_CONTAINER,
        path: blobPath,
        buffer,
        contentType: "video/mp4",
      });

      await setStatus(recordingId, "ready", null, videoUrl);

      return json(200, { recording_id: recordingId, video_url: videoUrl });
    } catch (e) {
      ctx.error("render-recording-video error", e);
      if (recordingId) {
        await setStatus(recordingId, "failed", e?.message || "Render failed").catch(() => {});
      }
      return handleError(ctx, e);
    } finally {
      if (dir) {
        fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    }
  },
});
