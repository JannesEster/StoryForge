/**
 * Cheap age checks for reader free text, names, and model output.
 * The Worker runs these checks. Demo mode imports the same functions
 * so a canned story never echoes a disallowed idea.
 * These checks do not replace the system prompt.
 */

/** @typedef {"little-kids" | "kids" | "tweens" | "teens" | "adults"} AgeGroupId */

const LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

const EXPLICIT = [
  "porn",
  "porno",
  "pornography",
  "hentai",
  "xxx",
  "nsfw",
  "nude",
  "nudes",
  "naked",
  "nudity",
  "sex",
  "sexual",
  "sexy",
  "sexting",
  "erotic",
  "erotica",
  "orgasm",
  "orgy",
  "penis",
  "vagina",
  "vulva",
  "clitoris",
  "testicle",
  "testicles",
  "boobs",
  "boob",
  "nipple",
  "nipples",
  "cock",
  "dick",
  "pussy",
  "cunt",
  "blowjob",
  "handjob",
  "anal",
  "masturbate",
  "masturbation",
  "horny",
  "semen",
  "ejaculate",
  "ejaculation",
  "fetish",
  "bdsm",
  "rape",
  "rapist",
  "molest",
  "molestation",
  "intercourse",
  "genitals",
  "genital",
  "stripper",
  "prostitute",
  "hookup",
  "cum",
];

const STRONG_PROFANITY = [
  "fuck",
  "fucking",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "bastard",
  "piss",
];

const MILD_PROFANITY = ["damn", "hell", "crap"];

const SLURS = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  "tranny",
  "kike",
  "spic",
  "chink",
  "dyke",
];

const ROMANCE = [
  "romance",
  "romantic",
  "boyfriend",
  "girlfriend",
  "dating",
  "crush",
  "kiss",
  "kisses",
  "kissing",
  "seduce",
  "seduction",
  "make out",
  "making out",
];

const YOUNG_SCARY_READER = [
  "scary",
  "scare",
  "scared",
  "scream",
  "screaming",
  "nightmare",
  "nightmares",
  "ghost",
  "ghosts",
  "zombie",
  "zombies",
  "demon",
  "demons",
  "devil",
  "horror",
  "blood",
  "bloody",
  "gore",
  "gory",
  "kill",
  "killed",
  "killing",
  "murder",
  "murdered",
  "gun",
  "guns",
  "shoot",
  "shooting",
  "shot",
  "stab",
  "stabbed",
  "knife",
  "knives",
  "corpse",
  "skull",
  "weapon",
  "weapons",
  "war",
  "poison",
  "die",
  "died",
  "dying",
  "dead",
  "death",
  "monster",
  "monsters",
];

const YOUNG_SCARY_OUTPUT = [
  "nightmare",
  "nightmares",
  "ghost",
  "ghosts",
  "zombie",
  "zombies",
  "demon",
  "demons",
  "devil",
  "horror",
  "blood",
  "bloody",
  "gore",
  "gory",
  "kill",
  "killed",
  "killing",
  "murder",
  "murdered",
  "gun",
  "guns",
  "shoot",
  "shooting",
  "stab",
  "stabbed",
  "knife",
  "knives",
  "corpse",
  "skull",
  "weapon",
  "weapons",
  "war",
  "poison",
  "die",
  "died",
  "dying",
  "dead",
  "death",
  "scary",
];

const TWEEN_GRAPHIC = [
  "murder",
  "murdered",
  "blood",
  "bloody",
  "gore",
  "gory",
  "torture",
  "corpse",
  "suicide",
  "dismember",
  "entrails",
  "guts",
  "mutilate",
  "mutilation",
  "gun",
  "guns",
  "shoot",
  "shooting",
  "stab",
  "stabbed",
];

const TEEN_GRAPHIC = [
  "gore",
  "gory",
  "torture",
  "dismember",
  "entrails",
  "mutilate",
  "mutilation",
  "suicide",
  "guts",
];

const ADULT_GRAPHIC = ["dismember", "entrails", "mutilate", "mutilation", "torture", "gore", "gory"];

const SUBSTANCES_UNDER_18 = [
  "beer",
  "wine",
  "alcohol",
  "drunk",
  "drunken",
  "drug",
  "drugs",
  "cocaine",
  "heroin",
  "meth",
  "fentanyl",
  "marijuana",
  "weed",
  "cigarette",
  "cigarettes",
  "smoking",
  "vape",
  "vaping",
  "whiskey",
  "vodka",
];

