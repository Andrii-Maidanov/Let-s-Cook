import { Router } from "express";
import { listCategories, searchCatalog } from "../db/repository";
import { asyncHandler } from "../middleware/errors";
import { categoryQuerySchema, searchQuerySchema } from "../validation/schemas";

export const catalogRouter = Router();

catalogRouter.get("/categories", asyncHandler(async (request, response) => {
  const { kind } = categoryQuerySchema.parse(request.query);
  response.json(await listCategories(kind));
}));

catalogRouter.get("/search", asyncHandler(async (request, response) => {
  const { q, category } = searchQuerySchema.parse(request.query);
  response.json(await searchCatalog(q, category));
}));
