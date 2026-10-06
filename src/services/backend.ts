import type { AppData, AuthUser, Category, Dish, DishInput, ItemKind, Recipe, RecipeInput, Translation } from "../types";

/**
 * Browser-side API boundary. The implementation is now the independent /api
 * service; photo recognition and automatic translation remain explicit stubs.
 */
export interface AppBackend {
  currentSession(): Promise<AuthUser | null>;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  load(search?: string, category?: string): Promise<AppData>;
  saveRecipe(input: RecipeInput, id?: string): Promise<Recipe>;
  saveDish(input: DishInput, id?: string): Promise<Dish>;
  deleteItem(kind: ItemKind, id: string): Promise<void>;
  translateAll(): Promise<{ translated: number }>;
  recipeFromPhoto(file: File): Promise<{ recipe: RecipeInput; note: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error ?? `API request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export const appBackend: AppBackend = {
  async currentSession() {
    const result = await request<{ user: AuthUser | null }>("/api/auth/session");
    return result.user;
  },
  async login(email, password) {
    const result = await request<{ user: AuthUser }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    return result.user;
  },
  async logout() {
    await request<void>("/api/auth/logout", { method: "POST" });
  },
  async load(search, category) {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (category) query.set("category", category);
    const categoriesQuery = request<Category[]>("/api/categories");
    if (search) {
      const [result, categories] = await Promise.all([
        request<{ recipes: Recipe[]; menuItems: Dish[] }>(`/api/search?${query.toString()}`),
        categoriesQuery,
      ]);
      return { recipes: result.recipes, menuItems: result.menuItems, categories };
    }
    const collectionQuery = category ? `?category=${encodeURIComponent(category)}` : "";
    const [recipes, menuItems, categories] = await Promise.all([
      request<Recipe[]>(`/api/recipes${collectionQuery}`),
      request<Dish[]>(`/api/menu-items${collectionQuery}`),
      categoriesQuery,
    ]);
    return { recipes, menuItems, categories };
  },
  saveRecipe(input, id) {
    return request<Recipe>(id ? `/api/recipes/${encodeURIComponent(id)}` : "/api/recipes", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(input),
    });
  },
  saveDish(input, id) {
    return request<Dish>(id ? `/api/menu-items/${encodeURIComponent(id)}` : "/api/menu-items", {
      method: id ? "PATCH" : "POST", body: JSON.stringify(input),
    });
  },
  async deleteItem(kind, id) {
    await request<void>(`/api/${kind === "recipe" ? "recipes" : "menu-items"}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async translateAll() {
    // No translation provider is connected in this migration stage.
    return { translated: 0 };
  },
  async recipeFromPhoto(file) {
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return {
      note: "Photo selected. Recipe recognition is not connected; fill the draft manually.",
      recipe: { name, section: "Dezerty", station: "", ingredients: [], steps: [], criticalPoints: [], servingNotes: "", photoUrl: null },
    };
  },
};

export function sourceTranslation(item: Recipe | Dish): Translation {
  if ("ingredients" in item) {
    return {
      name: item.name,
      ...(item.section ? { section: item.section } : {}),
      ...(item.station ? { station: item.station } : {}),
      ingredients: item.ingredients,
      steps: item.steps,
      criticalPoints: item.criticalPoints,
      ...(item.servingNotes ? { servingNotes: item.servingNotes } : {}),
    };
  }
  return { name: item.name, ...(item.section ? { section: item.section } : {}), components: item.components };
}
