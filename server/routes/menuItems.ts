import { Router } from "express";
import { createMenuItem, deleteMenuItem, getMenuItem, listMenuItems } from "../db/repository";
import { asyncHandler, HttpError } from "../middleware/errors";
import { collectionQuerySchema, menuItemCreateSchema } from "../validation/schemas";
import { pathId } from "./params";

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

menuItemsRouter.post("/", asyncHandler(async (request, response) => {
  const input = menuItemCreateSchema.parse(request.body);
  response.status(201).json(await createMenuItem(input));
}));

menuItemsRouter.delete("/:id", asyncHandler(async (request, response) => {
  if (!await deleteMenuItem(pathId(request))) throw new HttpError(404, "Menu item not found");
  response.status(204).end();
}));
