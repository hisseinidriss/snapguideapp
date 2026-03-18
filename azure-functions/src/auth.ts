import { HttpRequest } from "@azure/functions";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: string;
  email: string;
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "fallback-secret";
}

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

export function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: "7d" });
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function jsonResponse(data: any, status = 200) {
  return {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}
