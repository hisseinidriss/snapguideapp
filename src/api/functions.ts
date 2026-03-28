// AI and utility functions API - server-side operations for tour generation and validation - Hissein
import { apiPost } from "./client";

export const functionsApi = {
  // Generate tour steps automatically by crawling a URL with AI (Hissein 3-21-2026)
  generateTourSteps: (body: { url: string; tourName: string }) =>
    apiPost("/api/generate-tour-steps", body),
  // Generate tour steps from an uploaded manual document (PDF, DOCX) (3-13-2026)
  generateTourFromManual: (body: { fileBase64: string | null; fileName: string; mimeType: string; textContent: string | null }) =>
    apiPost("/api/generate-tour-from-manual", body),
  // Validate CSS selectors against a live page to check if elements exist - Hissein
  validateSelectors: (body: { url: string; selectors: string[] }) =>
    apiPost("/api/validate-selectors", body),
  // Capture a screenshot of a URL for preview purposes
  screenshotUrl: (body: { url: string }) =>
    apiPost<{ screenshot: string }>("/api/screenshot-url", body),
};