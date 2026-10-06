import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "lets_cook_session";
const maxAgeSeconds = Math.max(60, Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 30));

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    try { return decodeURIComponent(value) || null; } catch { return value || null; }
  }
  return null;
}

export function setSessionCookie(response: Response, token: string): void {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true") attributes.push("Secure");
  response.append("Set-Cookie", attributes.join("; "));
}

export function clearSessionCookie(response: Response): void {
  const attributes = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
  if (process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true") attributes.push("Secure");
  response.append("Set-Cookie", attributes.join("; "));
}
