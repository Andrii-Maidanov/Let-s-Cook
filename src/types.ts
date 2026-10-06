export type Language = "cs" | "ru" | "uk" | "en";
export type ItemKind = "recipe" | "dish";
export type UserRole = "admin" | "user";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

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

export type TranslationMap = Record<string, Translation | undefined>;

/** Application shape for public.app_categories (names is stored as JSONB). */
export interface Category {
  id: string;
  kind: string;
  categoryKey: string;
  names: Record<string, string>;
  sortOrder: number;
  createdAt: string;
}

/** Application shape for public.recipes; nullable columns mirror the SQL dump. */
export interface Recipe {
  id: string;
  name: string;
  section: string | null;
  station: string | null;
  ingredients: Ingredient[];
  steps: string[];
  criticalPoints: string[];
  servingNotes: string | null;
  updatedAt: string | null;
  notes: JsonValue;
  history: JsonValue;
  custom: boolean;
  sourceOrder: number;
  translations: TranslationMap;
  photoUrl: string | null;
}

/** Application shape for public.menu_items; fields follow the SQL dump. */
export interface Dish {
  id: string;
  name: string;
  section: string | null;
  components: string[];
  week: string | null;
  updatedAt: string | null;
  notes: JsonValue;
  history: JsonValue;
  custom: boolean;
  sourceOrder: number;
  translations: TranslationMap;
  photoUrl: string | null;
}

export interface UserRecord {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Internal-only row type. Never return password_hash in API responses. */
export interface UserPasswordRecord {
  id: number;
  userId: number;
  passwordHash: string;
  createdAt: string | null;
}

export interface SessionRecord {
  id: string;
  userId: number;
  createdAt: string | null;
  lastAccessed: string | null;
  expiresAt: string;
}

export interface LoginAttemptRecord {
  id: number;
  email: string;
  attemptedAt: string | null;
  success: boolean | null;
}

export interface AppData {
  recipes: Recipe[];
  menuItems: Dish[];
  categories: Category[];
}

export interface RecipeInput {
  name: string;
  section: string | null;
  station: string | null;
  ingredients: Ingredient[];
  steps: string[];
  criticalPoints: string[];
  servingNotes: string | null;
  translations?: TranslationMap;
  photoUrl?: string | null;
}

export interface DishInput {
  name: string;
  section: string | null;
  components: string[];
  week?: string | null;
  translations?: TranslationMap;
  photoUrl?: string | null;
}

export type DishUpdateInput = Partial<DishInput>;
