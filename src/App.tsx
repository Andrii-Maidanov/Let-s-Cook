import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { appBackend, fallbackCategories, mockAdminSession, sourceTranslation } from "./services/backend";
import type { AppData, Category, Dish, DishInput, Ingredient, ItemKind, Language, Recipe, RecipeInput, Translation } from "./types";
import styles from "./App.module.css";

type Tab = "home" | "dishes" | "recipes";
type FormMode = "recipe" | "dish" | "edit-recipe" | null;

const UI: Record<Language, Record<string, string>> = {
  cs: { home: "Domů", dishes: "Jídla", recipes: "Recepty", search: "Hledat jídlo nebo recept…", addDish: "＋ Přidat jídlo", addRecipe: "＋ Přidat recept", photoRecipe: "📷 Recept z fotky", photoProcessing: "📷 Připravuji…", translate: "Přeložit", back: "← Zpět", ingredients: "Ingredience", technology: "Technologie", components: "Komponenty", print: "Tisk", printAll: "Tisk celé databáze", categories: "KATEGORIE", newRecipe: "Nový recept", newDish: "Nové jídlo", editRecipe: "Upravit recept", editDish: "Upravit jídlo", cancel: "Zrušit", name: "Název", station: "Stanice", save: "Uložit", logout: "Odhlásit", delete: "Smazat", confirm: "Opravdu chcete tuto položku smazat?", translateConfirm: "Přeložit celou databázi do ruštiny, ukrajinštiny a angličtiny?", loading: "Načítám databázi…", signedOut: "Náhled odhlášen", continue: "Pokračovat do náhledu", all: "Vše", searchHint: "Výsledky hledání", critical: "KRITICKÉ BODY", service: "PEČENÍ / SERVIS" },
  ru: { home: "Главная", dishes: "Блюда", recipes: "Рецепты", search: "Поиск блюда или рецепта…", addDish: "＋ Добавить блюдо", addRecipe: "＋ Добавить рецепт", photoRecipe: "📷 Рецепт по фото", photoProcessing: "📷 Подготовка…", translate: "Перевести", back: "← Назад", ingredients: "Ингредиенты", technology: "Технология", components: "Компоненты", print: "Печать", printAll: "Печать всей базы", categories: "КАТЕГОРИИ", newRecipe: "Новый рецепт", newDish: "Новое блюдо", editRecipe: "Редактировать рецепт", editDish: "Редактировать блюдо", cancel: "Отмена", name: "Название", station: "Станция", save: "Сохранить", logout: "Выйти", delete: "Удалить", confirm: "Точно удалить этот объект?", translateConfirm: "Перевести всю базу на русский, украинский и английский?", loading: "Загружаю базу…", signedOut: "Вы вышли из предпросмотра", continue: "Продолжить в предпросмотре", all: "Все", searchHint: "Результаты поиска", critical: "КРИТИЧЕСКИЕ МОМЕНТЫ", service: "ВЫПЕЧКА / СЕРВИС" },
  uk: { home: "Головна", dishes: "Страви", recipes: "Рецепти", search: "Пошук страви або рецепта…", addDish: "＋ Додати страву", addRecipe: "＋ Додати рецепт", photoRecipe: "📷 Рецепт за фото", photoProcessing: "📷 Підготовка…", translate: "Перекласти", back: "← Назад", ingredients: "Інгредієнти", technology: "Технологія", components: "Компоненти", print: "Друк", printAll: "Друк усієї бази", categories: "КАТЕГОРІЇ", newRecipe: "Новий рецепт", newDish: "Нова страва", editRecipe: "Редагувати рецепт", editDish: "Редагувати страву", cancel: "Скасувати", name: "Назва", station: "Станція", save: "Зберегти", logout: "Вийти", delete: "Видалити", confirm: "Точно видалити цей об'єкт?", translateConfirm: "Перекласти всю базу російською, українською та англійською?", loading: "Завантажую базу…", signedOut: "Ви вийшли з попереднього перегляду", continue: "Продовжити попередній перегляд", all: "Усі", searchHint: "Результати пошуку", critical: "КРИТИЧНІ МОМЕНТИ", service: "ВИПІКАННЯ / СЕРВІС" },
  en: { home: "Home", dishes: "Dishes", recipes: "Recipes", search: "Search dish or recipe…", addDish: "＋ Add dish", addRecipe: "＋ Add recipe", photoRecipe: "📷 Recipe from photo", photoProcessing: "📷 Preparing…", translate: "Translate", back: "← Back", ingredients: "Ingredients", technology: "Technology", components: "Components", print: "Print", printAll: "Print entire database", categories: "CATEGORIES", newRecipe: "New recipe", newDish: "New dish", editRecipe: "Edit recipe", editDish: "Edit dish", cancel: "Cancel", name: "Name", station: "Station", save: "Save", logout: "Log out", delete: "Delete", confirm: "Delete this item?", translateConfirm: "Translate the entire database into Russian, Ukrainian and English?", loading: "Loading database…", signedOut: "Preview signed out", continue: "Continue to preview", all: "All", searchHint: "Search results", critical: "CRITICAL POINTS", service: "BAKING / SERVICE" },
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const emptyData: AppData = { recipes: [], menuItems: [], categories: fallbackCategories };

export default function App() {
  const [signedIn, setSignedIn] = useState(() => mockAdminSession.get());
  const [lang, setLang] = useState<Language>("ru");
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [name, setName] = useState("");
  const [section, setSection] = useState("Dezerty");
  const [station, setStation] = useState("");
  const [components, setComponents] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [criticalPoints, setCriticalPoints] = useState("");
  const [servingNotes, setServingNotes] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState<"all" | "category" | "current" | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const t = UI[lang];

  useEffect(() => {
    appBackend.load().then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load preview data")).finally(() => setLoaded(true));
  }, []);

  const tr = (item: Recipe | Dish): Translation => {
    const base = sourceTranslation(item);
    return lang === "cs" ? base : { ...base, ...(item.translations?.[lang] ?? {}) };
  };
  const categoryOptions = (kind: ItemKind) => data.categories.filter((item) => item.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder);
  const q = normalize(query);
  const filteredRecipes = useMemo(() => data.recipes.filter((item) => !q || [item.name, ...Object.values(item.translations).map((translation) => translation?.name ?? "")].some((value) => normalize(value).includes(q))), [data.recipes, q]);
  const filteredDishes = useMemo(() => data.menuItems.filter((item) => !q || [item.name, ...Object.values(item.translations).map((translation) => translation?.name ?? "")].some((value) => normalize(value).includes(q))), [data.menuItems, q]);
  const categoryDishes = useMemo(() => (category === "Все" ? filteredDishes : filteredDishes.filter((item) => item.section === category)).slice().sort((a, b) => (tr(a).name ?? a.name).localeCompare(tr(b).name ?? b.name, lang)), [category, filteredDishes, lang]);
  const categoryRecipes = useMemo(() => (category === "Все" ? filteredRecipes : filteredRecipes.filter((item) => item.section === category)).slice().sort((a, b) => (tr(a).name ?? a.name).localeCompare(tr(b).name ?? b.name, lang)), [category, filteredRecipes, lang]);

  const resetForm = () => {
    setFormMode(null); setName(""); setSection("Dezerty"); setStation(""); setComponents("");
    setIngredients(""); setSteps(""); setCriticalPoints(""); setServingNotes(""); setSaving(false); setError("");
  };
  const openTab = (next: "dishes" | "recipes") => {
    setTab(next); setCategory("Все"); setSelectedDish(null); setSelectedRecipe(null); resetForm();
  };
  const beginEditRecipe = (recipe: Recipe) => {
    setFormMode("edit-recipe"); setName(recipe.name); setSection(recipe.section); setStation(recipe.station);
    setIngredients(recipe.ingredients.map((item) => `${item.item}|${item.amount}`).join("\n"));
    setSteps(recipe.steps.join("\n")); setCriticalPoints(recipe.criticalPoints.join("\n")); setServingNotes(recipe.servingNotes);
  };
  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(lang === "cs" ? "Vyberte obrázek" : lang === "uk" ? "Виберіть зображення" : lang === "en" ? "Choose an image" : "Выберите изображение"); return; }
    setPhotoBusy(true); setError("");
    try {
      const draft = await appBackend.recipeFromPhoto(file);
      setFormMode("recipe"); setName(draft.recipe.name); setSection(draft.recipe.section); setStation(draft.recipe.station);
      setIngredients(""); setSteps(""); setCriticalPoints(""); setServingNotes("");
      setError(draft.note);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare the photo");
    } finally { setPhotoBusy(false); }
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      if (formMode === "recipe" || formMode === "edit-recipe") {
        const old = formMode === "edit-recipe" ? selectedRecipe : null;
        const input: RecipeInput = {
          id: old?.id, name: name.trim(), section, station: station.trim(),
          ingredients: ingredients.split("\n").filter(Boolean).map((line): Ingredient => { const [item, ...amount] = line.split("|"); return { item: item.trim(), amount: amount.join("|").trim() }; }),
          steps: steps.split("\n").map((line) => line.trim()).filter(Boolean),
          criticalPoints: criticalPoints.split("\n").map((line) => line.trim()).filter(Boolean),
          servingNotes: servingNotes.trim(), translations: old?.translations ?? {}, photoUrl: old?.photoUrl ?? null,
        };
        const saved = await appBackend.saveRecipe(input);
        setData((current) => ({ ...current, recipes: input.id ? current.recipes.map((item) => item.id === saved.id ? saved : item) : [...current.recipes, saved] }));
        setSelectedRecipe(saved); setSelectedDish(null); setTab("recipes"); setFormMode(null);
      } else {
        const input: DishInput = {
          name: name.trim(), section,
          components: components.split("\n").map((line) => line.trim()).filter(Boolean),
          translations: {}, photoUrl: null,
        };
        const saved = await appBackend.saveDish(input);
        setData((current) => ({ ...current, menuItems: input.id ? current.menuItems.map((item) => item.id === saved.id ? saved : item) : [...current.menuItems, saved] }));
        setSelectedDish(saved); setSelectedRecipe(null); setTab("dishes"); setFormMode(null);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (kind: ItemKind, id: string) => {
    if (!window.confirm(t.confirm)) return;
    try {
      await appBackend.deleteItem(kind, id);
      setData((current) => kind === "recipe" ? { ...current, recipes: current.recipes.filter((item) => item.id !== id) } : { ...current, menuItems: current.menuItems.filter((item) => item.id !== id) });
      setSelectedRecipe(null); setSelectedDish(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed"); }
  };

  const translateAll = async () => {
    if (translationBusy || !window.confirm(t.translateConfirm)) return;
    setTranslationBusy(true); setError("");
    try {
      const result = await appBackend.translateAll();
      setError(result.translated ? `${result.translated}` : (lang === "cs" ? "Automatický překlad není v samostatném náhledu připojen." : lang === "uk" ? "Автоматичний переклад не підключений у цьому окремому попередньому перегляді." : lang === "en" ? "Automatic translation is not connected in this standalone preview." : "Автоматический перевод не подключён в этом автономном предпросмотре."));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Translation failed"); }
    finally { setTranslationBusy(false); }
  };

  const back = () => {
    if (formMode) { resetForm(); return; }
    if (selectedRecipe) setSelectedRecipe(null);
    else if (selectedDish) setSelectedDish(null);
    else if (tab !== "home") { setTab("home"); setCategory("Все"); }
    else window.history.back();
  };
  const recipeView = selectedRecipe ? tr(selectedRecipe) : null;
  const dishView = selectedDish ? tr(selectedDish) : null;
  const onTouchStart = (event: React.TouchEvent) => setTouchX(event.changedTouches[0]?.clientX ?? null);
  const onTouchEnd = (event: React.TouchEvent) => { if (touchX !== null && event.changedTouches[0].clientX - touchX > 70) back(); setTouchX(null); };

  useEffect(() => {
    if (!printMode) return;
    const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const recipeHtml = (recipe: Recipe) => {
      const translated = tr(recipe);
      const list = translated.ingredients ?? recipe.ingredients;
      const instructions = translated.steps ?? recipe.steps;
      return `<article><h1>${esc(translated.name)}</h1><h2>${esc(t.ingredients)}</h2>${list.map((item) => `<div class="row"><span>${esc(item.item)}</span><b>${esc(item.amount)}</b></div>`).join("")}<h2>${esc(t.technology)}</h2><ol>${instructions.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></article>`;
    };
    const dishHtml = (dish: Dish) => {
      const translated = tr(dish);
      return `<article><h1>${esc(translated.name)}</h1><h2>${esc(t.components)}</h2>${(translated.components ?? dish.components).map((item) => `<div class="component">${esc(item)}</div>`).join("")}</article>`;
    };
    let title = "LET’S COOK"; let body = "";
    if (printMode === "current" && selectedRecipe) { title = recipeView?.name ?? selectedRecipe.name; body = recipeHtml(selectedRecipe); }
    else if (printMode === "current" && selectedDish) { title = dishView?.name ?? selectedDish.name; body = dishHtml(selectedDish); }
    else if (printMode === "category" && tab === "recipes") { title = category === "Все" ? t.recipes : categoryOptions("recipe").find((item) => item.categoryKey === category)?.names[lang] ?? category; body = categoryRecipes.map(recipeHtml).join(""); }
    else if (printMode === "category" && tab === "dishes") { title = category === "Все" ? t.dishes : categoryOptions("dish").find((item) => item.categoryKey === category)?.names[lang] ?? category; body = categoryDishes.map(dishHtml).join(""); }
    else if (printMode === "all") { body = `<h1>LET’S COOK</h1><h2>${esc(t.dishes)}</h2>${data.menuItems.map(dishHtml).join("")}<h2>${esc(t.recipes)}</h2>${data.recipes.map(recipeHtml).join("")}`; }
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#111;font:12pt/1.4 Arial,sans-serif}h1{font-size:28px}h2{font-size:15px;text-transform:uppercase;margin:24px 0 9px}.row{display:flex;justify-content:space-between;gap:20px;padding:7px 0;border-bottom:1px solid #ddd}.component{padding:7px 0;border-bottom:1px solid #ddd}article{break-inside:avoid;border-bottom:1px solid #ccc;padding:0 0 12px;margin:0 0 18px}</style></head><body><main>${body}</main></body></html>`);
      win.document.close(); setTimeout(() => { win.focus(); win.print(); win.onafterprint = () => win.close(); }, 250);
    }
    setPrintMode(null);
  }, [printMode, selectedRecipe, selectedDish, tab, category, lang, data, categoryRecipes, categoryDishes]);

  if (!signedIn) return <div className={styles.signedOut}><div className={styles.loginCard}><div className={styles.logo}>LET’S<br /><span>COOK</span></div><h1>{t.signedOut}</h1><p>Frontend preview uses a temporary local admin session.</p><Button className={styles.saveButton} onClick={() => void mockAdminSession.continuePreview().then(() => setSignedIn(true))}>{t.continue}</Button></div></div>;

  return <div className={styles.app} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <nav className={styles.nav}>
      <button onClick={() => { setTab("home"); setCategory("Все"); setSelectedDish(null); setSelectedRecipe(null); resetForm(); }}>⌂<span>{t.home}</span></button>
      <button onClick={() => openTab("dishes")}>▦<span>{t.dishes}</span></button>
      <button onClick={() => openTab("recipes")}>☷<span>{t.recipes}</span></button>
      <select className={styles.languageSelect} value={lang} onChange={(event) => setLang(event.target.value as Language)} aria-label="Language"><option value="cs">CS</option><option value="ru">RU</option><option value="uk">UK</option><option value="en">EN</option></select>
    </nav>
    <header className={styles.header}>
      <div className={styles.brand}><div className={styles.logo}><span>LET’S</span><span>COOK</span></div></div>
      <div className={styles.headerRight}><div className={styles.count}>{data.recipes.length} · {data.menuItems.length}</div><button className={styles.translateButton} disabled={translationBusy} onClick={() => void translateAll()}>{translationBusy ? "🌐 …" : `🌐 ${t.translate}`}</button><button className={styles.logoutButton} onClick={() => void mockAdminSession.logout().then(() => setSignedIn(false))}>{t.logout}</button></div>
    </header>
    <main className={tab === "dishes" || tab === "recipes" ? styles.mainDark : styles.main}>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />
      {!loaded && <div className={styles.loading}>{t.loading}</div>}
      {error && <div className={styles.error} role="status">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {!selectedRecipe && !selectedDish && <div className={styles.addBar}>
        <button className={styles.addButton} onClick={() => { resetForm(); setFormMode("dish"); setSection(categoryOptions("dish")[0]?.categoryKey ?? "Dezerty"); }}>{t.addDish}</button>
        <button className={styles.addButton} onClick={() => { resetForm(); setFormMode("recipe"); setSection(categoryOptions("recipe")[0]?.categoryKey ?? "Dezerty"); }}>{t.addRecipe}</button>
        <button className={styles.addButton} onClick={() => photoInput.current?.click()} disabled={photoBusy}>{photoBusy ? t.photoProcessing : t.photoRecipe}</button>
        {tab === "home" && <button className={styles.addButton} onClick={() => setPrintMode("all")}>🖨 {t.printAll}</button>}
        <input ref={photoInput} type="file" accept="image/*" onChange={handlePhoto} hidden />
      </div>}
      {formMode && <section className={styles.formCard}>
        <div className={styles.formHead}><h2>{formMode === "recipe" ? t.newRecipe : formMode === "edit-recipe" ? t.editRecipe : t.newDish}</h2><button type="button" aria-label="Close" onClick={resetForm}>×</button></div>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.name} />
        <label className={styles.fieldLabel}>{t.categories}<select className={styles.select} value={section} onChange={(event) => setSection(event.target.value)}>{categoryOptions(formMode === "dish" ? "dish" : "recipe").map((item: Category) => <option key={item.categoryKey} value={item.categoryKey}>{item.names[lang] ?? item.categoryKey}</option>)}</select></label>
        {formMode === "dish"
          ? <textarea className={styles.textarea} value={components} onChange={(event) => setComponents(event.target.value)} placeholder={t.components} />
          : <><Input value={station} onChange={(event) => setStation(event.target.value)} placeholder={t.station} /><textarea className={styles.textarea} value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="item|amount" /><textarea className={styles.textarea} value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={t.technology} /><textarea className={styles.textarea} value={criticalPoints} onChange={(event) => setCriticalPoints(event.target.value)} placeholder={t.critical} /><textarea className={styles.textarea} value={servingNotes} onChange={(event) => setServingNotes(event.target.value)} placeholder={t.service} /></>}
        <div className={styles.formActions}><button type="button" className={styles.cancelButton} onClick={resetForm}>{t.cancel}</button><button type="button" className={styles.saveButton} disabled={saving || !name.trim()} onClick={() => void save()}>{saving ? "…" : t.save}</button></div>
      </section>}
      {tab === "home" && !selectedRecipe && !selectedDish && q && <section className={styles.searchResults}><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t.searchHint}</p><h2>{t.dishes} · {t.recipes}</h2></div><span>{filteredDishes.length + filteredRecipes.length}</span></div><div className={styles.list}>{filteredDishes.map((dish) => <button key={dish.id} className={styles.card} onClick={() => { setTab("dishes"); setSelectedDish(dish); }}><span>{t.dishes} · {tr(dish).section}</span><strong>{tr(dish).name}</strong></button>)}{filteredRecipes.map((recipe) => <button key={recipe.id} className={styles.card} onClick={() => { setTab("recipes"); setSelectedRecipe(recipe); }}><span>{t.recipes} · {tr(recipe).section}</span><strong>{tr(recipe).name}</strong></button>)}</div></section>}
      {tab === "home" && !selectedRecipe && !selectedDish && !q && <section className={styles.hero}><h1>LET’S COOK</h1><p>Recipes, dishes and technology — in one place.</p><div className={styles.tiles}><button className={styles.tile} onClick={() => openTab("dishes")}><strong>{data.menuItems.length}</strong><span>{t.dishes}</span></button><button className={styles.tile} onClick={() => openTab("recipes")}><strong>{data.recipes.length}</strong><span>{t.recipes}</span></button></div></section>}
      {tab === "dishes" && !selectedDish && <section><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t.categories}</p><h2>{t.dishes}</h2></div><span>{categoryDishes.length}</span></div><div className={styles.chips}><button className={category === "Все" ? styles.chipActive : styles.chip} onClick={() => setCategory("Все")}>{t.all}</button>{categoryOptions("dish").map((item) => <button key={item.categoryKey} className={category === item.categoryKey ? styles.chipActive : styles.chip} onClick={() => setCategory(item.categoryKey)}>{item.names[lang] ?? item.categoryKey}</button>)}</div><div className={styles.list}>{categoryDishes.map((dish) => { const translated = tr(dish); return <button key={dish.id} className={styles.card} onClick={() => setSelectedDish(dish)}><span>{translated.section}</span><strong>{translated.name}</strong><small>{(translated.components ?? dish.components).length} · {t.components.toLowerCase()}</small></button>; })}</div><button className={styles.categoryPrint} onClick={() => setPrintMode("category")}>🖨 {t.print}</button></section>}
      {tab === "recipes" && !selectedRecipe && <section><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t.categories}</p><h2>{t.recipes}</h2></div><span>{categoryRecipes.length}</span></div><div className={styles.chips}><button className={category === "Все" ? styles.chipActive : styles.chip} onClick={() => setCategory("Все")}>{t.all}</button>{categoryOptions("recipe").map((item) => <button key={item.categoryKey} className={category === item.categoryKey ? styles.chipActive : styles.chip} onClick={() => setCategory(item.categoryKey)}>{item.names[lang] ?? item.categoryKey}</button>)}</div><div className={styles.list}>{categoryRecipes.map((recipe) => { const translated = tr(recipe); return <button key={recipe.id} className={styles.card} onClick={() => setSelectedRecipe(recipe)}><span>{translated.section}{translated.station ? ` · ${translated.station}` : ""}</span><strong>{translated.name}</strong><small>{(translated.ingredients ?? recipe.ingredients).length} · {t.ingredients.toLowerCase()} · {(translated.steps ?? recipe.steps).length}</small></button>; })}</div><button className={styles.categoryPrint} onClick={() => setPrintMode("category")}>🖨 {t.print}</button></section>}
      {selectedDish && dishView && <section className={styles.detail}><Button onClick={back}>{t.back}</Button><p className={styles.eyebrow}>{dishView.section}</p><h1>{dishView.name}</h1><h3>{t.components}</h3>{(dishView.components ?? selectedDish.components).map((item, index) => <div className={styles.component} key={index}>{item}</div>)}<div className={styles.detailActions}><button onClick={() => setPrintMode("current")}>🖨 {t.print}</button><button onClick={() => void remove("dish", selectedDish.id)}>{t.delete}</button></div></section>}
      {selectedRecipe && recipeView && <section className={styles.detail}><Button onClick={back}>{t.back}</Button><p className={styles.eyebrow}>{recipeView.section}{recipeView.station ? ` · ${recipeView.station}` : ""}</p><h1>{recipeView.name}</h1><h3>{t.ingredients}</h3>{(recipeView.ingredients ?? selectedRecipe.ingredients).map((item, index) => <div className={styles.row} key={index}><span>{item.item}</span><b>{item.amount}</b></div>)}<h3>{t.technology}</h3>{(recipeView.steps ?? selectedRecipe.steps).map((step, index) => <div className={styles.step} key={index}><b>{index + 1}</b><span>{step}</span></div>)}{(recipeView.criticalPoints ?? selectedRecipe.criticalPoints).length > 0 && <><h3>{t.critical}</h3>{(recipeView.criticalPoints ?? selectedRecipe.criticalPoints).map((item, index) => <div className={styles.component} key={index}>• {item}</div>)}</>}{recipeView.servingNotes && <><h3>{t.service}</h3><div className={styles.serviceNote}>{recipeView.servingNotes}</div></>}<div className={styles.detailActions}><button onClick={() => setPrintMode("current")}>🖨 {t.print}</button><button onClick={() => beginEditRecipe(selectedRecipe)}>✎ {t.editRecipe}</button><button onClick={() => void remove("recipe", selectedRecipe.id)}>{t.delete}</button></div></section>}
    </main>
  </div>;
}
