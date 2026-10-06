import "dotenv/config";
import app from "./app";
import { pool } from "./db/pool";

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "127.0.0.1";
const server = app.listen(port, host, () => {
  console.log(`LET’S COOK API listening on http://${host}:${port}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; closing API and database pool.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
