import express from "express";
import { pool } from "./db/pool";
import { errorHandler, HttpError, notFoundHandler } from "./middleware/errors";
import { catalogRouter } from "./routes/catalog";
import { menuItemsRouter } from "./routes/menuItems";
import { recipesRouter } from "./routes/recipes";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch {
    response.status(503).json({ status: "unavailable", database: "disconnected" });
  }
});

app.use("/api", catalogRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/menu-items", menuItemsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
