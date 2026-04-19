// Application management API — talks to the Azure Functions backend.
import { http, fileToDataUrl, type ApiResult } from "./http";
import type { App } from "@/types/app";

export const appsApi = {
  list: () => http.get<App[]>("/apps"),
  get: (id: string) => http.get<App>(`/apps/${id}`),

  create: (input: { name: string; url?: string; description?: string }) =>
    http.post<App>("/apps", {
      name: input.name,
      url: input.url || "",
      description: input.description || "",
    }),

  update: (id: string, updates: Partial<App>): Promise<ApiResult<App>> => {
    const { id: _id, created_at, updated_at, ...clean } = updates as any;
    return http.patch<App>(`/apps/${id}`, clean);
  },

  delete: (id: string) => http.del<null>(`/apps/${id}`),

  uploadIcon: async (
    appId: string,
    file: File
  ): Promise<ApiResult<{ icon_url: string }>> => {
    const image = await fileToDataUrl(file);
    return http.post<{ icon_url: string }>("/upload-app-icon", {
      app_id: appId,
      filename: file.name,
      image,
    });
  },
};
