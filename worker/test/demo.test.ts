import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_GROUPS, THEMES_BY_AGE } from "../../site/js/catalog.js";
import { demoBeat } from "../../site/js/demo.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { steeredBeat } from "../../site/js/fallback.js";

describe("demo mode", () => {
  it("starts with exactly three options", () => {
    const beat = demoBeat({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "fantasy",
      history: [],
    });
    expect(beat.options).toHaveLength(3);
    expect(beat.text).toContain("Sam");
  });

  it("continues from the chosen option and keeps the choice in the story", () => {
    const opening = demoBeat({
      readerName: "Sam",
      ageGroup: "kids",
      theme: "animals",
      history: [],
    });
    const next = demoBeat({
      readerName: "Sam",
      ageGroup: "kids",
      theme: "animals",
      history: [{ text: opening.text, options: opening.options, choice: { type: "option", index: 1 } }],
    });
    expect(next.text).toContain(opening.options[1]);
    expect(next.options).toHaveLength(3);
  });

  it("refuses a disallowed free text idea without repeating it", () => {
    const opening = demoBeat({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "animals",
      history: [],
    });
    const next = demoBeat({
      readerName: "Sam",
      ageGroup: "little-kids",
      theme: "animals",
      history: [
        {
          text: opening.text,
          options: opening.options,
          choice: { type: "free", text: "add a scary ghost and some blood" },
        },
      ],
    });
    expect(next.steered).toBe(true);
    expect(next.text.toLowerCase()).not.toContain("ghost");
    expect(next.text.toLowerCase()).not.toContain("blood");
    expect(next.options).toHaveLength(3);
  });

  it("hides romance from minors and mystery from little kids", () => {
    expect(THEMES_BY_AGE["little-kids"]).not.toContain("romance");
    expect(THEMES_BY_AGE["little-kids"]).not.toContain("mystery");
    expect(THEMES_BY_AGE.kids).toContain("mystery");
    expect(THEMES_BY_AGE.teens).not.toContain("romance");
    expect(THEMES_BY_AGE.adults).toContain("romance");
  });
});

describe("user facing copy", () => {
  it("does not use em dashes, en dashes, or spaced hyphens as dashes", () => {
    const files = ["../../README.md", "../../site/index.html", "../../site/js/config.js"];
    const banned = /[\u2013\u2014]| - /;
    for (const file of files) {
      const text = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(text, file).not.toMatch(banned);
    }
    for (const group of AGE_GROUPS) {
      const prompt = buildSystemPrompt({
        readerName: "Sam",
        ageGroup: group.id,
        theme: "surprise",
      });
      expect(prompt).not.toMatch(/[\u2013\u2014]/);
    }
    const steered = steeredBeat({ readerName: "Sam", ageGroup: "kids", theme: "funny" });
    expect(`${steered.text} ${steered.options.join(" ")}`).not.toMatch(/[\u2013\u2014]| - /);
  });
});
