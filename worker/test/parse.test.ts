import { describe, expect, it } from "vitest";
import { parseStoryBeat, proseFallback } from "../src/parse.js";

const good = {
  text: "Sam finds a tiny door.",
  options: ["Open the tiny door", "Talk to the bird", "Bring a flower"],
};

describe("parseStoryBeat", () => {
  it("reads a JSON object", () => {
    expect(parseStoryBeat(good)?.options).toHaveLength(3);
  });

  it("reads a JSON string and a fenced block", () => {
    expect(parseStoryBeat(JSON.stringify(good))?.text).toBe(good.text);
    const fenced = "```json\n" + JSON.stringify(good) + "\n```";
    expect(parseStoryBeat(fenced)?.options[1]).toBe("Talk to the bird");
  });

  it("reads prose that appears before the JSON object", () => {
    const raw = `Here is the next part:\n${JSON.stringify(good)}`;
    expect(parseStoryBeat(raw)?.text).toBe(good.text);
  });

  it("unwraps Workers AI and OpenAI response shapes", () => {
    expect(parseStoryBeat({ response: good })?.text).toBe(good.text);
    expect(parseStoryBeat({ response: JSON.stringify(good) })?.text).toBe(good.text);
    const openai = { choices: [{ message: { content: JSON.stringify(good) } }] };
    expect(parseStoryBeat(openai)?.options[2]).toBe("Bring a flower");
  });

  it("keeps the first three unique options when the model sends extras", () => {
    const beat = parseStoryBeat({
      text: "A sunny path.",
      options: ["Look around", "Look around", "Ask a friend", "Try a kind idea", "Wave"],
    });
    expect(beat?.options).toEqual(["Look around", "Ask a friend", "Try a kind idea"]);
  });

  it("returns null when the story text is missing", () => {
    expect(parseStoryBeat({ text: "", options: ["Open the door", "Ask a friend", "Look up"] })).toBeNull();
    expect(parseStoryBeat("not json")).toBeNull();
    expect(parseStoryBeat({ nope: true })).toBeNull();
  });

  it("strips numbering and splits options crammed into one string", () => {
    const numbered = parseStoryBeat({
      text: "Sam finds a tiny door.",
      options: ["1. Open the tiny door", "2. Ask the bird", "3) Bring a flower"],
    });
    expect(numbered?.options).toEqual(["Open the tiny door", "Ask the bird", "Bring a flower"]);
    const crammed = parseStoryBeat({
      text: "Sam finds a tiny door.",
      options: ["1. Open the tiny door 2. Ask the bird 3. Bring a flower"],
    });
    expect(crammed?.options).toEqual(["Open the tiny door", "Ask the bird", "Bring a flower"]);
  });

  it("strips tags from story text", () => {
    const beat = parseStoryBeat({
      text: "Sam <b>waves</b> hello.",
      options: ["Wave back", "Sit down", "Look up"],
    });
    expect(beat?.text).toBe("Sam waves hello.");
  });
});

describe("proseFallback", () => {
  it("uses safe prose when JSON is missing", () => {
    const beat = proseFallback(
      "Sam and the fox walk beside the bright stream and listen to the birds.",
      "little-kids",
      "animals",
    );
    expect(beat?.text).toContain("fox");
    expect(beat?.options).toHaveLength(3);
  });

  it("drops unsafe prose", () => {
    expect(
      proseFallback("Then there was a lot of blood on the path and everyone screamed.", "little-kids", "animals"),
    ).toBeNull();
  });
});
