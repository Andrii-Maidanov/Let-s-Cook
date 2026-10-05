import type { AppData, Category, Dish, DishInput, ItemKind, Recipe, RecipeInput, Translation } from "../types";

/**
 * Client-side port for app data. The local adapter below is temporary; replace
 * this implementation with the PostgreSQL API adapter during the backend phase.
 */
export interface AppBackend {
  load(): Promise<AppData>;
  saveRecipe(input: RecipeInput): Promise<Recipe>;
  saveDish(input: DishInput): Promise<Dish>;
  deleteItem(kind: ItemKind, id: string): Promise<void>;
  translateAll(): Promise<{ translated: number }>;
  recipeFromPhoto(file: File): Promise<{ recipe: Omit<Recipe, "id">; note: string }>;
}

const storageKey = "lets-cook.frontend-preview.v1";
const fallbackCategories: Category[] = [
  { kind: "dish", categoryKey: "Dezerty", sortOrder: 1, names: { cs: "Dezerty", ru: "Десерты", uk: "Десерти", en: "Desserts" } },
  { kind: "dish", categoryKey: "Polévky", sortOrder: 2, names: { cs: "Polévky", ru: "Супы", uk: "Супи", en: "Soups" } },
  { kind: "dish", categoryKey: "Předkrmy", sortOrder: 3, names: { cs: "Předkrmy", ru: "Закуски", uk: "Закуски", en: "Starters" } },
  { kind: "dish", categoryKey: "Předkrmy vege", sortOrder: 4, names: { cs: "Předkrmy vege", ru: "Вегетарианские закуски", uk: "Вегетаріанські закуски", en: "Vegetarian starters" } },
  { kind: "dish", categoryKey: "Hlavní jídla", sortOrder: 5, names: { cs: "Hlavní jídla", ru: "Основные блюда", uk: "Основні страви", en: "Main courses" } },
  { kind: "dish", categoryKey: "Hlavní jídla ryba", sortOrder: 6, names: { cs: "Hlavní jídla ryba", ru: "Основные блюда · рыба", uk: "Основні страви · риба", en: "Main courses · fish" } },
  { kind: "dish", categoryKey: "Hlavní jídla vege", sortOrder: 7, names: { cs: "Hlavní jídla vege", ru: "Основные блюда · вегетарианские", uk: "Основні страви · вегетаріанські", en: "Main courses · vegetarian" } },
  { kind: "recipe", categoryKey: "Dezerty", sortOrder: 1, names: { cs: "Dezerty", ru: "Десерты", uk: "Десерти", en: "Desserts" } },
  { kind: "recipe", categoryKey: "Maso", sortOrder: 2, names: { cs: "Maso", ru: "Мясо", uk: "М’ясо", en: "Meat" } },
  { kind: "recipe", categoryKey: "Omáčky a základy", sortOrder: 3, names: { cs: "Omáčky a základy", ru: "Соусы и основы", uk: "Соуси та основи", en: "Sauces & bases" } },
  { kind: "recipe", categoryKey: "Přílohy", sortOrder: 4, names: { cs: "Přílohy", ru: "Гарниры", uk: "Гарніри", en: "Sides" } },
  { kind: "recipe", categoryKey: "Pekařina", sortOrder: 5, names: { cs: "Pekařina", ru: "Выпечка", uk: "Випічка", en: "Bakery" } },
  { kind: "recipe", categoryKey: "Gely", sortOrder: 6, names: { cs: "Gely", ru: "Гели", uk: "Гелі", en: "Gels" } },
  { kind: "recipe", categoryKey: "Krémy", sortOrder: 7, names: { cs: "Krémy", ru: "Кремы", uk: "Креми", en: "Creams" } },
  { kind: "recipe", categoryKey: "Pěny", sortOrder: 8, names: { cs: "Pěny", ru: "Пены", uk: "Піни", en: "Foams" } },
  { kind: "recipe", categoryKey: "Studená", sortOrder: 9, names: { cs: "Studená", ru: "Холодные", uk: "Холодні", en: "Cold" } },
  { kind: "recipe", categoryKey: "Teplá", sortOrder: 10, names: { cs: "Teplá", ru: "Тёплые", uk: "Теплі", en: "Hot" } },
  { kind: "recipe", categoryKey: "Zmrzliny a sorbety", sortOrder: 11, names: { cs: "Zmrzliny a sorbety", ru: "Мороженое и сорбеты", uk: "Морозиво та сорбети", en: "Ice creams & sorbets" } },
];

