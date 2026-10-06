import type { RecipeInput } from "../../src/types";

/** Extension point for a future local or explicitly approved recipe recognizer. */
export interface RecipeRecognitionProvider {
  extractRecipe(photo: Uint8Array, mimeType: string): Promise<RecipeInput>;
}
