// Shared Postgres pool. Lazily initialised so cold-start cost is paid once per worker.
const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Azure PostgreSQL uses managed certs
      max: 5,
      idleTimeoutMillis: 30_000,
    });
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
