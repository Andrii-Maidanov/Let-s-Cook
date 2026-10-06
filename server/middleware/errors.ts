import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

type AsyncHandler = Parameters<RequestHandler>[0] extends never ? never : (
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) => Promise<unknown>;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, `Route not found: ${request.method} ${request.path}`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: "Malformed JSON request body" });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Request validation failed",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Internal server error";
  const databaseCode = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;

  if (status >= 500) {
    console.error("[api]", request.method, request.path, databaseCode ?? "error", error instanceof Error ? error.message : "Unknown error");
  }
  response.status(status).json({ error: message });
};
