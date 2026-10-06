import { Router } from "express";
import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from "../db/repository";
import { asyncHandler, HttpError } from "../middleware/errors";
import { pathId } from "./params";
import { collectionQuerySchema, recipeCreateSchema, recipeUpdateSchema } from "../validation/schemas";
import { requireAdmin } from "../auth/middleware";

export const recipesRouter = Router();

recipesRouter.get("/", asyncHandler(async (request, response) => {
  const query = collectionQuerySchema.parse(request.query);
  response.json(await listRecipes(query));
}));

recipesRouter.get("/:id", asyncHandler(async (request, response) => {
  const recipe = await getRecipe(pathId(request));
  if (!recipe) throw new HttpError(404, "Recipe not found");
  response.json(recipe);
}));

recipesRouter.post("/", requireAdmin, asyncHandler(async (request, response) => {
  const input = recipeCreateSchema.parse(request.body);
  response.status(201).json(await createRecipe(input));
}));

recipesRouter.put("/:id", requireAdmin, asyncHandler(async (request, response) => {
  const input = recipeUpdateSchema.parse(request.body);
  const recipe = await updateRecipe(pathId(request), input);
  if (!recipe) throw new HttpError(404, "Recipe not found");
  response.json(recipe);
}));

recipesRouter.patch("/:id", requireAdmin, asyncHandler(async (request, response) => {
  const input = recipeUpdateSchema.parse(request.body);
  const recipe = await updateRecipe(pathId(request), input);
  if (!recipe) throw new HttpError(404, "Recipe not found");
  response.json(recipe);
}));

recipesRouter.delete("/:id", requireAdmin, asyncHandler(async (request, response) => {
  if (!await deleteRecipe(pathId(request))) throw new HttpError(404, "Recipe not found");
  response.status(204).end();
}));
