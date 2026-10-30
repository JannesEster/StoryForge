/**
 * Story craft owned by code: bible, beat map, variety seeds, and state.
 * Safety screening still wins. If a seed would break an age rule, it is dropped.
 */

import { LIMITS, isAgeGroup, surprisePool } from "./catalog.js";
import { screenReaderText } from "./safety.js";

export const STORY_TEMPERATURE = 0.85;
export const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
export const POLLINATIONS_TIMEOUT_MS = 45000;

export const REDACTED_CHOICE =
  "The reader asked for a next step that is outside the rules for this age group. Do not describe or quote it.";

export const BLOCKED_IDEA_MESSAGE =
  "That idea is not one we can tell for this age. Pick a theme, or start a kinder surprise story.";

export const BANNED_NAMES = [
  "Elara",
  "Lily",
  "Luna",
  "Kael",
  "Lyra",
  "Seraphina",
  "Zephyr",
  "Finn",
  "Whiskers",
  "Sir Reginald",
  "Professor Hootington",
  "Aria",
  "Elowen",
];

export const BANNED_PHRASES = [
  "Once upon a time",
  "In a world",
  "little did they know",
  "whispered secrets",
  "shimmering",
  "tapestry",
  "testament to",
  "delve",
  "a sense of",
  "and they learned that",
  "the moral of the story",
];

const SIDEKICK_NAMES = [
  "Pip", "Bramble", "Nia", "Sol", "Juniper", "Tad", "Moss", "Pico", "Reed", "Marlo",
  "Suki", "Otto", "Nell", "Juno", "Haru", "Quincy", "Pebble", "Fig", "Rafi", "Noor",
  "Tess", "Bo", "Imani", "Leif", "Sora", "Niko", "Yara", "Opal", "Coco", "Wren",
  "Hana", "Jojo", "Bibi", "Taro", "Luz", "Mika", "Arlo", "Zuri", "Theo", "Mina",
];

const YOUNG_PLACES = [
  "a bakery shaped like a boot",
  "a library where the books hum",
  "a treehouse above a pancake river",
  "a button museum",
  "a cloud train",
  "a garden of teacups",
  "a pebble beach that giggles",
  "a kitchen that grows ladders",
  "a market of mismatched socks",
  "a pond that keeps postcards",
  "a hill of bouncing bubbles",
  "a school for polite dragons",
  "a lighthouse made of jam jars",
  "a bus stop on a rainbow",
  "a cave of friendly echoes",
  "a farm of musical goats",
  "a dock for paper boats",
  "a closet that opens onto a meadow",
  "a bakery that only opens at snack time",
  "a park bench that tells jokes",
  "a fountain of warm cocoa",
  "a map shop run by turtles",
  "a circus tent the size of a hat",
  "a bridge made of skipping ropes",
  "a post office for lost toys",
  "a greenhouse of singing peas",
  "a slide that ends in a story",
  "a kite field",
  "a soup shop for forest animals",
  "a clock that only rings for kindness",
  "a sandbox with tiny doors",
  "a laundry line of flying scarves",
  "a berry path",
  "a workshop of polite robots",
  "a picnic blanket bigger than a yard",
  "a stair of pillows",
  "a harbor of bathtubs",
  "a hill where echoes bring snacks",
  "a studio for painting rain",
  "a nest hotel",
  "a wagon that follows songs",
  "a pond of mirror fish",
  "a bakery window full of moons",
  "a classroom for clouds",
  "a garden gate that bows",
];

const YOUNG_DETAILS = [
  "someone has left one warm cookie",
  "the signs are written in pictures",
  "a bell rings when a friend is near",
  "everything is pocket sized",
  "the colors keep swapping in a silly way",
  "a parade of spoons marches past",
];

const MID_PLACES = [
  "a city of clock towers",
  "a canyon of rope bridges",
  "a school roof at dusk",
  "a museum after the lights dim",
  "a harbor of patched sails",
  "a forest path marked with chalk",
  "a train that skips one station",
  "a market that rearranges itself",
  "an island with three wells",
  "a stadium of paper planes",
  "a river town between two festivals",
  "a workshop under a bridge",
];

