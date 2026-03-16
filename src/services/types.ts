// Service abstraction layer types
// Swap implementations via VITE_BACKEND env var ("supabase" | "azure")

export interface QueryOptions {
  eq?: Record<string, any>;
  in?: Record<string, any[]>;
  order?: { column: string; ascending?: boolean };
  select?: string;
  single?: boolean;
}

export interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface DatabaseService {
  from(table: string): TableQuery;
}

export interface TableQuery {
  select(columns?: string): TableQuery;
  insert(data: any): TableQuery;
  update(data: any): TableQuery;
  delete(): TableQuery;
  eq(column: string, value: any): TableQuery;
  in(column: string, values: any[]): TableQuery;
  order(column: string, options?: { ascending?: boolean }): TableQuery;
  single(): TableQuery;
  then<T>(resolve: (result: QueryResult<T>) => void): Promise<void>;
  // Execute and return result
  execute<T = any>(): Promise<QueryResult<T>>;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
}

export interface AuthService {
  getSession(): Promise<{ data: { session: AuthSession | null } }>;
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): { data: { subscription: { unsubscribe: () => void } } };
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: { message: string } | null }>;
  signUp(params: { email: string; password: string; options?: any }): Promise<{ error: { message: string } | null }>;
  signOut(): Promise<void>;
  updateUser(params: { password?: string }): Promise<{ error: { message: string } | null }>;
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: { message: string } | null }>;
}

export interface StorageService {
  from(bucket: string): StorageBucket;
}

export interface StorageBucket {
  upload(path: string, file: File | Uint8Array, options?: { upsert?: boolean; contentType?: string }): Promise<{ error: { message: string } | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

export interface FunctionsService {
  invoke(name: string, options?: { body?: any }): Promise<{ data: any; error: { message: string } | null }>;
}

export interface BackendServices {
  db: DatabaseService;
  auth: AuthService;
  storage: StorageService;
  functions: FunctionsService;
}
