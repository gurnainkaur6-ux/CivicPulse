/**
 * Browser-side auth helpers.
 *
 * All calls go through this app's own `/api/auth/*` routes: the server creates
 * the Appwrite session and stores the secret in an HttpOnly cookie, so every
 * later request to our API routes is authenticated automatically.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  labels?: string[];
  isAdmin?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return (data && typeof data.error === "string" && data.error) || fallback;
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const response = await postJson("/api/auth/signup", { email, password, name });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return { success: false, error: await readError(response, "Failed to create account") };
    }
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: "Failed to create account" };
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await postJson("/api/auth/login", { email, password });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return { success: false, error: await readError(response, "Invalid email or password") };
    }
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: "Invalid email or password" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Nothing to recover from — the cookie is cleared on the next login.
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