const HARD_DRUGS = ["cocaine", "heroin", "meth", "fentanyl"];

const OBFUSCATED = ["sex", "sexual", "porn", "nude", "nudes", "naked", "cock", "dick", "cunt", "rape", "loli", "lolita", "shota", "hentai", "erotic"];

const SELF_HARM = [
  /\bkill myself\b/,
  /\bself[\s-]?harm\b/,
  /\bwant to die\b/,
  /\bkys\b/,
  /\bsuicide\b/,
];

const JAILBREAK = [
  /ignore\b.{0,48}\b(rules|instructions|prompt|safety|age)/,
  /disregard\b.{0,48}\b(rules|instructions|prompt|safety|age)/,
  /forget\b.{0,40}\b(rules|instructions|prompt|safety)/,
  /system prompt/,
  /\bjailbreak\b/,
  /developer mode/,
  /\bdan mode\b/,
  /do anything now/,
  /reveal your (instructions|prompt|rules)/,
];

const AGE_ESCAPE = [
  /pretend (i am|i'm|im|we are|we're) (an adult|older|18)/,
  /ignore (my |the )?age/,
  /change (my |the )?age/,
  /make it (mature|adult only|adults only)/,
  /\brated r\b/,
  /\bnsfw\b/,
];

const YOUTH = "child|children|kid|kids|minor|minors|underage|preteen|toddler|toddlers|infant|infants|baby|babies|loli|lolita|shota|schoolgirl|schoolboy|tween|tweens|teenager|teenagers|teen|teens";
const UNDER_18_AGE = "(?:1[0-7]|[0-9])\\s*(?:years?|yrs?)\\s*old";
const MINOR_SEXUAL_TERMS = "porn|porno|nude|nudes|naked|sex|sexual|sexy|erotic|romance|romantic|rape|molest|penis|vagina|orgasm|hentai|xxx|nsfw|seduce|kiss|kisses|kissing|boyfriend|girlfriend|dating";

const MINOR_SEXUAL = new RegExp(
  `(?:\\b(?:${YOUTH})\\b|${UNDER_18_AGE}).{0,48}(?:\\b(?:${MINOR_SEXUAL_TERMS})\\b)|(?:\\b(?:${MINOR_SEXUAL_TERMS})\\b).{0,48}(?:\\b(?:${YOUTH})\\b|${UNDER_18_AGE})`,
  "i",
);

/**
 * @param {string} input
 */
export function normalizeForScan(input) {
  let text = String(input ?? "").normalize("NFKC").toLowerCase();
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Swap lookalike symbols only inside a token that already has letters,
  // so an age such as "7 year old" stays a number.
  text = text.replace(/[a-z0-9@$!]{2,}/g, (chunk) => {
    if (!/[a-z]/.test(chunk) || !/[0-9@$!]/.test(chunk)) return chunk;
    return [...chunk].map((char) => LEET[char] ?? char).join("");
  });
  return text;
}

/**
 * @param {string[]} words
 */
function wordPattern(words) {
  const body = words
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|");
  return new RegExp(`(?:^|[^a-z])(?:${body})(?:[^a-z]|$)`, "i");
}

/**
 * Letters of the word may be split by up to two symbols, and the match
 * cannot sit inside a longer word. Plain "sex" still matches. "Essex" does not.
 * @param {string} word
 */
function obfuscatedPattern(word) {
  const parts = [...word].map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const body = parts[0] + parts.slice(1).map((part) => `[^a-z]{0,2}${part}`).join("");
  return new RegExp(`(?:^|[^a-z])${body}(?:[^a-z]|$)`, "i");
}

