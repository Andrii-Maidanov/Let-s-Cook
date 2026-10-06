import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler, HttpError } from "../middleware/errors";
import { loginSchema } from "../validation/schemas";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../auth/cookie";
import { createSession, deleteSession, findPasswordCredential, getSessionUser, recentFailedAttempts, recordLoginAttempt } from "../auth/repository";

export const authRouter = Router();
const sessionTtlSeconds = Math.max(60, Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 30));
const dummyHash = bcrypt.hash("letscook-invalid-user-timing-padding", 10);

function publicUser(user: { id: number; email: string; displayName: string; avatarUrl: string | null; role: "admin" | "user" }) {
  return { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role };
}

authRouter.post("/login", asyncHandler(async (request, response) => {
  let stage = "validation";
  try {
    const { email, password } = loginSchema.parse(request.body);
    stage = "rate-limit";
    if (await recentFailedAttempts(email) >= 10) throw new HttpError(429, "Too many failed login attempts. Try again later.");

    stage = "credential-query";
    const credential = await findPasswordCredential(email);
    stage = "password-verification";
    const matches = await bcrypt.compare(password, credential?.passwordHash ?? await dummyHash);
    if (!credential || !matches) {
      stage = "record-failed-attempt";
      await recordLoginAttempt(email, false);
      clearSessionCookie(response);
      throw new HttpError(401, "Invalid email or password");
    }

    stage = "record-successful-attempt";
    await recordLoginAttempt(email, true);
    const oldToken = readSessionCookie(request);
    if (oldToken) { stage = "replace-existing-session"; await deleteSession(oldToken); }
    stage = "create-session";
    const token = await createSession(credential.user.id, sessionTtlSeconds);
    stage = "set-cookie";
    setSessionCookie(response, token);
    stage = "serialize-user";
    response.json({ user: publicUser(credential.user) });
  } catch (error) {
    if (!(error instanceof HttpError && error.status < 500)) {
      console.error("[auth] login failed at", stage, error instanceof Error ? error.name : typeof error);
    }
    throw error;
  }
}));

authRouter.get("/session", asyncHandler(async (request, response) => {
  const token = readSessionCookie(request);
  if (!token) {
    response.json({ user: null });
    return;
  }
  const user = await getSessionUser(token);
  if (!user) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }
  response.json({ user: publicUser(user) });
}));

authRouter.post("/logout", asyncHandler(async (request, response) => {
  const token = readSessionCookie(request);
  if (token) await deleteSession(token);
  clearSessionCookie(response);
  response.status(204).end();
}));