const ADULT_PLACES = [
  "a rainy bookshop",
  "a late platform at a small station",
  "a kitchen after the guests leave",
  "a riverside path",
  "a museum gallery with one bench",
  "a corner cafe closing up",
  "an office of unfinished letters",
  "a ferry in the evening",
  "a hill road between two towns",
  "a theater after rehearsal",
];

const YOUNG_TWISTS = [
  "the map is drawn in honey",
  "the door opens only after a shared snack",
  "a lost sock is the key",
  "the rain falls upward and giggles",
  "the treasure is a new friend",
  "the signs point backward on purpose",
  "the smallest cup holds the answer",
  "two paths are the same path in a joke",
];

const MID_TWISTS = [
  "the helpful note was written by the hero earlier",
  "the shortcut is longer and kinder",
  "the rival wants the same thing for a fair reason",
  "the clue was in the first room",
  "a promise made early becomes the key",
  "the wrong turn protects a friend",
];

const ADULT_TWISTS = [
  "the letter was meant for them all along",
  "the quiet person has been helping",
  "leaving is what makes room to return",
  "the deadline was never the real problem",
  "two wants can share one table",
  "the old story left out the bravest part",
];

const QUIRKS = {
  young: [
    "hums when thinking",
    "collects smooth pebbles",
    "names every cup",
    "walks in tiny dances",
    "always carries one crayon",
    "bows to friendly bugs",
  ],
  mid: [
    "sketches plans on scraps",
    "answers questions with questions",
    "remembers every promise",
    "talks faster when excited",
    "keeps a list of fair rules",
    "notices what others skip",
  ],
  adult: [
    "pauses before telling the truth",
    "keeps tickets inside books",
    "laughs once, then thinks",
    "fixes small things while talking",
    "remembers how people take their tea",
    "speaks softly when it matters",
  ],
};

const WANTS = {
  young: [
    "to help a friend home",
    "to share a snack",
    "to find a lost song",
    "to open a tiny door",
    "to make someone giggle",
    "to deliver a kind message",
  ],
  mid: [
    "to solve the puzzle fairly",
    "to prove a quiet idea",
    "to get the group home together",
    "to fix a mistake without blame",
    "to find out who left the note",
    "to earn a place on the team",
  ],
  adult: [
    "to say the true thing in time",
    "to finish what was left undone",
    "to choose loyalty over pride",
    "to make a home in a new place",
    "to keep a promise",
    "to understand a stranger",
  ],
};

const OBSTACLES = {
  young: [
    "a gate that only opens for a polite knock",
    "a puzzle made of buttons",
    "a picnic that will not sit still",
    "a bridge that wants a song",
    "a mix up of identical boxes",
    "a shy animal blocking the path until it hears a joke",
  ],
  mid: [
    "a locked case with three fair clues",
    "a rival who plays by the rules",
    "a missing page",
    "a storm of leaves that hides the marks",
    "a choice between two friends who both need help",
    "a clock that skips ahead",
  ],
  adult: [
    "a misunderstanding that grew in silence",
    "a deadline and a promise that collide",
    "pride that makes a simple apology hard",
    "a route closed by weather",
    "two good plans that cannot both happen",
    "a secret kept to be kind, which made things worse",
  ],
};

const TONES = {
  young: ["cozy", "playful", "silly", "gentle", "sunny", "wondrous"],
  mid: ["hopeful", "curious", "brave", "witty", "warm", "earnest"],
  adult: ["unhurried", "wry", "tender", "clear eyed", "hopeful", "quiet"],
};

const OPENERS = [
  "mid action",
  "an odd object",
  "a line of dialogue",
  "a rule already broken",
  "an arrival",
  "a harmless mess",
  "a letter or message",
];

