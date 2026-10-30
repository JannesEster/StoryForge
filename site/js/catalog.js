/**
 * Shared story catalog. The Worker treats this list as the source of truth
 * for which themes an age group may choose. Demo mode uses the same list.
 */

export const LIMITS = {
  nameMax: 40,
  freeTextMax: 240,
  customIdeaMax: 300,
  historyMax: 16,
  promptHistoryMax: 12,
  storyTextMax: 2500,
  optionMax: 180,
  bodyMax: 32000,
  rateLimit: 30,
  rateWindowMs: 10 * 60 * 1000,
};

/** @typedef {"little-kids" | "kids" | "tweens" | "teens" | "adults"} AgeGroupId */
/** @typedef {"fantasy" | "adventure" | "space" | "animals" | "mystery" | "funny" | "romance" | "surprise"} ThemeId */

export const AGE_GROUPS = [
  {
    id: "little-kids",
    label: "Little kids",
    range: "Ages 4 to 7",
    blurb: "Gentle stories, kind characters, and short sentences.",
  },
  {
    id: "kids",
    label: "Kids",
    range: "Ages 8 to 10",
    blurb: "Cozy adventures and simple mysteries, with nothing scary.",
  },
  {
    id: "tweens",
    label: "Tweens",
    range: "Ages 11 to 12",
    blurb: "Bigger adventures that stay age appropriate.",
  },
  {
    id: "teens",
    label: "Teens",
    range: "Ages 13 to 17",
    blurb: "Adventure and mystery without crude or graphic scenes.",
  },
  {
    id: "adults",
    label: "Adults",
    range: "Ages 18 and up",
    blurb: "Mature themes are allowed. Romance fades to black.",
  },
];

export const THEMES = [
  { id: "fantasy", label: "Fantasy", blurb: "Magic, wonder, and friendly surprises." },
  { id: "adventure", label: "Adventure", blurb: "A journey, a map, and a goal." },
  { id: "space", label: "Space", blurb: "Planets, stars, and curious travelers." },
  { id: "animals", label: "Animals", blurb: "Creatures who help, explore, and care." },
  { id: "mystery", label: "Mystery", blurb: "Clues, puzzles, and a secret to solve." },
  { id: "funny", label: "Funny", blurb: "Silly mix ups and kind jokes." },
  { id: "romance", label: "Romance", blurb: "Affection and closeness. The story fades to black." },
  { id: "surprise", label: "Surprise me", blurb: "The storyteller picks a fitting theme." },
];

/** @type {Record<string, string[]>} */
export const THEMES_BY_AGE = {
  "little-kids": ["fantasy", "adventure", "space", "animals", "funny", "surprise"],
  kids: ["fantasy", "adventure", "space", "animals", "mystery", "funny", "surprise"],
  tweens: ["fantasy", "adventure", "space", "animals", "mystery", "funny", "surprise"],
  teens: ["fantasy", "adventure", "space", "animals", "mystery", "funny", "surprise"],
  adults: ["fantasy", "adventure", "space", "animals", "mystery", "funny", "romance", "surprise"],
};

const AGE_SET = new Set(AGE_GROUPS.map((group) => group.id));
const THEME_SET = new Set(THEMES.map((theme) => theme.id));

/** @param {string} id */
export function isAgeGroup(id) {
  return AGE_SET.has(id);
}

/** @param {string} id */
export function isTheme(id) {
  return THEME_SET.has(id);
}

/**
 * @param {string} ageGroup
 * @param {string} theme
 */
export function isThemeAllowed(ageGroup, theme) {
  if (theme === "custom") return isAgeGroup(ageGroup);
  const allowed = THEMES_BY_AGE[ageGroup];
  return Array.isArray(allowed) && allowed.includes(theme);
}

/** @param {string} id */
export function ageLabel(id) {
  return AGE_GROUPS.find((group) => group.id === id)?.label ?? id;
}

/** @param {string} id */
export function themeLabel(id) {
  return THEMES.find((theme) => theme.id === id)?.label ?? id;
}

/**
 * Themes the surprise option may land on. Romance stays opt in.
 * @param {string} ageGroup
 * @returns {string[]}
 */
export function surprisePool(ageGroup) {
  return (THEMES_BY_AGE[ageGroup] ?? []).filter((theme) => theme !== "surprise" && theme !== "romance");
}
