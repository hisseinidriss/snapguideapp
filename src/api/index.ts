// API barrel export - centralizes all API modules for clean imports (Hissein 3-21-2026)
// Usage: import { appsApi, toursApi } from "@/api";
export { api, apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, setToken, clearToken, hasToken, API_BASE_URL } from "./client";
export type { ApiError, ApiResult } from "./client";

// Domain-specific API modules - Hissein
export { appsApi } from "./apps";
export { toursApi, tourStepsApi } from "./tours";
export { launchersApi } from "./launchers";
export { checklistsApi, checklistItemsApi } from "./checklists";
export { recordingsApi, recordingStepsApi } from "./recordings";
export { analyticsApi } from "./analytics";
export { feedbackApi } from "./feedback";
export { functionsApi } from "./functions";
export { translationsApi } from "./translations";
export type { Translation } from "./translations";