const GENRE_TWISTS = {
  young: [
    "everyday objects behave like polite animals",
    "the place runs on songs",
    "everything important is tiny",
    "breakfast foods are the tools",
    "the rules of the place are jokes",
    "colors are how people say hello",
  ],
  mid: [
    "the mystery is a chain of three fair clues",
    "the journey is a game with published rules",
    "the town celebrates the wrong festival on purpose",
    "messages travel faster than people",
    "the map changes when someone tells the truth",
    "teams win by sharing, not by racing",
  ],
  adult: [
    "the plot turns on a conversation, not a chase",
    "the past arrives as a letter",
    "work and want share one evening",
    "the city is kind only to people who look closely",
    "memory and rumor disagree",
    "a small courtesy changes the ending",
  ],
};

const ENDINGS = {
  young: ["cozy homecoming", "funny twist", "surprise reveal"],
  mid: ["cozy homecoming", "funny twist", "surprise reveal", "triumphant"],
  teen: ["triumphant", "funny twist", "surprise reveal", "a new adventure begins"],
  adult: ["triumphant", "bittersweet", "funny twist", "surprise reveal", "a new adventure begins", "cozy homecoming"],
};

const STRUCTURES = {
  "little-kids": ["kishotenketsu", "story circle", "cozy quest"],
  kids: ["kishotenketsu", "story circle", "cozy quest", "three clue mystery"],
  tweens: ["story circle", "freytag", "three clue mystery", "quest"],
  teens: ["story circle", "freytag", "quest", "three clue mystery"],
  adults: ["story circle", "freytag", "kishotenketsu", "quest"],
};

/**
 * @param {number} seed
 */
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function rng() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} ageGroup
 */
export function ageBand(ageGroup) {
  if (ageGroup === "little-kids" || ageGroup === "kids") return "young";
  if (ageGroup === "tweens") return "mid";
  if (ageGroup === "teens") return "teen";
  return "adult";
}

/**
 * Map beat 1..target onto the 10 step craft map.
 * The last beat is always the ending. The one before it is always the climax.
 * @param {number} beatNumber
 * @param {number} targetBeats
 */
export function beatSlot(beatNumber, targetBeats) {
  const target = clampTarget(targetBeats);
  const beat = Math.max(1, Math.floor(beatNumber));
  if (beat >= target) return 10;
  if (beat === target - 1) return 9;
  const span = Math.max(1, target - 2);
  const index = Math.round(((beat - 1) / Math.max(1, span - 1)) * 7) + 1;
  return Math.min(8, Math.max(1, index));
}

/**
 * @param {number} targetBeats
 */
function clampTarget(targetBeats) {
  const value = Math.floor(Number(targetBeats));
  if (value === 8 || value === 10 || value === 12) return value;
  return 10;
}

const JOBS = {
  1: "Hook: show the hero in their world with something odd already happening, then offer the first choice. Start in motion. Do not open on the weather or on waking up.",
  2: "The want becomes clear, and the problem or invitation lands.",
  3: "Cross into the new place, or commit to the plan.",
  4: "A first obstacle appears, and the hero meets an ally or a friendly rival.",
  5: "A complication. The choice costs something small, and the cost is hinted before it is chosen.",
  6: "Midpoint: the hero gets something important or learns the planned twist.",
  8: "Rally: use something an earlier choice gave the hero. Call back to that choice in the text.",
  9: "Climax: the big choice. Shape the outcome with the tracked state. Call back to earlier choices.",
  10: "Ending: show how the hero changed, through action. Reference at least two earlier choices. Echo the opening image. Do not state a moral. Set is_ending to true and use an empty options list.",
};

const PRICE = {
  young: "A silly harmless setback. Nobody is hurt, nobody looks mean, and nobody is left in danger. Keep the feeling curious, like wondering what is inside a box.",
  kids: "A puzzle setback. No injury, nobody is gone for good, and no parent is in danger.",
  mid: "A setback that matters. No graphic injury, no one dies, and no loved one is in danger.",
  teen: "A real setback with personal stakes. No gore and no sexual content.",
  adult: "The price of the journey. Danger or loss may appear. No graphic gore and no explicit sexual content.",
};

/**
 * @param {number} beatNumber
 * @param {number} targetBeats
 * @param {string} ageGroup
 */
