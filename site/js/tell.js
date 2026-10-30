/**
 * Shared story turn: age check, prompt, Pollinations, and safe fallback.
 * The Worker uses the same planning helpers. The page uses requestStory.
 */

import { backupBeat, steeredBeat } from "./fallback.js";
import { demoBeat } from "./demo.js";
import { screenReaderText } from "./safety.js";
import {
  BLOCKED_IDEA_MESSAGE,
  POLLINATIONS_TIMEOUT_MS,
  POLLINATIONS_URL,
  REDACTED_CHOICE,
  STORY_TEMPERATURE,
  applyStateUpdates,
  choicesFromHistory,
  createBible,
  emptyStoryState,
  sanitizeBible,
  screenCustomIdea,
} from "./craft.js";
import { buildMessages, maxTokensFor } from "./messages.js";
import { applyArc, beatPassesSafety, parseStoryBeat, proseFallback } from "./parse.js";

/**
 * @param {{ workerUrl?: string, demo?: boolean }} options
 */
export function storyMode(options) {
  if (options.demo) return "demo";
  if ((options.workerUrl || "").trim()) return "worker";
  return "pollinations";
}

/**
 * @param {object} input
 */
function redactHistory(input) {
  return (input.history || []).map((beat) => {
    if (beat?.choice?.type !== "free") return beat;
    const text = String(beat.choice.text || "");
    if (screenReaderText(text, input.ageGroup).ok) return beat;
    return {
      ...beat,
      choice: { type: "free", text: REDACTED_CHOICE, blocked: true },
    };
  });
}

/**
 * @param {object} input
 */
export function planStoryTurn(input) {
  const history = redactHistory(input);
  const last = history[history.length - 1];
  if (last?.choice?.blocked) {
    return {
      kind: "steered",
      beat: steeredBeat({
        readerName: input.readerName,
        ageGroup: input.ageGroup,
        theme: input.theme === "custom" ? "surprise" : input.theme,
      }),
    };
  }
  let customIdea = "";
  if (input.customIdea) {
    const screened = screenCustomIdea(input.customIdea, input.ageGroup);
    if (!screened.ok) {
      return { kind: "blocked-idea", message: BLOCKED_IDEA_MESSAGE };
    }
    customIdea = screened.text;
  }
  if (input.theme === "custom" && !customIdea) {
    return { kind: "blocked-idea", message: "Write a story idea, or pick a theme." };
  }
  const bible = sanitizeBible(input.bible, {
    ageGroup: input.ageGroup,
    theme: input.theme,
    readerName: input.readerName,
    customIdea,
    recent: input.recent,
  });
  const storyState = {
    ...emptyStoryState(),
    ...(input.storyState || {}),
    choices: choicesFromHistory(history),
  };
  const planned = {
    ...input,
    history,
    customIdea,
    bible,
    storyState,
    recent: input.recent || { firstLines: [], names: [] },
  };
  return {
    kind: "model",
    input: planned,
    messages: buildMessages(planned),
    maxTokens: maxTokensFor(input.ageGroup),
  };
}

/**
 * @param {unknown} raw
 * @param {object} planned
 */
export function acceptModelBeat(raw, planned) {
  const ageGroup = planned.ageGroup;
  const theme = planned.theme === "custom" ? planned.bible?.flavor || "fantasy" : planned.theme;
  const parsed = parseStoryBeat(raw, ageGroup, theme) || proseFallback(raw, ageGroup, theme);
  if (!parsed || !beatPassesSafety(parsed, ageGroup)) return null;
  const beatNumber = (planned.history?.length || 0) + 1;
  const shaped = applyArc(parsed, beatNumber, planned.bible?.targetBeats || 10);
  if (!shaped.is_ending && !beatPassesSafety(shaped, ageGroup)) return null;
  const state = applyStateUpdates(planned.storyState, parsed.state_updates, parsed.summary_line, ageGroup);
  return {
    text: shaped.text,
    options: shaped.options,
    is_ending: shaped.is_ending,
    summary_line: parsed.summary_line || "",
    state,
    bible: planned.bible,
    steered: false,
  };
}

/**
 * @param {object} input
 */
export function restedBeat(input) {
  const backup = backupBeat({
    readerName: input.readerName,
    ageGroup: input.ageGroup,
    theme: input.theme === "custom" ? "surprise" : input.theme,
  });
  const beatNumber = (input.history?.length || 0) + 1;
  const target = input.bible?.targetBeats || 10;
  return {
    text: `The storyteller needed a moment. ${backup.text}`,
    options: beatNumber >= target ? [] : backup.options,
    is_ending: beatNumber >= target,
    steered: false,
    rested: true,
    state: input.storyState || emptyStoryState(),
    bible: input.bible,
  };
}

/**
 * @param {object[]} messages
 * @param {number} maxTokens
 * @param {typeof fetch} fetchImpl
 * @param {number} timeoutMs
 */
export async function postPollinations(messages, maxTokens, fetchImpl = fetch, timeoutMs = POLLINATIONS_TIMEOUT_MS) {
  const response = await fetchImpl(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages,
      temperature: STORY_TEMPERATURE,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Pollinations status ${response.status}`);
  return response.json();
}

/**
 * @param {object} input
 * @param {{ mode: string, workerUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 */
export async function requestStory(input, options) {
  const plan = planStoryTurn(input);
  if (plan.kind === "steered") return plan.beat;
  if (plan.kind === "blocked-idea") {
    return { blockedIdea: true, message: plan.message, steered: true };
  }
  if (options.mode === "demo") {
    const beat = demoBeat(plan.input);
    return { ...beat, is_ending: false, bible: plan.input.bible, state: plan.input.storyState };
  }
  if (options.mode === "worker") {
    const endpoint = `${options.workerUrl.trim().replace(/\/$/, "")}/api/story`;
    const response = await (options.fetchImpl || fetch)(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readerName: plan.input.readerName,
        ageGroup: plan.input.ageGroup,
        theme: plan.input.theme,
        history: plan.input.history,
        customIdea: plan.input.customIdea,
        bible: plan.input.bible,
        storyState: plan.input.storyState,
        recent: plan.input.recent,
      }),
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) {
      throw new Error(data.error || "The storyteller is resting. Please try again in a moment.");
    }
    if (typeof data.text !== "string" || !Array.isArray(data.options)) {
      throw new Error("The storyteller sent a reply we could not read. Please try again.");
    }
    return data;
  }
  try {
    const raw = await postPollinations(
      plan.messages,
      plan.maxTokens,
      options.fetchImpl || fetch,
      options.timeoutMs,
    );
    return acceptModelBeat(raw, plan.input) || restedBeat(plan.input);
  } catch {
    return restedBeat(plan.input);
  }
}
