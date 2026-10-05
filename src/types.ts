export type Language = "cs" | "ru" | "uk" | "en";
export type ItemKind = "recipe" | "dish";

export interface Ingredient {
  item: string;
  amount: string;
}

export interface Translation {
  name?: string;
  section?: string;
  station?: string;
  ingredients?: Ingredient[];
  steps?: string[];
  components?: string[];
  criticalPoints?: string[];
  servingNotes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  section: string;
  station: string;
  ingredients: Ingredient[];
  steps: string[];
  criticalPoints: string[];
  servingNotes: string;
  translations: Partial<Record<Language, Translation>>;
  photoUrl: string | null;
}

export interface Dish {
  id: string;
  name: string;
  section: string;
  components: string[];
  week?: string;
  note?: string;
  translations: Partial<Record<Language, Translation>>;
  photoUrl: string | null;
}

export interface Category {
  id?: string;
  kind: ItemKind;
  categoryKey: string;
  names: Record<Language, string>;
  sortOrder: number;
}

export interface AppData {
  recipes: Recipe[];
  menuItems: Dish[];
  categories: Category[];
}

export type RecipeInput = Omit<Recipe, "id"> & { id?: string };
export type DishInput = Omit<Dish, "id"> & { id?: string };
