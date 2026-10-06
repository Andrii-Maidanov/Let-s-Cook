import type { QueryResultRow } from "pg";
import { pool } from "./pool";
import type { Category, Dish, DishInput, ItemKind, Recipe, RecipeInput } from "../../src/types";

const recipeColumns = `
  id, name, section, station, ingredients, steps,
  critical_points AS "criticalPoints",
  serving_notes AS "servingNotes",
  updated_at AS "updatedAt",
  notes, history, custom,
  source_order AS "sourceOrder",
  translations, photo_url AS "photoUrl"
`;

const menuItemColumns = `
  id, name, section, components, week,
  updated_at AS "updatedAt",
  notes, history, custom,
  source_order AS "sourceOrder",
  translations, photo_url AS "photoUrl"
`;

const categoryColumns = `
  id, kind, category_key AS "categoryKey", names,
  sort_order AS "sortOrder",
  created_at AS "createdAt"
`;

function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function searchClause(alias: "r" | "m", parameter: number): string {
  const normalize = (expression: string) => `translate(lower(${expression}), 'áčďéěíňóřšťúůýž', 'acdeeinorstuuyz')`;
  const baseName = `${normalize(`${alias}.name`)} LIKE $${parameter + 1}`;
  const translatedNames = ["cs", "ru", "uk", "en"]
    .map((language) => `${normalize(`coalesce(${alias}.translations #>> '{${language},name}', '')`)} LIKE $${parameter + 1}`)
    .join(" OR ");
  return `($${parameter}::text IS NULL OR ${baseName} OR ${translatedNames})`;
}

function searchParameters(search?: string): [string | null, string] {
  const trimmed = search?.trim() ?? "";
  return trimmed ? [`%${trimmed.toLowerCase()}%`, `%${normalizeForSearch(trimmed)}%`] : [null, "%%"];
}

function rowCount(result: { rowCount: number | null }): number {
  return result.rowCount ?? 0;
}

export async function listRecipes(options: { search?: string; category?: string } = {}): Promise<Recipe[]> {
  const [search, normalizedSearch] = searchParameters(options.search);
  const category = options.category?.trim() || null;
  const result = await pool.query<QueryResultRow>(
    `SELECT ${recipeColumns}
       FROM public.recipes r
      WHERE ($1::text IS NULL OR r.section = $1)
        AND ${searchClause("r", 2)}
      ORDER BY r.source_order, r.name`,
    [category, search, normalizedSearch],
  );
  return result.rows as Recipe[];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const result = await pool.query<QueryResultRow>(`SELECT ${recipeColumns} FROM public.recipes WHERE id = $1`, [id]);
  return (result.rows[0] as Recipe | undefined) ?? null;
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const result = await pool.query<QueryResultRow>(
    `INSERT INTO public.recipes (
       id, name, section, station, ingredients, steps, critical_points,
       serving_notes, updated_at, notes, history, custom, source_order,
       translations, photo_url
     )
     VALUES (
       $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9,
       '[]'::jsonb, '[]'::jsonb, true,
       (SELECT coalesce(max(source_order), 0) + 1 FROM public.recipes),
       $10::jsonb, $11
     )
     RETURNING ${recipeColumns}`,
    [
      crypto.randomUUID(), input.name, input.section, input.station,
      JSON.stringify(input.ingredients), JSON.stringify(input.steps),
      JSON.stringify(input.criticalPoints), input.servingNotes, new Date().toISOString(),
      JSON.stringify(input.translations ?? {}), input.photoUrl ?? null,
    ],
  );
  return result.rows[0] as Recipe;
}

const recipeUpdateColumns: Record<keyof RecipeInput, string> = {
  name: "name",
  section: "section",
  station: "station",
  ingredients: "ingredients",
  steps: "steps",
  criticalPoints: "critical_points",
  servingNotes: "serving_notes",
  translations: "translations",
  photoUrl: "photo_url",
};

const jsonRecipeFields = new Set<keyof RecipeInput>(["ingredients", "steps", "criticalPoints", "translations"]);

export async function updateRecipe(id: string, input: Partial<RecipeInput>): Promise<Recipe | null> {
  const keys = Object.keys(input) as (keyof RecipeInput)[];
  if (keys.length === 0) return getRecipe(id);
  const values: unknown[] = [id];
  const assignments = keys.map((key) => {
    values.push(jsonRecipeFields.has(key) ? JSON.stringify(input[key]) : input[key]);
    const placeholder = `$${values.length}${jsonRecipeFields.has(key) ? "::jsonb" : ""}`;
    return `${recipeUpdateColumns[key]} = ${placeholder}`;
  });
  values.push(new Date().toISOString());
  assignments.push(`updated_at = $${values.length}`);
  const result = await pool.query<QueryResultRow>(
    `UPDATE public.recipes SET ${assignments.join(", ")} WHERE id = $1 RETURNING ${recipeColumns}`,
    values,
  );
  return (result.rows[0] as Recipe | undefined) ?? null;
}

export async function deleteRecipe(id: string): Promise<boolean> {
  return rowCount(await pool.query("DELETE FROM public.recipes WHERE id = $1", [id])) > 0;
}

export async function listMenuItems(options: { search?: string; category?: string } = {}): Promise<Dish[]> {
  const [search, normalizedSearch] = searchParameters(options.search);
  const category = options.category?.trim() || null;
  const result = await pool.query<QueryResultRow>(
    `SELECT ${menuItemColumns}
       FROM public.menu_items m
      WHERE ($1::text IS NULL OR m.section = $1)
        AND ${searchClause("m", 2)}
      ORDER BY m.source_order, m.name`,
    [category, search, normalizedSearch],
  );
  return result.rows as Dish[];
}

export async function getMenuItem(id: string): Promise<Dish | null> {
  const result = await pool.query<QueryResultRow>(`SELECT ${menuItemColumns} FROM public.menu_items WHERE id = $1`, [id]);
  return (result.rows[0] as Dish | undefined) ?? null;
}

export async function createMenuItem(input: DishInput): Promise<Dish> {
  const result = await pool.query<QueryResultRow>(
    `INSERT INTO public.menu_items (
       id, name, section, components, week, updated_at, notes, history,
       custom, source_order, translations, photo_url
     )
     VALUES (
       $1, $2, $3, $4::jsonb, $5, $6, '[]'::jsonb, '[]'::jsonb,
       true, (SELECT coalesce(max(source_order), 0) + 1 FROM public.menu_items),
       $7::jsonb, $8
     )
     RETURNING ${menuItemColumns}`,
    [
      crypto.randomUUID(), input.name, input.section, JSON.stringify(input.components),
      input.week ?? null, new Date().toISOString(), JSON.stringify(input.translations ?? {}),
      input.photoUrl ?? null,
    ],
  );
  return result.rows[0] as Dish;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  return rowCount(await pool.query("DELETE FROM public.menu_items WHERE id = $1", [id])) > 0;
}

export async function listCategories(kind?: ItemKind): Promise<Category[]> {
  const result = await pool.query<QueryResultRow>(
    `SELECT ${categoryColumns} FROM public.app_categories
      WHERE ($1::text IS NULL OR kind = $1)
      ORDER BY kind, sort_order, category_key`,
    [kind ?? null],
  );
  return result.rows as Category[];
}

export async function searchCatalog(search: string, category?: string) {
  const [recipes, menuItems] = await Promise.all([
    listRecipes({ search, category }),
    listMenuItems({ search, category }),
  ]);
  return { recipes, menuItems };
}
