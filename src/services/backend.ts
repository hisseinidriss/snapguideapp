// Service factory - returns the appropriate backend implementation
// based on VITE_BACKEND environment variable.
//
// For Azure migration: create src/services/azure-backend.ts implementing
// the same exports, then update the switch below.

import { supabase } from "@/integrations/supabase/client";
import type { AuthService } from "./types";

const BACKEND = import.meta.env.VITE_BACKEND || "supabase";

// Auth service abstraction - this is where Azure AD B2C would plug in
const supabaseAuth: AuthService = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return { data: { session: data.session as any } };
  },
  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session as any);
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

// For database, storage, and functions, we re-export the supabase client directly.
// When migrating to Azure, replace these with Azure SDK equivalents.
function getBackend() {
  switch (BACKEND) {
    case "supabase":
    default:
      return {
        // Database: use supabase client directly for full type safety
        db: supabase,
        auth: supabaseAuth,
        storage: supabase.storage,
        functions: supabase.functions,
      };
    // case "azure":
    //   return { db: azureDb, auth: azureAuth, storage: azureStorage, functions: azureFunctions };
  }
}

const backend = getBackend();

export const db = backend.db;
export const auth = backend.auth;
export const storage = backend.storage;
export const functions = backend.functions;
