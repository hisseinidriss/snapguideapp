// Azure OpenAI client, used for translation + vision-based PII detection.
// Supports both Azure OpenAI (preferred when AZURE_OPENAI_ENDPOINT is set)
// and standard OpenAI as a fallback.
const { AzureOpenAI, OpenAI } = require("openai");

let client;

function getOpenAI() {
  if (!client) {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

    if (azureEndpoint) {
      if (!azureKey) throw new Error("AZURE_OPENAI_API_KEY (or OPENAI_API_KEY) is not configured");
      client = new AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey: azureKey,
        apiVersion,
      });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
      client = new OpenAI({ apiKey });
    }
  }
  return client;
}

// For Azure OpenAI, these should be the *deployment names*, not model IDs.
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

module.exports = { getOpenAI, TEXT_MODEL, VISION_MODEL };
