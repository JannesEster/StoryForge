import { LIMITS } from "../../site/js/catalog.js";
import { screenModelOutput } from "../../site/js/safety.js";
import { safeOptions } from "../../site/js/fallback.js";

export interface StoryBeat {
  text: string;
  options: [string, string, string];
}

const STORY_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["text", "options"],
};

export function storyResponseFormat(): { type: "json_schema"; json_schema: typeof STORY_SCHEMA } {
  return { type: "json_schema", json_schema: STORY_SCHEMA };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function cleanStoryText(value: string): string {
  return stripTags(value).replace(/\r\n/g, "\n").trim().slice(0, LIMITS.storyTextMax);
}

function cleanOption(value: string): string {
  return stripTags(value).replace(/\s+/g, " ").trim().slice(0, LIMITS.optionMax);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Pull a story payload out of a raw model response.
 * Accepts a JSON string, a fenced block, prose before JSON,
 * a Workers AI `{ response }` wrapper, and an OpenAI chat completion.
 */
export function extractStoryPayload(payload: unknown): unknown {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const source = fence?.[1]?.trim() ?? trimmed;
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
  if ("text" in record && "options" in record) return record;
  if ("response" in record) return extractStoryPayload(record.response);
  if ("result" in record) return extractStoryPayload(record.result);

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = asRecord(choices[0])?.message;
    const content = asRecord(message)?.content;
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

export function parseStoryBeat(payload: unknown): StoryBeat | null {
  const extracted = extractStoryPayload(payload);
  const record = asRecord(extracted);
  if (!record || typeof record.text !== "string") return null;
  const text = cleanStoryText(record.text);
  if (!text) return null;
  if (!Array.isArray(record.options)) return null;

  const options = record.options
    .filter((option): option is string => typeof option === "string")
    .map(cleanOption)
    .filter((option) => option.length > 0);

  const unique: string[] = [];
  for (const option of options) {
    if (!unique.some((item) => item.toLowerCase() === option.toLowerCase())) unique.push(option);
  }
  if (unique.length < 3) return null;
  return { text, options: [unique[0], unique[1], unique[2]] };
}

/**
 * If JSON parsing fails, keep plain prose when it is safe for the age group.
 * Otherwise return null so the caller can use a canned beat.
 */
export function proseFallback(payload: unknown, ageGroup: string, theme: string): StoryBeat | null {
  const extracted = extractStoryPayload(payload);
  if (typeof extracted !== "string") return null;
  const text = cleanStoryText(extracted);
  if (text.length < 20) return null;
  if (text.startsWith("{") || text.includes("\"options\"")) return null;
  if (!screenModelOutput(text, ageGroup).ok) return null;
  const options = safeOptions(theme, ageGroup);
  return { text: text.slice(0, 1200), options };
}

export function beatPassesSafety(beat: StoryBeat, ageGroup: string): boolean {
  if (!screenModelOutput(beat.text, ageGroup).ok) return false;
  return beat.options.every((option) => screenModelOutput(option, ageGroup).ok);
}
