import { describe, expect, it } from "vitest";
import { AGE_GROUPS, THEMES_BY_AGE } from "../../site/js/catalog.js";
import {
  applyArc,
  applyStateUpdates,
  beatJob,
  beatSlot,
  createBible,
  emptyStoryState,
  optionsAreDistinct,
  screenCustomIdea,
} from "../../site/js/craft.js";
import { buildSystemPrompt } from "../../site/js/prompt.js";
import { screenReaderText } from "../../site/js/safety.js";
import { safeOptions } from "../../site/js/fallback.js";

describe("beat map", () => {
  it("keeps the ending and climax fixed for 8, 10, and 12 beats", () => {
    for (const target of [8, 10, 12]) {
      expect(beatSlot(1, target)).toBe(1);
      expect(beatSlot(target - 1, target)).toBe(9);
      expect(beatSlot(target, target)).toBe(10);
      expect(beatJob(1, target, "kids")).toMatch(/Hook/);
      expect(beatJob(target, target, "adults")).toMatch(/at least two earlier choices/);
    }
  });

  it("keeps the little kid setback harmless", () => {
    const job = beatJob(7, 10, "little-kids").toLowerCase();
    expect(job).toMatch(/silly/);
    expect(job).not.toMatch(/betray|monster|blood|death/);
  });
});

describe("ending control", () => {
  it("ignores an early ending and forces the last beat to end", () => {
    const early = applyArc(
      { text: "Too soon.", options: ["Open the door", "Ask the bird", "Bring a flower"], is_ending: true },
      3,
      10,
    );
    expect(early.is_ending).toBe(false);
    expect(early.options).toHaveLength(3);
    const last = applyArc(
      { text: "Home again.", options: ["Open the door", "Ask the bird", "Bring a flower"], is_ending: false },
      10,
      10,
    );
    expect(last.is_ending).toBe(true);
    expect(last.options).toEqual([]);
  });
});

describe("option distinctness", () => {
  it("rejects three ways to say the same thing", () => {
    expect(optionsAreDistinct(["Open the door", "Open the gate", "Open the hatch"])).toBe(false);
    expect(optionsAreDistinct(["Look around", "Look about", "Look nearby"])).toBe(false);
  });

  it("accepts different verbs and directions", () => {
    expect(optionsAreDistinct(["Open the tiny door", "Ask the blue bird", "Bring a flower"])).toBe(true);
    expect(optionsAreDistinct(safeOptions("animals", "little-kids"))).toBe(true);
  });
});

describe("story bible", () => {
  it("changes when the random draws change", () => {
    const first = createBible({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "animals",
      rng: () => 0,
    });
    const second = createBible({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "animals",
      rng: () => 0.999,
    });
    expect(first.setting).not.toBe(second.setting);
    expect(first.sidekick).not.toBe(second.sidekick);
  });

  it("keeps every seeded line inside the age rules", () => {
    const draws = [() => 0, () => 0.5, () => 0.999];
    for (const group of AGE_GROUPS) {
      const themes = [...THEMES_BY_AGE[group.id], "custom"];
      for (const theme of themes) {
        for (const rng of draws) {
          const bible = createBible({
            readerName: "Sam",
            ageGroup: group.id,
            theme,
            customIdea: theme === "custom" ? "a friendly dragon opens a bakery" : "",
            rng,
          });
          for (const value of Object.values(bible)) {
            if (typeof value !== "string") continue;
            const screen = screenReaderText(value, group.id);
            expect(screen.ok, `${group.id} ${theme} ${value}`).toBe(true);
          }
        }
      }
    }
  });
});

describe("state and custom ideas", () => {
  it("remembers an item and a summary for later beats", () => {
    const state = applyStateUpdates(
      emptyStoryState(),
      { inventory_add: ["a warm cookie"], flags: { helped: "bird" } },
      "Sam shared a snack.",
      "little-kids",
    );
    expect(state.inventory).toContain("a warm cookie");
    expect(state.summaries[0]).toMatch(/snack/);
    expect(state.flags.helped).toBe("bird");
  });

  it("drops unsafe state updates", () => {
    const state = applyStateUpdates(
      emptyStoryState(),
      { inventory_add: ["a bucket of blood"] },
      "Then there was blood.",
      "little-kids",
    );
    expect(state.inventory).toEqual([]);
    expect(state.summaries).toEqual([]);
  });

  it("blocks a custom idea that breaks the age rules", () => {
    expect(screenCustomIdea("a friendly dragon opens a bakery", "little-kids").ok).toBe(true);
    const blocked = screenCustomIdea("add a scary ghost", "little-kids");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("blocked");
    expect(screenCustomIdea("x".repeat(301), "adults").ok).toBe(false);
  });
});

describe("prompt craft", () => {
  it("sends the bible, the beat job, the word budget, and the bans", () => {
    const bible = createBible({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "fantasy",
      rng: () => 0.2,
    });
    const prompt = buildSystemPrompt({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "fantasy",
      bible,
      history: [],
      beatNumber: 1,
      customIdea: "a dragon who is scared of the dark opens a bakery",
      storyState: emptyStoryState(),
    });
    expect(prompt).toContain("40 to 80");
    expect(prompt).toContain("STORY BIBLE");
    expect(prompt).toContain(bible.setting);
    expect(prompt).toContain("beat 1 of");
    expect(prompt).toContain("Once upon a time");
    expect(prompt).toContain("Elara");
    expect(prompt).toContain("drop that seed");
    expect(prompt).toContain("No moral");
    expect(prompt.toLowerCase()).toContain("never write sexual content involving anyone under 18");
  });

  it("tells the final beat to reference earlier choices", () => {
    const prompt = buildSystemPrompt({
      readerName: "Sam",
      ageGroup: "kids",
      theme: "animals",
      bible: { targetBeats: 10 },
      beatNumber: 10,
      history: [
        { text: "One.", options: ["Pet the fox", "Listen to the birds", "Sit by the water"], choice: { type: "option", index: 0 } },
        { text: "Two.", options: ["Pet the fox", "Listen to the birds", "Sit by the water"], choice: { type: "option", index: 1 } },
      ],
    });
    expect(prompt).toContain("at least two earlier choices");
    expect(prompt).toContain("Pet the fox");
    expect(prompt).toContain("Listen to the birds");
  });
});
