import { randomBytes } from "node:crypto";
import type { QueryResultRow } from "pg";
import { pool } from "../db/pool";
import type { AuthenticatedUser } from "./provider";

export interface PasswordCredential {
  user: AuthenticatedUser & { avatarUrl: string | null };
  passwordHash: string;
}

export async function findPasswordCredential(email: string): Promise<PasswordCredential | null> {
  const result = await pool.query<QueryResultRow>(
    `SELECT u.id, u.email, u.display_name AS "displayName", u.avatar_url AS "avatarUrl", u.role,
            p.password_hash AS "passwordHash"
       FROM public.users u
       JOIN public.user_passwords p ON p.user_id = u.id
      WHERE lower(u.email) = lower($1)
      LIMIT 1`,
    [email.trim()],
  );
  const row = result.rows[0] as (AuthenticatedUser & { avatarUrl: string | null; passwordHash: string }) | undefined;
  if (!row) return null;
  return {
    user: {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      role: row.role,
    },
    passwordHash: row.passwordHash,
  };
}

export async function recentFailedAttempts(email: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM public.login_attempts
      WHERE lower(email) = lower($1)
        AND success = false
        AND attempted_at > now() - interval '15 minutes'`,
    [email.trim()],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO public.login_attempts (email, attempted_at, success)
     VALUES ($1, now(), $2)`,
    [email.trim().slice(0, 255), success],
  );
}

export async function createSession(userId: number, ttlSeconds: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    `INSERT INTO public.sessions (id, user_id, created_at, last_accessed, expires_at)
     VALUES ($1, $2, now(), now(), now() + ($3::text || ' seconds')::interval)`,
    [token, userId, ttlSeconds],
  );
  return token;
}

export async function getSessionUser(token: string): Promise<(AuthenticatedUser & { avatarUrl: string | null }) | null> {
  const result = await pool.query<QueryResultRow>(
    `UPDATE public.sessions
        SET last_accessed = now()
      WHERE id = $1 AND expires_at > now()
      RETURNING user_id`,
    [token],
  );
  if (!result.rows[0]) {
    await pool.query("DELETE FROM public.sessions WHERE id = $1 AND expires_at <= now()", [token]);
    return null;
  }
  const user = await pool.query<QueryResultRow>(
    `SELECT id, email, display_name AS "displayName", avatar_url AS "avatarUrl", role
       FROM public.users WHERE id = $1`,
    [result.rows[0].user_id],
  );
  return (user.rows[0] as (AuthenticatedUser & { avatarUrl: string | null }) | undefined) ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query("DELETE FROM public.sessions WHERE id = $1", [token]);
}
