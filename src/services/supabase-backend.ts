// Supabase implementation of the service abstraction layer
// This wraps the existing Supabase client to match our service interfaces

import { supabase } from "@/integrations/supabase/client";
import type {
  BackendServices,
  DatabaseService,
  AuthService,
  StorageService,
  FunctionsService,
  AuthSession,
} from "./types";

// Database service - thin wrapper, Supabase client already matches our query pattern
const db: DatabaseService = {
  from(table: string) {
    return supabase.from(table) as any;
  },
};

// Auth service
const auth: AuthService = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return { data: { session: data.session as unknown as AuthSession | null } };
  },
  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session as unknown as AuthSession | null);
    });
    return { data };
  },
  async signInWithPassword(credentials) {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    return { error: error ? { message: error.message } : null };
  },
  async signUp(params) {
    const { error } = await supabase.auth.signUp(params);
    return { error: error ? { message: error.message } : null };
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async updateUser(params) {
    const { error } = await supabase.auth.updateUser(params);
    return { error: error ? { message: error.message } : null };
  },
  async resetPasswordForEmail(email, options) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, options);
    return { error: error ? { message: error.message } : null };
  },
};

// Storage service
const storage: StorageService = {
  from(bucket: string) {
    return supabase.storage.from(bucket) as any;
  },
};

// Functions service
const functions: FunctionsService = {
  async invoke(name, options) {
    const { data, error } = await supabase.functions.invoke(name, options);
    return { data, error: error ? { message: error.message } : null };
  },
};

export const supabaseBackend: BackendServices = {
  db,
  auth,
  storage,
  functions,
};
