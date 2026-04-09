// Application management API - using Supabase directly
import { supabase } from "@/integrations/supabase/client";
import type { App } from "@/types/app";

type ApiResult<T> = { data: T | null; error: { message: string } | null };

export const appsApi = {
  list: async (): Promise<ApiResult<App[]>> => {
    const { data, error } = await supabase.from("apps").select("*").order("created_at", { ascending: false });
    return { data: data as App[] | null, error: error ? { message: error.message } : null };
  },

  get: async (id: string): Promise<ApiResult<App>> => {
    const { data, error } = await supabase.from("apps").select("*").eq("id", id).single();
    return { data: data as App | null, error: error ? { message: error.message } : null };
  },

  create: async (input: { name: string; url?: string; description?: string }): Promise<ApiResult<App>> => {
    const { data, error } = await supabase.from("apps").insert({
      name: input.name,
      url: input.url || "",
      description: input.description || "",
    }).select().single();
    return { data: data as App | null, error: error ? { message: error.message } : null };
  },

  update: async (id: string, updates: Partial<App>): Promise<ApiResult<App>> => {
    const { id: _id, created_at, updated_at, ...clean } = updates as any;
    const { data, error } = await supabase.from("apps").update(clean).eq("id", id).select().single();
    return { data: data as App | null, error: error ? { message: error.message } : null };
  },

  delete: async (id: string): Promise<ApiResult<null>> => {
    const { error } = await supabase.from("apps").delete().eq("id", id);
    return { data: null, error: error ? { message: error.message } : null };
  },

  uploadIcon: async (appId: string, file: File): Promise<ApiResult<{ icon_url: string }>> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${appId}/icon.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("app-icons")
      .upload(path, file, { upsert: true });
    if (uploadError) return { data: null, error: { message: uploadError.message } };
    const { data: urlData } = supabase.storage.from("app-icons").getPublicUrl(path);
    return { data: { icon_url: urlData.publicUrl }, error: null };
  },
};
