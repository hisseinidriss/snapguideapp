// Service factory - returns the appropriate backend implementation
// based on VITE_BACKEND environment variable.
//
// For Azure migration: create src/services/azure-backend.ts implementing
// BackendServices, then add the "azure" case below.

import type { BackendServices } from "./types";
import { supabaseBackend } from "./supabase-backend";

const BACKEND = import.meta.env.VITE_BACKEND || "supabase";

function getBackend(): BackendServices {
  switch (BACKEND) {
    case "supabase":
      return supabaseBackend;
    // case "azure":
    //   return azureBackend; // import from ./azure-backend
    default:
      console.warn(`Unknown backend "${BACKEND}", falling back to supabase`);
      return supabaseBackend;
  }
}

export const backend = getBackend();

// Convenience exports
export const db = backend.db;
export const auth = backend.auth;
export const storage = backend.storage;
export const functions = backend.functions;
