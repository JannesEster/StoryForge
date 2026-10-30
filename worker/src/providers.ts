import { storyResponseFormat } from "./parse.js";
import type { ChatMessage } from "./messages.js";

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

export interface StoryProvider {
  readonly id: string;
  complete(messages: ChatMessage[], options: { maxTokens: number }): Promise<unknown>;
}

export interface ProviderEnv {
  AI?: Ai;
  LLM_PROVIDER?: string;
  WORKERS_AI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
}

const DEFAULT_WORKERS_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";

export async function runWorkersAi(
  ai: Ai,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<unknown> {
  const base: Record<string, unknown> = {
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };
  try {
    return await ai.run(model, { ...base, response_format: storyResponseFormat() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/json mode/i.test(message)) throw error;
    return ai.run(model, base);
  }
}

export function createWorkersAiProvider(env: ProviderEnv): StoryProvider {
  return {
    id: "workers-ai",
    async complete(messages, options) {
      if (!env.AI) {
        throw new ProviderConfigError("Workers AI binding is missing.");
      }
      const model = env.WORKERS_AI_MODEL?.trim() || DEFAULT_WORKERS_MODEL;
      return runWorkersAi(env.AI, model, messages, options.maxTokens);
    },
  };
}

function openAiResponseFormat(): Record<string, unknown> {
  return {
    type: "json_schema",
    json_schema: {
      name: "story_beat",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
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
      },
    },
  };
}

export async function openAiChat(
  env: ProviderEnv,
  messages: ChatMessage[],
  maxTokens: number,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) throw new ProviderConfigError("OPENAI_API_KEY is not set.");
  const base = (env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE).replace(/\/$/, "");
  const model = env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  const send = async (responseFormat: Record<string, unknown> | null): Promise<Response> => {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    };
    if (responseFormat) body.response_format = responseFormat;
    return fetchImpl(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  };

  let response = await send(openAiResponseFormat());
  if (response.status === 400) {
    response = await send({ type: "json_object" });
  }
  if (!response.ok) {
    throw new Error(`OpenAI-compatible request failed with status ${response.status}`);
  }
  return response.json();
}

export function createOpenAiProvider(env: ProviderEnv, fetchImpl: typeof fetch = fetch): StoryProvider {
  return {
    id: "openai",
    complete(messages, options) {
      return openAiChat(env, messages, options.maxTokens, fetchImpl);
    },
  };
}

export function createProvider(env: ProviderEnv): StoryProvider {
  const id = (env.LLM_PROVIDER ?? "workers-ai").trim().toLowerCase();
  if (id === "openai") return createOpenAiProvider(env);
  if (id === "workers-ai" || id === "") return createWorkersAiProvider(env);
  throw new ProviderConfigError("LLM_PROVIDER must be workers-ai or openai.");
}
