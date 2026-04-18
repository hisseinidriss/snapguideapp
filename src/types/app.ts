// Application type definition for SnapGuide
export interface App {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  auto_redact: boolean;
  created_at: string;
  updated_at: string;
}

export type AppInsert = Partial<App> & Pick<App, "name">;
