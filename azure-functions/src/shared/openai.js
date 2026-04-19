// Single OpenAI client, used for translation + vision-based PII detection.
const OpenAI = require("openai");

let client;

function getOpenAI() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    client = new OpenAI({ apiKey });
  }
  return client;
}

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

module.exports = { getOpenAI, TEXT_MODEL, VISION_MODEL };
