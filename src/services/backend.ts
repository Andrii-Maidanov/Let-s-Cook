import type { AppData, Category, Dish, DishInput, ItemKind, Recipe, RecipeInput, Translation } from "../types";

/**
 * Browser-side API boundary. The implementation is now the independent /api
 * service; photo recognition and automatic translation remain explicit stubs.
 */
export interface AppBackend {
  load(): Promise<AppData>;
  saveRecipe(input: RecipeInput, id?: string): Promise<Recipe>;
  saveDish(input: DishInput): Promise<Dish>;
  deleteItem(kind: ItemKind, id: string): Promise<void>;
  translateAll(): Promise<{ translated: number }>;
  recipeFromPhoto(file: File): Promise<{ recipe: RecipeInput; note: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
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
  async load() {
    const [recipes, menuItems, categories] = await Promise.all([
      request<Recipe[]>("/api/recipes"),
      request<Dish[]>("/api/menu-items"),
      request<Category[]>("/api/categories"),
    ]);
    return { recipes, menuItems, categories };
  },
  saveRecipe(input, id) {
    return request<Recipe>(id ? `/api/recipes/${encodeURIComponent(id)}` : "/api/recipes", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(input),
    });
  },
  saveDish(input) {
    return request<Dish>("/api/menu-items", { method: "POST", body: JSON.stringify(input) });
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

export const mockAdminSession = {
  get(): boolean {
    return localStorage.getItem("lets-cook.preview-session") !== "signed-out";
  },
  async logout(): Promise<void> {
    localStorage.setItem("lets-cook.preview-session", "signed-out");
  },
  async continuePreview(): Promise<void> {
    localStorage.removeItem("lets-cook.preview-session");
  },
};
