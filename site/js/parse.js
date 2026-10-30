import { LIMITS } from "./catalog.js";
import { screenModelOutput } from "./safety.js";
import { safeOptions } from "./fallback.js";
import { applyArc as shapeArc, optionVerb, optionOverlap } from "./craft.js";

export const storyResponseFormat = () => ({
  type: "json_schema",
  json_schema: {
    type: "object",
    properties: {
      text: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      summary_line: { type: "string" },
      is_ending: { type: "boolean" },
      state_updates: { type: "object" },
    },
    required: ["text", "options"],
  },
});

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function cleanStoryText(value) {
  return stripTags(value).replace(/\r\n/g, "\n").trim().slice(0, LIMITS.storyTextMax);
}

function cleanOption(value) {
  return stripTags(value).replace(/\s+/g, " ").trim().slice(0, LIMITS.optionMax);
}

function stripNumbering(text) {
  return text.replace(/^\s*(?:option\s*)?\d+[.)]\s*/i, "").trim();
}

/**
 * Split "1. a 2. b 3. c" or newline lists into separate options.
 * @param {string} text
 */
export function explodeOption(text) {
  const normalized = String(text).replace(/\s+(\d+[.)])\s+/g, "\n$1 ");
  return normalized
    .split(/\n+/)
    .map((line) => stripNumbering(line.trim()))
    .filter(Boolean);
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

/**
 * @param {unknown} payload
 */
export function extractStoryPayload(payload) {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const source = fence?.[1]?.trim() || trimmed;
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        return source;
      }
    }
    return source;
  }
  const record = asRecord(payload);
  if (!record) return payload;
  if ("text" in record && ("options" in record || "is_ending" in record)) return record;
  if ("response" in record) return extractStoryPayload(record.response);
  if ("result" in record) return extractStoryPayload(record.result);
  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const content = asRecord(choices[0])?.message && asRecord(asRecord(choices[0]).message)?.content;
    if (typeof content === "string") return extractStoryPayload(content);
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => {
          const item = asRecord(part);
          return typeof item?.text === "string" ? item.text : "";
        })
        .join("");
      if (joined) return extractStoryPayload(joined);
    }
  }
  return payload;
}

/**
 * @param {string[]} raw
 * @param {string} ageGroup
 * @param {string} theme
 */
export function normalizeOptions(raw, ageGroup, theme) {
  const chunks = [];
  const list = Array.isArray(raw) ? raw : [raw];
  for (const item of list) {
    if (typeof item !== "string") continue;
    chunks.push(...explodeOption(item));
  }
  const unique = [];
  for (const chunk of chunks.map(cleanOption).filter(Boolean)) {
    if (unique.some((item) => item.toLowerCase() === chunk.toLowerCase())) continue;
    const distinctFromKept = unique.every(
      (item) => optionVerb(item) !== optionVerb(chunk) && optionOverlap(item, chunk) <= 0.5,
    );
    if (distinctFromKept) unique.push(chunk);
    if (unique.length === 3) break;
  }
  for (const pad of safeOptions(theme || "surprise", ageGroup || "kids")) {
    if (unique.length >= 3) break;
    const ok = unique.every(
      (item) => optionVerb(item) !== optionVerb(pad) && optionOverlap(item, pad) <= 0.5,
    );
    if (ok && !unique.some((item) => item.toLowerCase() === pad.toLowerCase())) unique.push(pad);
  }
  if (unique.length < 3) return null;
  return [unique[0], unique[1], unique[2]];
}

/**
 * @param {unknown} payload
 * @param {string} ageGroup
 * @param {string} theme
 */
export function parseStoryBeat(payload, ageGroup = "kids", theme = "fantasy") {
  const extracted = extractStoryPayload(payload);
  const record = asRecord(extracted);
  if (!record || typeof record.text !== "string") return null;
  const text = cleanStoryText(record.text);
  if (!text) return null;
  const ending = record.is_ending === true || record.ending === true;
  const optionSource = Array.isArray(record.options) || typeof record.options === "string" ? record.options : [];
  const options = normalizeOptions(optionSource, ageGroup, theme);
  if (!options && !ending) return null;
  return {
    text,
    options: options || ["Look around", "Ask a friend", "Try a kind idea"],
    summary_line: typeof record.summary_line === "string" ? record.summary_line.slice(0, 200) : "",
    state_updates: asRecord(record.state_updates) || {},
    is_ending: ending,
  };
}

/**
 * @param {unknown} payload
 * @param {string} ageGroup
 * @param {string} theme
 */
export function proseFallback(payload, ageGroup, theme) {
  const extracted = extractStoryPayload(payload);
  if (typeof extracted !== "string") return null;
  const text = cleanStoryText(extracted);
  if (text.length < 20) return null;
  if (text.startsWith("{") || text.includes("\"options\"")) return null;
  if (!screenModelOutput(text, ageGroup).ok) return null;
  const options = normalizeOptions([], ageGroup, theme);
  if (!options) return null;
  return { text: text.slice(0, 1200), options, summary_line: "", state_updates: {}, is_ending: false };
}

/**
 * @param {{ text: string, options: string[] }} beat
 * @param {string} ageGroup
 */
export function beatPassesSafety(beat, ageGroup) {
  if (!screenModelOutput(beat.text, ageGroup).ok) return false;
  return beat.options.every((option) => screenModelOutput(option, ageGroup).ok);
}

/**
 * Code owns the ending. The model cannot end early, and the last beat always ends.
 * @param {object} beat
 * @param {number} beatNumber
 * @param {number} targetBeats
 */
export function applyArc(beat, beatNumber, targetBeats) {
  return shapeArc(beat, beatNumber, targetBeats);
}
