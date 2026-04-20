// Perplexity AI client wrapper.
// Uses the OpenAI-compatible /chat/completions endpoint at api.perplexity.ai.
// Reads PERPLEXITY_API_KEY from environment (set in Azure App Settings).

const PPLX_BASE_URL = "https://api.perplexity.ai";
const PPLX_MODEL = process.env.PERPLEXITY_MODEL || "sonar";

function getKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY is not configured");
  return key;
}

/**
 * Call Perplexity chat completions.
 * @param {object} opts
 * @param {Array} opts.messages - [{role, content}]
 * @param {object} [opts.response_format] - JSON schema for structured output
 * @param {string} [opts.model]
 * @param {number} [opts.temperature]
 * @returns {Promise<object>} parsed JSON response
 */
async function chat({ messages, response_format, model, temperature = 0.2 }) {
  const body = {
    model: model || PPLX_MODEL,
    messages,
    temperature,
  };
  if (response_format) body.response_format = response_format;

  const res = await fetch(`${PPLX_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${text}`);
  }
  return res.json();
}

module.exports = { chat, PPLX_MODEL };
