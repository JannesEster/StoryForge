/**
 * Safe story beats used when a request is refused or a model reply
 * cannot be used. Demo mode and the Worker share this copy.
 */


/** @type {Record<string, [string, string, string]>} */
const OPTIONS = {
  fantasy: ["Follow the glowing path", "Ask the friendly guide", "Open the tiny door"],
  adventure: ["Take the sunny trail", "Check the old map", "Wave to the guide"],
  space: ["Visit the kind robot", "Look at the bright planet", "Share a snack"],
  animals: ["Follow the fox", "Listen to the birds", "Sit by the stream"],
  mystery: ["Look for a clue", "Ask a friend", "Check the garden"],
  funny: ["Try a silly dance", "Tell a kind joke", "Follow the giggling sound"],
  romance: ["Take a quiet walk", "Share a true story", "Watch the sunset together"],
  surprise: ["Look around", "Ask a friend", "Try a kind idea"],
};

const YOUNG_OPTIONS = {
  fantasy: ["Open the tiny door", "Talk to the bird", "Bring a flower"],
  adventure: ["Follow the path", "Look at the map", "Wave hello"],
  space: ["Say hi to the robot", "Look at the stars", "Share a snack"],
  animals: ["Pet the fox", "Listen to the birds", "Sit by the water"],
  funny: ["Do a silly dance", "Tell a kind joke", "Giggle and look"],
  surprise: ["Look around", "Say hello", "Try a kind idea"],
};

/**
 * @param {string} theme
 * @param {string} ageGroup
 * @returns {[string, string, string]}
 */
export function safeOptions(theme, ageGroup) {
  if (ageGroup === "little-kids" || ageGroup === "kids") {
    const young = YOUNG_OPTIONS[theme] ?? YOUNG_OPTIONS.surprise;
    return /** @type {[string, string, string]} */ ([...young]);
  }
  const options = OPTIONS[theme] ?? OPTIONS.surprise;
  return /** @type {[string, string, string]} */ ([...options]);
}

/**
 * @param {{ readerName: string, ageGroup: string, theme: string }} input
 */
export function steeredBeat(input) {
  const name = input.readerName;
  const young = input.ageGroup === "little-kids" || input.ageGroup === "kids";
  const text = young
    ? `${name}, that idea is not part of this story. Let's pick a kind path instead.`
    : `${name}, that path is not part of this story. Let's stay with a tale that fits this age group.`;
  return {
    text,
    options: safeOptions(input.theme, input.ageGroup),
    steered: true,
  };
}

/**
 * @param {{ readerName: string, ageGroup: string, theme: string }} input
 */
export function backupBeat(input) {
  const young = input.ageGroup === "little-kids" || input.ageGroup === "kids";
  const text = young
    ? `${input.readerName} takes a breath. The story finds a kind next step.`
    : `${input.readerName} pauses. The story finds a safe next step and keeps going.`;
  return {
    text,
    options: safeOptions(input.theme, input.ageGroup),
    steered: false,
  };
}
