import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL
  ?? "postgres://letscook_admin:letscook_local_dev@127.0.0.1:5432/lets_cook";

export const pool = new Pool({
  ...(connectionString ? { connectionString } : {}),
  max: Number(process.env.PG_POOL_MAX ?? 10),
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error) => {
  // Do not print query parameters or row data from this connection.
  const code = "code" in error ? String(error.code) : error.name;
  console.error("[postgres] idle client error:", code, error.message);
});