const sampleData: AppData = {
  categories: fallbackCategories,
  menuItems: [
    { id: "demo-dish-1", name: "Dýňová polévka", section: "Polévky", components: ["Pečená dýně", "Zázvorový olej"], translations: { ru: { name: "Тыквенный суп", components: ["Запечённая тыква", "Имбирное масло"] }, uk: { name: "Гарбузовий суп", components: ["Запечений гарбуз", "Імбирна олія"] }, en: { name: "Pumpkin soup", components: ["Roasted pumpkin", "Ginger oil"] } }, photoUrl: null },
    { id: "demo-dish-2", name: "Pečený květák", section: "Hlavní jídla vege", components: ["Květák", "Bylinkový jogurt"], translations: { ru: { name: "Запечённая цветная капуста", components: ["Цветная капуста", "Йогурт с травами"] }, uk: { name: "Запечена цвітна капуста", components: ["Цвітна капуста", "Йогурт із травами"] }, en: { name: "Roasted cauliflower", components: ["Cauliflower", "Herb yogurt"] } }, photoUrl: null },
  ],
  recipes: [
    { id: "demo-recipe-1", name: "Vanilkový krém", section: "Krémy", station: "Cukrářská", ingredients: [{ item: "Mléko", amount: "500 ml" }, { item: "Vanilka", amount: "1 ks" }, { item: "Žloutky", amount: "4 ks" }], steps: ["Mléko zahřejte s vanilkou.", "Žloutky vyšlehejte s cukrem a za stálého míchání spojte s mlékem.", "Povařte do zhoustnutí a rychle zchlaďte."], criticalPoints: ["Krém nepřiveďte k varu."], servingNotes: "", translations: { ru: { name: "Ванильный крем", ingredients: [{ item: "Молоко", amount: "500 мл" }, { item: "Ваниль", amount: "1 шт." }, { item: "Желтки", amount: "4 шт." }], steps: ["Нагрейте молоко с ванилью.", "Взбейте желтки с сахаром и постепенно соедините с молоком.", "Варите до загустения и быстро охладите."] }, uk: { name: "Ванільний крем" }, en: { name: "Vanilla custard" } }, photoUrl: null },
    { id: "demo-recipe-2", name: "Hovězí vývar", section: "Maso", station: "Teplá kuchyně", ingredients: [{ item: "Hovězí kosti", amount: "1 kg" }, { item: "Mrkev", amount: "2 ks" }, { item: "Cibule", amount: "1 ks" }], steps: ["Kosti opláchněte a vložte do studené vody.", "Pomalu přiveďte k varu a seberte pěnu.", "Přidejte zeleninu a zvolna táhněte 4 hodiny."], criticalPoints: [], servingNotes: "", translations: { ru: { name: "Говяжий бульон" }, uk: { name: "Яловичий бульйон" }, en: { name: "Beef stock" } }, photoUrl: null },
  ],
};

function readStore(): AppData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...sampleData, ...JSON.parse(raw) as Partial<AppData> };
  } catch {
    // A blocked or malformed browser store falls back to in-memory sample data.
  }
  return structuredClone(sampleData);
}

function persist(data: AppData) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // The interface remains usable for this tab when browser storage is full.
  }
}

function sourceTranslation(item: Recipe | Dish): Translation {
  if ("ingredients" in item) {
    return { name: item.name, section: item.section, station: item.station, ingredients: item.ingredients, steps: item.steps, criticalPoints: item.criticalPoints, servingNotes: item.servingNotes };
  }
  return { name: item.name, section: item.section, components: item.components };
}

export const appBackend: AppBackend = {
  async load() {
    return readStore();
  },
  async saveRecipe(input) {
    const data = readStore();
    const id = input.id ?? crypto.randomUUID();
    const item: Recipe = { ...input, id, translations: input.translations ?? {} };
    data.recipes = input.id ? data.recipes.map((r) => r.id === id ? item : r) : [...data.recipes, item];
    persist(data);
    return item;
  },
  async saveDish(input) {
    const data = readStore();
    const id = input.id ?? crypto.randomUUID();
    const item: Dish = { ...input, id, translations: input.translations ?? {} };
    data.menuItems = input.id ? data.menuItems.map((d) => d.id === id ? item : d) : [...data.menuItems, item];
    persist(data);
    return item;
  },
  async deleteItem(kind, id) {
    const data = readStore();
    if (kind === "recipe") data.recipes = data.recipes.filter((item) => item.id !== id);
    else data.menuItems = data.menuItems.filter((item) => item.id !== id);
    persist(data);
  },
  async translateAll() {
    // Translation UI stays wired to the adapter; automatic translation is a backend-phase integration.
    return { translated: 0 };
  },
  async recipeFromPhoto(file) {
    const suggestedName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return {
      note: "Photo selected. Automatic recipe recognition is not connected in this frontend preview; complete the draft manually.",
      recipe: {
        name: suggestedName,
        section: "Dezerty",
        station: "",
        ingredients: [],
        steps: [],
        criticalPoints: [],
        servingNotes: "",
        translations: {},
        photoUrl: null,
      },
    };
  },
};

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

export { fallbackCategories, sourceTranslation };
