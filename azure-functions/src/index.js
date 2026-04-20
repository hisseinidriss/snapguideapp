// Entry point — Azure Functions Node.js v4 programming model.
// Each require() registers its routes via app.http(...).
//
// IMPORTANT: wrap each require in try/catch so a single broken module
// (e.g. missing ffmpeg binary on the host) does NOT prevent the rest of
// the functions from registering. Without this, one bad require makes
// the host start with ZERO functions and every route returns 404.
function safeLoad(name) {
  try {
    require(name);
    // eslint-disable-next-line no-console
    console.log(`[startup] loaded ${name}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[startup] FAILED to load ${name}:`, e && e.stack ? e.stack : e);
  }
}

safeLoad("./functions/health");
safeLoad("./functions/apps");
safeLoad("./functions/recordings");
safeLoad("./functions/recording-steps");
safeLoad("./functions/upload-screenshot");
safeLoad("./functions/upload-app-icon");
safeLoad("./functions/translate-steps");
safeLoad("./functions/redact-screenshot");
safeLoad("./functions/screenshot-file");
safeLoad("./functions/generate-narration");
safeLoad("./functions/render-recording-video");
