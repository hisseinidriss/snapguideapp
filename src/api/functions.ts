import { apiPost } from "./client";

export const functionsApi = {
  generateTourSteps: (body: { url: string; tourName: string }) =>
    apiPost("/api/generate-tour-steps", body),
  generateTourFromManual: (body: { fileBase64: string | null; fileName: string; mimeType: string; textContent: string | null }) =>
    apiPost("/api/generate-tour-from-manual", body),
  validateSelectors: (body: { url: string; selectors: string[] }) =>
    apiPost("/api/validate-selectors", body),
  screenshotUrl: (body: { url: string }) =>
    apiPost<{ screenshot: string }>("/api/screenshot-url", body),
};
