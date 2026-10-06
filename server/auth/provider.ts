/** Safe authenticated user projection; never includes password hashes or session IDs. */
export interface AuthenticatedUser {
  id: number;
  email: string;
  displayName: string;
  role: "admin" | "user";
}

export interface AuthProvider {
  authenticate(sessionCookie: string | null): Promise<AuthenticatedUser | null>;
  logout(sessionCookie: string | null): Promise<void>;
}
