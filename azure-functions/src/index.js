// Entry point — Azure Functions Node.js v4 programming model.
// Each require() registers its routes via app.http(...).
require("./functions/health");
require("./functions/apps");
require("./functions/recordings");
require("./functions/recording-steps");
require("./functions/upload-screenshot");
require("./functions/upload-app-icon");
require("./functions/translate-steps");
require("./functions/redact-screenshot");
require("./functions/screenshot-file");
