import { z } from "zod";

const ingredientSchema = z.object({
  item: z.string(),
  amount: z.string(),
}).strict();

const translationSchema = z.object({
  name: z.string().optional(),
  section: z.string().optional(),
  station: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  criticalPoints: z.array(z.string()).optional(),
  servingNotes: z.string().optional(),
}).partial().passthrough();

const baseItemShape = {
  name: z.string().trim().min(1),
  section: z.string().nullable(),
  translations: z.record(z.string(), translationSchema).optional(),
  photoUrl: z.string().nullable().optional(),
};

export const recipeCreateSchema = z.object({
  ...baseItemShape,
  station: z.string().nullable(),
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  criticalPoints: z.array(z.string()),
  servingNotes: z.string().nullable(),
}).strict();

export const recipeUpdateSchema = recipeCreateSchema.partial().strict();

export const menuItemCreateSchema = z.object({
  ...baseItemShape,
  components: z.array(z.string()),
  week: z.string().nullable().optional(),
}).strict();

export const collectionQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

export const categoryQuerySchema = z.object({
  kind: z.enum(["recipe", "dish"]).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  category: z.string().optional(),
});
