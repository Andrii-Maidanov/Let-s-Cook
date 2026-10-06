/**
 * Production authentication is intentionally not configured in this stage.
 * Future providers can implement this boundary without changing recipe routes.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  displayName: string;
  role: "admin" | "user";
}

export interface AuthProvider {
  authenticate(authorizationHeader: string | undefined): Promise<AuthenticatedUser | null>;
  logout(sessionId: string): Promise<void>;
}
