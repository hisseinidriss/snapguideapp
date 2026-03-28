// Database connection module - PostgreSQL connection pooling for Azure Functions - Hissein
// Uses pg Pool to reuse connections across function invocations
import { Pool } from "pg";

// Singleton pool instance - persists across warm function invocations (3-12-2026)
let pool: Pool | null = null;

// Get or create the connection pool with Azure PostgreSQL settings (Hissein 3-21-2026)
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: 5432,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20,                      // Maximum concurrent connections in the pool
      idleTimeoutMillis: 30000,     // Close idle connections after 30 seconds
      connectionTimeoutMillis: 10000, // Fail if connection takes longer than 10 seconds
    });
  }
  return pool;
}

// Execute a parameterized SQL query and return the result - Hissein
// Always releases the client back to the pool via finally block
export async function query(text: string, params?: any[]) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}