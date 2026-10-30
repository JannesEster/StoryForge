import { isAgeGroup, isThemeAllowed, LIMITS } from "../../site/js/catalog.js";
import { REDACTED_CHOICE } from "../../site/js/craft.js";
import { screenModelOutput, screenReaderText } from "../../site/js/safety.js";
import type { HistoryBeat, StoryChoice } from "./messages.js";

export { REDACTED_CHOICE };

export interface StoryInput {
  readerName: string;
  ageGroup: string;
  theme: string;
  history: HistoryBeat[];
  customIdea: string;
  bible: unknown;
  storyState: unknown;
  recent: unknown;
}

export type ValidationResult =
  | { ok: true; value: StoryInput }
  | { ok: false; status: number; error: string; code: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanControl(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const collapsed = cleanControl(raw).replace(/\s+/g, " ");
  if (!collapsed || collapsed.length > LIMITS.nameMax) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]{0,39}$/u.test(collapsed)) return null;
  return collapsed;
}

function parseChoice(raw: unknown, ageGroup: string): StoryChoice | { error: string; code: string } {
  if (!isRecord(raw) || typeof raw.type !== "string") {
    return { error: "The last choice is missing or not valid.", code: "bad_choice" };
  }
  if (raw.type === "option") {
    if (typeof raw.index !== "number" || !Number.isInteger(raw.index) || raw.index < 0 || raw.index > 2) {
      return { error: "Pick one of the three options.", code: "bad_choice" };
    }
    return { type: "option", index: raw.index };
  }
  if (raw.type === "free") {
    if (typeof raw.text !== "string") {
      return { error: "Write a short next step, or pick one of the options.", code: "bad_choice" };
    }
    const text = cleanControl(raw.text).replace(/\s+/g, " ").trim();
    if (!text) {
      return { error: "Write a short next step, or pick one of the options.", code: "bad_choice" };
    }
    if (text.length > LIMITS.freeTextMax) {
      return {
        error: `Please keep your idea to ${LIMITS.freeTextMax} characters or fewer.`,
        code: "bad_choice",
      };
    }
    if (!screenReaderText(text, ageGroup).ok) {
      return { type: "free", text: REDACTED_CHOICE, blocked: true };
    }
    return { type: "free", text };
  }
  return { error: "The last choice is missing or not valid.", code: "bad_choice" };
}

function parseBeat(raw: unknown, ageGroup: string): HistoryBeat | { error: string; code: string } {
  if (!isRecord(raw) || typeof raw.text !== "string") {
    return { error: "A story part is missing.", code: "bad_history" };
  }
  const text = cleanControl(raw.text);
  if (!text || text.length > LIMITS.storyTextMax) {
    return { error: "A story part is too long. Please start over.", code: "bad_history" };
  }
  if (!screenModelOutput(text, ageGroup).ok) {
    return { error: "Please start the story over.", code: "bad_history" };
  }
  if (!Array.isArray(raw.options) || raw.options.length !== 3) {
    return { error: "Each story part needs exactly 3 options.", code: "bad_history" };
  }
  const options: string[] = [];
  for (const option of raw.options) {
    if (typeof option !== "string") return { error: "An option is not text.", code: "bad_history" };
    const cleaned = cleanControl(option).replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length > LIMITS.optionMax) {
      return { error: "An option is empty or too long.", code: "bad_history" };
    }
    if (!screenModelOutput(cleaned, ageGroup).ok) {
      return { error: "Please start the story over.", code: "bad_history" };
    }
    options.push(cleaned);
  }
  const choice = parseChoice(raw.choice, ageGroup);
  if ("error" in choice) return choice;
  return {
    text,
    options: [options[0] ?? "", options[1] ?? "", options[2] ?? ""],
    choice,
  };
}

export function validateStoryRequest(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Send a JSON story request.", code: "bad_request" };
  }
  const readerName = normalizeName(body.readerName);
  if (!readerName) {
    return {
      ok: false,
      status: 400,
      error: "Please enter a name using letters, up to 40 characters.",
      code: "bad_name",
    };
  }
  if (typeof body.ageGroup !== "string" || !isAgeGroup(body.ageGroup)) {
    return { ok: false, status: 400, error: "Please choose an age group.", code: "bad_age" };
  }
  if (!screenReaderText(readerName, body.ageGroup).ok) {
    return { ok: false, status: 400, error: "Please choose a different name.", code: "bad_name" };
  }
  if (typeof body.theme !== "string" || !isThemeAllowed(body.ageGroup, body.theme)) {
    return {
      ok: false,
      status: 400,
      error: "That theme is not available for this age group.",
      code: "bad_theme",
    };
  }
  if (!Array.isArray(body.history)) {
    return { ok: false, status: 400, error: "Story history needs to be a list.", code: "bad_history" };
  }
  if (body.history.length > LIMITS.historyMax) {
    return {
      ok: false,
      status: 400,
      error: "This story is very long. Please start over.",
      code: "bad_history",
    };
  }

  const history: HistoryBeat[] = [];
  for (const item of body.history) {
    const beat = parseBeat(item, body.ageGroup);
    if ("error" in beat) {
      return { ok: false, status: 400, error: beat.error, code: beat.code };
    }
    history.push(beat);
  }

  return {
    ok: true,
    value: {
      readerName,
      ageGroup: body.ageGroup,
      theme: body.theme,
      history,
      customIdea: typeof body.customIdea === "string" ? body.customIdea : "",
      bible: body.bible,
      storyState: body.storyState,
      recent: body.recent,
    },
  };
}