const EXPLICIT_RE = wordPattern(EXPLICIT);
const STRONG_PROFANITY_RE = wordPattern(STRONG_PROFANITY);
const MILD_PROFANITY_RE = wordPattern(MILD_PROFANITY);
const SLUR_RE = wordPattern(SLURS);
const ROMANCE_RE = wordPattern(ROMANCE);
const YOUNG_READER_RE = wordPattern(YOUNG_SCARY_READER);
const YOUNG_OUTPUT_RE = wordPattern(YOUNG_SCARY_OUTPUT);
const TWEEN_RE = wordPattern(TWEEN_GRAPHIC);
const TEEN_RE = wordPattern(TEEN_GRAPHIC);
const ADULT_GRAPHIC_RE = wordPattern(ADULT_GRAPHIC);
const SUBSTANCE_RE = wordPattern(SUBSTANCES_UNDER_18);
const HARD_DRUG_RE = wordPattern(HARD_DRUGS);
const OBFUSCATED_RE = OBFUSCATED.map(obfuscatedPattern);

/**
 * @param {string} text
 * @param {RegExp} pattern
 */
function has(text, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

/**
 * @param {string} text
 */
function hasObfuscatedExplicit(text) {
  return OBFUSCATED_RE.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * @param {string} text
 */
function hasSelfHarm(text) {
  return SELF_HARM.some((pattern) => pattern.test(text));
}

/**
 * @param {string} text
 */
function hasJailbreak(text) {
  return JAILBREAK.some((pattern) => pattern.test(text));
}

/**
 * @param {string} ageGroup
 */
function isYoung(ageGroup) {
  return ageGroup === "little-kids" || ageGroup === "kids";
}

/**
 * @param {string} text
 * @param {string} ageGroup
 * @param {"reader" | "output"} channel
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function screen(text, ageGroup, channel) {
  const normalized = normalizeForScan(text);
  if (!normalized.trim()) return { ok: true };

  if (hasJailbreak(normalized)) return { ok: false, reason: "jailbreak" };
  if (MINOR_SEXUAL.test(normalized)) return { ok: false, reason: "minor" };
  if (has(normalized, EXPLICIT_RE) || hasObfuscatedExplicit(normalized)) {
    return { ok: false, reason: "explicit" };
  }
  if (has(normalized, SLUR_RE)) return { ok: false, reason: "slur" };
  if (has(normalized, STRONG_PROFANITY_RE)) return { ok: false, reason: "profanity" };
  if (hasSelfHarm(normalized)) return { ok: false, reason: "self-harm" };
  if (ageGroup !== "adults" && has(normalized, MILD_PROFANITY_RE)) {
    return { ok: false, reason: "profanity" };
  }
  if (ageGroup !== "adults" && channel === "output" && has(normalized, ROMANCE_RE)) {
    return { ok: false, reason: "romance" };
  }

  if (channel === "reader") {
    if (ageGroup !== "adults" && AGE_ESCAPE.some((pattern) => pattern.test(normalized))) {
      return { ok: false, reason: "age-escape" };
    }
    if (ageGroup !== "adults" && has(normalized, ROMANCE_RE)) {
      return { ok: false, reason: "romance" };
    }
    if (ageGroup !== "adults" && has(normalized, SUBSTANCE_RE)) {
      return { ok: false, reason: "substances" };
    }
    if (ageGroup === "adults" && has(normalized, HARD_DRUG_RE)) {
      return { ok: false, reason: "substances" };
    }
  }

  if (isYoung(ageGroup)) {
    const pattern = channel === "output" ? YOUNG_OUTPUT_RE : YOUNG_READER_RE;
    if (has(normalized, pattern)) return { ok: false, reason: "violence" };
  } else if (ageGroup === "tweens") {
    if (has(normalized, TWEEN_RE)) return { ok: false, reason: "violence" };
    if (channel === "output" && has(normalized, ROMANCE_RE)) return { ok: false, reason: "romance" };
  } else if (ageGroup === "teens") {
    if (has(normalized, TEEN_RE)) return { ok: false, reason: "violence" };
    if (channel === "output" && has(normalized, ROMANCE_RE)) return { ok: false, reason: "romance" };
  } else if (ageGroup === "adults") {
    if (has(normalized, ADULT_GRAPHIC_RE)) return { ok: false, reason: "violence" };
  } else {
    return { ok: false, reason: "age" };
  }

  return { ok: true };
}

/**
 * @param {string} text
 * @param {string} ageGroup
 */
export function screenReaderText(text, ageGroup) {
  return screen(text, ageGroup, "reader");
}

/**
 * @param {string} text
 * @param {string} ageGroup
 */
export function screenModelOutput(text, ageGroup) {
  return screen(text, ageGroup, "output");
}
