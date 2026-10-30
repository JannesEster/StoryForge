import { describe, expect, it } from "vitest";
import { planStoryTurn, requestStory, storyMode } from "../../site/js/tell.js";

const opening = {
  text: "Sam met a fox by the stream.",
  options: ["Pet the fox", "Listen to the birds", "Sit by the water"],
};

describe("story mode", () => {
  it("uses the worker when a URL is set, otherwise Pollinations, unless demo is asked for", () => {
    expect(storyMode({ workerUrl: "", demo: false })).toBe("pollinations");
    expect(storyMode({ workerUrl: "https://story.example", demo: false })).toBe("worker");
    expect(storyMode({ workerUrl: "https://story.example", demo: true })).toBe("demo");
  });
});

describe("requestStory", () => {
  it("refuses a disallowed free text idea without calling the network", async () => {
    let called = false;
    const beat = await requestStory(
      {
        readerName: "Sam",
        ageGroup: "little-kids",
        theme: "animals",
        history: [{ ...opening, choice: { type: "free", text: "add a scary ghost" } }],
      },
      {
        mode: "pollinations",
        fetchImpl: async () => {
          called = true;
          throw new Error("should not be called");
        },
      },
    );
    expect(called).toBe(false);
    const result = beat as { steered?: boolean; text?: string };
    expect(result.steered).toBe(true);
    expect(result.text?.toLowerCase()).not.toContain("ghost");
  });

  it("refuses a disallowed custom idea without calling the network", async () => {
    let called = false;
    const beat = await requestStory(
      {
        readerName: "Sam",
        ageGroup: "little-kids",
        theme: "custom",
        customIdea: "a scary ghost chase",
        history: [],
      },
      {
        mode: "pollinations",
        fetchImpl: async () => {
          called = true;
          throw new Error("should not be called");
        },
      },
    );
    expect(called).toBe(false);
    const result = beat as { blockedIdea?: boolean; message?: string };
    expect(result.blockedIdea).toBe(true);
    expect(result.message?.toLowerCase()).not.toContain("ghost");
  });

  it("falls back to a safe beat when Pollinations times out", async () => {
    const beat = await requestStory(
      {
        readerName: "Sam",
        ageGroup: "little-kids",
        theme: "animals",
        history: [],
        bible: {
          seed: 1,
          flavor: "animals",
          title: "Sam and Pip",
          structure: "cozy quest",
          tone: "gentle",
          setting: "a berry path",
          heroQuirk: "hums when thinking",
          heroWant: "to share a snack",
          sidekick: "Pip",
          sidekickQuirk: "collects smooth pebbles",
          problem: "a picnic that will not sit still",
          twist: "the treasure is a new friend",
          obstacle: "a puzzle made of buttons",
          genreTwist: "everything important is tiny",
          endingType: "cozy homecoming",
          opener: "an odd object",
          targetBeats: 10,
        },
      },
      {
        mode: "pollinations",
        timeoutMs: 20,
        fetchImpl: (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
          }),
      },
    );
    const result = beat as { text: string; options: string[] };
    expect(result.text).toMatch(/needed a moment/);
    expect(result.options).toHaveLength(3);
    expect(result.text.toLowerCase()).not.toContain("blood");
  });

  it("does not put a blocked idea into the model messages", () => {
    const plan = planStoryTurn({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "animals",
      history: [{ ...opening, choice: { type: "free", text: "add lots of blood" } }],
    });
    expect(plan.kind).toBe("steered");
  });
});
