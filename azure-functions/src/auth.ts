// Azure Functions authentication and response utilities (Hissein 3-21-2026)
// Handles JWT token verification, signing, and standardized response formatting
import { HttpRequest } from "@azure/functions";
import jwt from "jsonwebtoken";

// Shape of the authenticated user extracted from JWT
export interface AuthUser {
  userId: string;
  email: string;
}

// Retrieve JWT secret from environment, with fallback for local development - Hissein
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "fallback-secret";
}

// Verify the Bearer token from request Authorization header (3-14-2026)
// Returns null if token is missing, malformed, or expired
export function verifyToken(req: HttpRequest): AuthUser | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return { userId: decoded.userId || decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

// Generate a signed JWT token valid for 7 days - Hissein
export function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: "7d" });
}

// CORS headers allowing all origins - required for cross-origin browser extension requests (Hissein 3-21-2026)
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Standard JSON success response with CORS headers (3-11-2026)
export function jsonResponse(data: any, status = 200) {
  return {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// Standard error response - wraps error message in JSON with CORS headers
export function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}