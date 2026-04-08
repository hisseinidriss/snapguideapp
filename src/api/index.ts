// API barrel export - SnapGuide
export { api, apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, setToken, clearToken, hasToken, API_BASE_URL } from "./client";
export type { ApiError, ApiResult } from "./client";

export { appsApi } from "./apps";
export { recordingsApi, recordingStepsApi } from "./recordings";
