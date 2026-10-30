import { LIMITS } from "../../site/js/catalog.js";
import { backupBeat, steeredBeat } from "../../site/js/fallback.js";
import { corsHeaders, originAllowed } from "./cors.js";
import { buildMessages, maxTokensFor } from "./messages.js";
import { beatPassesSafety, parseStoryBeat, proseFallback } from "./parse.js";
import { createProvider, ProviderConfigError, type ProviderEnv, type StoryProvider } from "./providers.js";
import { createRateLimiter, type RateLimiter } from "./rate-limit.js";
import { validateStoryRequest } from "./validate.js";

interface HandlerDeps {
  provider?: StoryProvider;
  now?: number;
  limiter?: RateLimiter;
}

const defaultLimiter = createRateLimiter(LIMITS.rateLimit, LIMITS.rateWindowMs);

function clientIp(request: Request): string {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function json(body: unknown, status: number, extra?: Headers): Response {
  const headers = extra ?? new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(body), { status, headers });
}

function log(fields: Record<string, string | number | boolean>): void {
  console.log(JSON.stringify({ service: "storyforge", ...fields }));
}

export async function handleRequest(request: Request, env: ProviderEnv, deps: HandlerDeps = {}): Promise<Response> {
  const started = Date.now();
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (origin && !originAllowed(origin)) {
    return json({ error: "This origin is not allowed.", code: "forbidden" }, 403, headers);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    return json(
      { ok: true, service: "storyforge", provider: (env.LLM_PROVIDER || "workers-ai").trim() || "workers-ai" },
      200,
      headers,
    );
  }

  if (request.method !== "POST" || url.pathname !== "/api/story") {
    return json({ error: "Not found.", code: "not_found" }, 404, headers);
  }

  const limiter = deps.limiter ?? defaultLimiter;
  const rate = limiter.check(clientIp(request), deps.now ?? Date.now());
  if (!rate.ok) {
    headers.set("Retry-After", String(rate.retryAfterSec));
    log({ message: "rate_limited", outcome: "rate_limited", ms: Date.now() - started });
    return json(
      { error: "Too many story requests. Please wait a little, then try again.", code: "rate_limited" },
      429,
      headers,
    );
  }

  let rawBody: ArrayBuffer;
  try {
    rawBody = await request.arrayBuffer();
  } catch {
    return json({ error: "Send a JSON story request.", code: "bad_request" }, 400, headers);
  }
  if (rawBody.byteLength > LIMITS.bodyMax) {
    return json({ error: "That request is too large.", code: "bad_request" }, 413, headers);
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ error: "Send a JSON story request.", code: "bad_request" }, 400, headers);
  }

  const validated = validateStoryRequest(body);
  if (!validated.ok) {
    log({ message: "rejected", outcome: "rejected", code: validated.code, ms: Date.now() - started });
    return json({ error: validated.error, code: validated.code }, validated.status, headers);
  }

  const input = validated.value;
  const last = input.history[input.history.length - 1];
  if (last?.choice.blocked) {
    const beat = steeredBeat({
      readerName: input.readerName,
      ageGroup: input.ageGroup,
      theme: input.theme,
    });
    log({
      message: "steered",
      outcome: "steered",
      ageGroup: input.ageGroup,
      theme: input.theme,
      ms: Date.now() - started,
    });
    return json({ text: beat.text, options: beat.options, steered: true }, 200, headers);
  }

  let provider: StoryProvider;
  try {
    provider = deps.provider ?? createProvider(env);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "config";
    log({ message: "config_error", outcome: "error", detail: reason.slice(0, 180), ms: Date.now() - started });
    return json({ error: "The storyteller is not configured yet.", code: "not_configured" }, 500, headers);
  }

  try {
    const raw = await provider.complete(buildMessages(input), { maxTokens: maxTokensFor(input.ageGroup) });
    const parsed = parseStoryBeat(raw);
    const beat = parsed ?? proseFallback(raw, input.ageGroup, input.theme);
    if (!beat || !beatPassesSafety(beat, input.ageGroup)) {
      const backup = backupBeat({
        readerName: input.readerName,
        ageGroup: input.ageGroup,
        theme: input.theme,
      });
      log({
        message: "fallback",
        outcome: "fallback",
        ageGroup: input.ageGroup,
        theme: input.theme,
        provider: provider.id,
        ms: Date.now() - started,
      });
      return json({ text: backup.text, options: backup.options, steered: false }, 200, headers);
    }
    log({
      message: "story",
      outcome: "ok",
      ageGroup: input.ageGroup,
      theme: input.theme,
      provider: provider.id,
      ms: Date.now() - started,
    });
    return json({ text: beat.text, options: beat.options, steered: false }, 200, headers);
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      log({ message: "config_error", outcome: "error", provider: provider.id, ms: Date.now() - started });
      return json({ error: "The storyteller is not configured yet.", code: "not_configured" }, 500, headers);
    }
    const detail = error instanceof Error ? error.message : "upstream";
    console.error(JSON.stringify({
      service: "storyforge",
      message: "upstream_error",
      outcome: "error",
      provider: provider.id,
      detail: detail.slice(0, 300),
      ms: Date.now() - started,
    }));
    return json(
      { error: "The storyteller is resting. Please try again in a moment.", code: "upstream" },
      502,
      headers,
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