export function beatJob(beatNumber, targetBeats, ageGroup) {
  const slot = beatSlot(beatNumber, targetBeats);
  if (slot === 7) return PRICE[ageBand(ageGroup)] || PRICE.adult;
  return JOBS[slot] || JOBS[1];
}

/**
 * @param {() => number} rng
 * @param {string[]} list
 */
function pick(rng, list) {
  const index = Math.min(list.length - 1, Math.floor(rng() * list.length));
  return list[Math.max(0, index)];
}

/**
 * @param {string} ageGroup
 * @param {string} theme
 * @param {() => number} rng
 */
function flavorFor(ageGroup, theme, rng) {
  if (theme === "surprise" || theme === "custom") {
    const pool = surprisePool(ageGroup);
    return pick(rng, pool.length ? pool : ["fantasy"]);
  }
  return theme || "fantasy";
}

/**
 * @param {string[]} recentNames
 * @param {string} readerName
 * @param {() => number} rng
 */
function pickSidekickName(recentNames, readerName, rng) {
  const banned = new Set(BANNED_NAMES.map((name) => name.toLowerCase()));
  const skip = new Set([readerName.toLowerCase(), ...recentNames.map((name) => name.toLowerCase())]);
  const pool = SIDEKICK_NAMES.filter((name) => !banned.has(name.toLowerCase()) && !skip.has(name.toLowerCase()));
  return pick(rng, pool.length ? pool : SIDEKICK_NAMES);
}

/**
 * @param {object} input
 */
export function createBible(input) {
  const rng = input.rng || Math.random;
  const ageGroup = input.ageGroup;
  const band = ageBand(ageGroup);
  const flavor = flavorFor(ageGroup, input.theme, rng);
  const young = band === "young";
  const places = young ? YOUNG_PLACES : band === "adult" ? ADULT_PLACES : MID_PLACES;
  const details = young ? YOUNG_DETAILS : ["a small sign has been waiting", "one window is still lit"];
  const recentNames = input.recent?.names || [];
  const sidekick = pickSidekickName(recentNames, input.readerName || "the reader", rng);
  const setting = young ? `${pick(rng, places)}, where ${pick(rng, details)}` : pick(rng, places);
  const targetBeats = pick(rng, [8, 10, 12]);
  const structures = STRUCTURES[ageGroup] || STRUCTURES.adults;
  const endingBand = ageGroup === "little-kids" || ageGroup === "kids" ? "young" : ageGroup === "tweens" ? "mid" : ageGroup === "teens" ? "teen" : "adult";
  const quirkBand = band === "teen" ? "mid" : band === "adult" ? "adult" : band === "mid" ? "mid" : "young";
  const custom = typeof input.customIdea === "string" ? input.customIdea.trim() : "";
  return {
    seed: Math.floor(rng() * 1_000_000_000),
    flavor,
    title: `${input.readerName || "The hero"} and ${sidekick}`,
    structure: pick(rng, structures),
    tone: pick(rng, TONES[quirkBand]),
    setting,
    heroQuirk: pick(rng, QUIRKS[quirkBand]),
    heroWant: custom ? "to follow the reader's own idea" : pick(rng, WANTS[quirkBand]),
    sidekick,
    sidekickQuirk: pick(rng, QUIRKS[quirkBand]),
    problem: custom || pick(rng, OBSTACLES[quirkBand]),
    twist: pick(rng, young ? YOUNG_TWISTS : band === "adult" ? ADULT_TWISTS : MID_TWISTS),
    obstacle: pick(rng, OBSTACLES[quirkBand]),
    genreTwist: pick(rng, GENRE_TWISTS[quirkBand]),
    endingType: pick(rng, ENDINGS[endingBand]),
    opener: pick(rng, OPENERS),
    targetBeats,
  };
}

const BIBLE_FIELDS = [
  "flavor",
  "title",
  "structure",
  "tone",
  "setting",
  "heroQuirk",
  "heroWant",
  "sidekick",
  "sidekickQuirk",
  "problem",
  "twist",
  "obstacle",
  "genreTwist",
  "endingType",
  "opener",
];

