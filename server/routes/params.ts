import type { Request } from "express";
import { HttpError } from "../middleware/errors";

export function pathId(request: Request): string {
  const id = request.params.id;
  if (typeof id !== "string" || !id) throw new HttpError(400, "A resource ID is required");
  return id;
}
