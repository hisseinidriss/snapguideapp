// Shared Postgres pool. Lazily initialised so cold-start cost is paid once per worker.
// Supports either a single DATABASE_URL connection string OR individual DB_* variables
// (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL) — the same pattern used
// by the Walkthru deployment.
const { Pool } = require("pg");

let pool;

function buildConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    };
  }

  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!host || !database || !user || !password) {
    throw new Error(
      "Database not configured: set DATABASE_URL, or DB_HOST + DB_NAME + DB_USER + DB_PASSWORD"
    );
  }

  const sslEnabled = String(process.env.DB_SSL ?? "true").toLowerCase() !== "false";
  return {
    host,
    port: Number(process.env.DB_PORT || 5432),
    database,
    user,
    password,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(buildConfig());
  }
  return pool;
}

async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { getPool, query };
