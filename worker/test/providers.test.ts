import { describe, expect, it } from "vitest";
import { createProvider, openAiChat, ProviderConfigError, runWorkersAi } from "../src/providers.js";

describe("providers", () => {
  it("retries Workers AI without JSON mode when the model cannot meet the schema", async () => {
    const calls: Record<string, unknown>[] = [];
    const ai = {
      async run(_model: string, input: Record<string, unknown>) {
        calls.push(input);
        if (calls.length === 1) throw new Error("JSON Mode couldn't be met");
        return { response: "ok" };
      },
    };
    const result = await runWorkersAi(ai as Ai, "@cf/meta/llama-3.3-70b-instruct-fp8-fast", [
      { role: "user", content: "Start" },
    ], 200);
    expect(result).toEqual({ response: "ok" });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.response_format).toBeTruthy();
    expect(calls[1]?.response_format).toBeUndefined();
  });

  it("refuses to call OpenAI without a key", async () => {
    await expect(openAiChat({}, [], 100, fetch)).rejects.toBeInstanceOf(ProviderConfigError);
  });

  it("retries an OpenAI compatible call with a JSON object if the schema is rejected", async () => {
    const formats: unknown[] = [];
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { response_format?: unknown };
      formats.push(body.response_format);
      const auth = new Headers(init?.headers).get("Authorization");
      expect(auth).toBe("Bearer test-key");
      if (formats.length === 1) return new Response("no", { status: 400 });
      return Response.json({
        choices: [{ message: { content: "{\"text\":\"Hi\",\"options\":[\"A\",\"B\",\"C\"]}" } }],
      });
    };
    const result = await openAiChat(
      { OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "https://example.test/v1", OPENAI_MODEL: "gpt-4o-mini" },
      [{ role: "user", content: "Start" }],
      100,
      fetchImpl as typeof fetch,
    );
    expect(formats[0]).toMatchObject({ type: "json_schema" });
    expect(formats[1]).toEqual({ type: "json_object" });
    expect(result).toBeTruthy();
  });

  it("selects a provider from LLM_PROVIDER", () => {
    expect(createProvider({ LLM_PROVIDER: "workers-ai" }).id).toBe("workers-ai");
    expect(createProvider({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" }).id).toBe("openai");
    expect(() => createProvider({ LLM_PROVIDER: "somewhere-else" })).toThrow(ProviderConfigError);
  });
});