/**
 * @param {unknown} value
 * @param {string} ageGroup
 */
function cleanSeedText(value, ageGroup, readerName) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim().slice(0, 180);
  if (!text || !screenReaderText(text, ageGroup).ok) return "";
  const hero = String(readerName || "").trim();
  const withoutHero = hero ? text.replace(new RegExp(`\\b${hero.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig"), " ") : text;
  if (BANNED_NAMES.some((name) => new RegExp(`\\b${name}\\b`, "i").test(withoutHero))) return "";
  return text;
}

/**
 * Keep a client bible only when every field is safe. Otherwise build a new one.
 * @param {unknown} bible
 * @param {object} input
 */
export function sanitizeBible(bible, input) {
  if (!bible || typeof bible !== "object") return createBible(input);
  const record = /** @type {Record<string, unknown>} */ (bible);
  const next = createBible({ ...input, rng: () => 0 });
  let valid = true;
  for (const field of BIBLE_FIELDS) {
    const cleaned = cleanSeedText(record[field], input.ageGroup, input.readerName);
    if (!cleaned) valid = false;
    else next[field] = cleaned;
  }
  const target = clampTarget(Number(record.targetBeats));
  const seed = Number(record.seed);
  if (!valid) return createBible(input);
  next.targetBeats = target;
  next.seed = Number.isFinite(seed) ? Math.floor(seed) : next.seed;
  return next;
}

/**
 * @returns {{ inventory: string[], relationships: Record<string, string>, flags: Record<string, string>, open_threads: string[], summaries: string[], choices: string[] }}
 */
export function emptyStoryState() {
  return {
    inventory: [],
    relationships: {},
    flags: {},
    open_threads: [],
    summaries: [],
    choices: [],
  };
}

/**
 * @param {string} value
 * @param {string} ageGroup
 */
function safeBit(value, ageGroup) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!text || !screenReaderText(text, ageGroup).ok) return "";
  return text;
}

/**
 * @param {ReturnType<typeof emptyStoryState>} state
 * @param {unknown} updates
 * @param {string} summaryLine
 * @param {string} ageGroup
 */
export function applyStateUpdates(state, updates, summaryLine, ageGroup) {
  const next = {
    inventory: [...(state?.inventory || [])],
    relationships: { ...(state?.relationships || {}) },
    flags: { ...(state?.flags || {}) },
    open_threads: [...(state?.open_threads || [])],
    summaries: [...(state?.summaries || [])],
    choices: [...(state?.choices || [])],
  };
  const record = updates && typeof updates === "object" ? /** @type {Record<string, unknown>} */ (updates) : {};
  const add = Array.isArray(record.inventory_add) ? record.inventory_add : [];
  const remove = new Set(
    (Array.isArray(record.inventory_remove) ? record.inventory_remove : [])
      .map((item) => safeBit(item, ageGroup).toLowerCase())
      .filter(Boolean),
  );
  for (const item of add) {
    const bit = safeBit(item, ageGroup);
    if (bit && !next.inventory.some((have) => have.toLowerCase() === bit.toLowerCase())) next.inventory.push(bit);
  }
  next.inventory = next.inventory.filter((item) => !remove.has(item.toLowerCase())).slice(-8);
  if (record.relationships && typeof record.relationships === "object") {
    for (const [key, value] of Object.entries(record.relationships)) {
      const name = safeBit(key, ageGroup);
      const feeling = safeBit(value, ageGroup);
      if (name && feeling) next.relationships[name] = feeling;
    }
  }
  if (record.flags && typeof record.flags === "object") {
    for (const [key, value] of Object.entries(record.flags)) {
      const name = safeBit(key, ageGroup);
      const flag = safeBit(String(value), ageGroup);
      if (name && flag) next.flags[name] = flag;
    }
  }
  const openAdd = Array.isArray(record.open_threads_add) ? record.open_threads_add : [];
  const openClose = new Set(
    (Array.isArray(record.open_threads_close) ? record.open_threads_close : [])
      .map((item) => safeBit(item, ageGroup).toLowerCase())
      .filter(Boolean),
  );
  for (const item of openAdd) {
    const bit = safeBit(item, ageGroup);
    if (bit) next.open_threads.push(bit);
  }
  next.open_threads = next.open_threads.filter((item) => !openClose.has(item.toLowerCase())).slice(-8);
  const summary = safeBit(summaryLine, ageGroup);
  if (summary) next.summaries = [...next.summaries, summary].slice(-12);
  return next;
}

/**
 * @param {Array<{ options?: string[], choice?: { type?: string, index?: number, text?: string, blocked?: boolean } }>} history
 */
export function choicesFromHistory(history) {
  const choices = [];
  for (const beat of history || []) {
    if (beat?.choice?.type === "free") {
      choices.push(beat.choice.blocked ? "a step outside the rules" : String(beat.choice.text || "").slice(0, 120));
    } else if (beat?.choice?.type === "option") {
      const label = beat.options?.[beat.choice.index ?? -1];
      if (label) choices.push(String(label).slice(0, 120));
    }
  }
  return choices.filter(Boolean).slice(-12);
}

const STOP = new Set(["a", "an", "the", "to", "and", "or", "with", "of", "in", "on", "for", "into"]);

/**
 * @param {string} option
 */
export function optionVerb(option) {
  const words = String(option)
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word));
  return words[0] || "";
}

/**
 * @param {string} text
 */
function contentWords(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

/**
 * @param {string} left
 * @param {string} right
 */
export function optionOverlap(left, right) {
  const a = contentWords(left);
  const b = contentWords(right);
  if (!a.size || !b.size) return 1;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Three options are distinct when they start with different verbs
 * and do not repeat the same content words.
 * @param {string[]} options
 */
export function optionsAreDistinct(options) {
  if (!Array.isArray(options) || options.length !== 3) return false;
  const verbs = options.map(optionVerb);
  if (verbs.some((verb) => !verb)) return false;
  if (new Set(verbs).size < 3) return false;
  for (let i = 0; i < 3; i += 1) {
    for (let j = i + 1; j < 3; j += 1) {
      if (optionOverlap(options[i], options[j]) > 0.5) return false;
    }
  }
  return true;
}

/**
 * @param {string} text
 * @param {string} ageGroup
 * @returns {{ ok: true, text: string } | { ok: false, code: string }}
 */
export function screenCustomIdea(text, ageGroup) {
  if (!isAgeGroup(ageGroup)) return { ok: false, code: "age" };
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, code: "empty" };
  if (clean.length > LIMITS.customIdeaMax) return { ok: false, code: "too_long" };
  if (!screenReaderText(clean, ageGroup).ok) return { ok: false, code: "blocked" };
  return { ok: true, text: clean };
}

const RECENT_KEY = "storyforge-recent";

export function loadRecent() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * @param {{ firstLine?: string, names?: string[], seed?: number }} entry
 */
export function rememberStory(entry) {
  try {
    if (typeof localStorage === "undefined") return;
    const recent = loadRecent();
    recent.unshift({
      firstLine: String(entry.firstLine || "").replace(/\s+/g, " ").trim().slice(0, 140),
      names: (entry.names || []).map((name) => String(name).slice(0, 40)).slice(0, 4),
      seed: entry.seed || 0,
    });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch {
    // Private mode can block storage. The story still runs.
  }
}

/**
 * The app, not the model, decides when the story ends.
 * Early is_ending flags are ignored. The last beat always ends.
 * @param {object} beat
 * @param {number} beatNumber
 * @param {number} targetBeats
 */
export function applyArc(beat, beatNumber, targetBeats) {
  const target = clampTarget(targetBeats);
  if (beatNumber >= target) {
    return { ...beat, is_ending: true, options: [] };
  }
  return { ...beat, is_ending: false };
}

/**
 * @param {string} text
 */
export function containsBannedPhrase(text) {
  const lower = String(text || "").toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}
