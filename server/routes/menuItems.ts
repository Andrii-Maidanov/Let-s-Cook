import { Router } from "express";
import { createMenuItem, deleteMenuItem, getMenuItem, listMenuItems, updateMenuItem } from "../db/repository";
import { asyncHandler, HttpError } from "../middleware/errors";
import { collectionQuerySchema, menuItemCreateSchema, menuItemUpdateSchema } from "../validation/schemas";
import { pathId } from "./params";
import { requireAdmin } from "../auth/middleware";

export const menuItemsRouter = Router();

menuItemsRouter.get("/", asyncHandler(async (request, response) => {
  const query = collectionQuerySchema.parse(request.query);
  response.json(await listMenuItems(query));
}));

menuItemsRouter.get("/:id", asyncHandler(async (request, response) => {
  const item = await getMenuItem(pathId(request));
  if (!item) throw new HttpError(404, "Menu item not found");
  response.json(item);
}));

menuItemsRouter.post("/", requireAdmin, asyncHandler(async (request, response) => {
  const input = menuItemCreateSchema.parse(request.body);
  response.status(201).json(await createMenuItem(input));
}));

menuItemsRouter.put("/:id", requireAdmin, asyncHandler(async (request, response) => {
  const input = menuItemUpdateSchema.parse(request.body);
  const item = await updateMenuItem(pathId(request), input);
  if (!item) throw new HttpError(404, "Menu item not found");
  response.json(item);
}));

menuItemsRouter.patch("/:id", requireAdmin, asyncHandler(async (request, response) => {
  const input = menuItemUpdateSchema.parse(request.body);
  const item = await updateMenuItem(pathId(request), input);
  if (!item) throw new HttpError(404, "Menu item not found");
  response.json(item);
}));

menuItemsRouter.delete("/:id", requireAdmin, asyncHandler(async (request, response) => {
  if (!await deleteMenuItem(pathId(request))) throw new HttpError(404, "Menu item not found");
  response.status(204).end();
}));
