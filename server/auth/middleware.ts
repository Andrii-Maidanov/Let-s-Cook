import type { RequestHandler } from "express";
import { getSessionUser } from "./repository";
import { readSessionCookie } from "./cookie";
import { HttpError } from "../middleware/errors";
import { asyncHandler } from "../middleware/errors";

declare global {
  namespace Express {
    interface Request {
      authUser?: Awaited<ReturnType<typeof getSessionUser>>;
    }
  }
}

export const requireAuthentication: RequestHandler = asyncHandler(async (request, _response, next) => {
  const token = readSessionCookie(request);
  if (!token) throw new HttpError(401, "Authentication required");
  const user = await getSessionUser(token);
  if (!user) throw new HttpError(401, "Authentication required");
  request.authUser = user;
  next();
});

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.authUser || request.authUser.role !== "admin") {
    next(new HttpError(403, "Administrator access required"));
    return;
  }
  next();
};
