/**
 * Canned story parts so the site works before the Worker is deployed.
 * Free text uses the same age checks as the Worker. Disallowed ideas
 * are not repeated.
 */

import { surprisePool } from "./catalog.js";
import { screenReaderText } from "./safety.js";
import { steeredBeat } from "./fallback.js";

/**
 * @param {string} name
 * @param {string} ageGroup
 */
function surpriseTheme(name, ageGroup) {
  const pool = surprisePool(ageGroup);
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[total % pool.length] ?? "fantasy";
}

/**
 * @param {string} ageGroup
 */
function voice(ageGroup) {
  if (ageGroup === "little-kids") return "little";
  if (ageGroup === "kids") return "young";
  if (ageGroup === "adults") return "adult";
  return "mid";
}

/** @type {Record<string, Record<string, { text: (name: string) => string, options: [string, string, string] }>>} */
const OPENINGS = {
  fantasy: {
    little: {
      text: (name) =>
        `${name} finds a tiny door in the garden. A blue bird says hello. The door glows like a night light.`,
      options: ["Open the tiny door", "Talk to the bird", "Bring a flower"],
    },
    young: {
      text: (name) =>
        `${name} finds a tiny glowing door behind the roses. A blue bird hops over and says the door opens for kind visitors. Soft music comes from the other side.`,
      options: ["Open the tiny door", "Ask the bird for help", "Leave a flower first"],
    },
    mid: {
      text: (name) =>
        `${name} follows a thread of light through the old garden and finds a door no one else can see. A blue bird lands on the handle and waits. Whatever is inside sounds curious, not dangerous.`,
      options: ["Open the door", "Ask the bird what it knows", "Mark the spot and circle the garden"],
    },
    adult: {
      text: (name) =>
        `${name} finds a door in the garden that was not there at noon. A blue bird watches, patient as a librarian. Light leaks through the keyhole, and the air smells like rain on warm stone.`,
      options: ["Open the door", "Speak to the bird", "Study the lock before touching it"],
    },
  },
  adventure: {
    little: {
      text: (name) =>
        `${name} has a paper map with a big red star. The path is sunny. A friendly bell rings up the hill.`,
      options: ["Follow the path", "Look at the map", "Wave hello"],
    },
    young: {
      text: (name) =>
        `${name} unfolds a map with a red star on a sunny hill. The path is clear, and a small bell rings somewhere ahead. This trip feels exciting and safe.`,
      options: ["Follow the sunny path", "Check the map again", "Call toward the bell"],
    },
    mid: {
      text: (name) =>
        `The map in ${name}'s pack shows a red star beyond the ridge. The trail is steep but open, and a bell answers every few steps. Someone wants to be found.`,
      options: ["Climb toward the bell", "Compare the map to the ridge", "Leave a marker and scout ahead"],
    },
    adult: {
      text: (name) =>
        `${name} spreads a worn map on a flat rock. A red star marks a ridge the locals will not name. A bell answers from the slope, steady and deliberate, as if it has been waiting.`,
      options: ["Climb toward the bell", "Read the map's faded notes", "Circle the ridge before climbing"],
    },
  },
  space: {
    little: {
      text: (name) =>
        `${name} rides in a cozy ship. A kind robot waves. Outside, a planet looks like a blue marble.`,
      options: ["Say hi to the robot", "Look at the stars", "Share a snack"],
    },
    young: {
      text: (name) =>
        `${name} floats inside a snug little ship. A round robot blinks a hello. Through the window, a blue planet turns slowly, like a marble in sunlight.`,
      options: ["Talk to the robot", "Watch the blue planet", "Share a snack with the crew"],
    },
    mid: {
      text: (name) =>
        `${name}'s ship drifts into a quiet orbit. A round robot taps the glass and points at a blue planet with a single bright city. The radio is open, and someone is humming.`,
      options: ["Answer the radio", "Ask the robot about the city", "Set a course for the planet"],
    },
    adult: {
      text: (name) =>
        `Orbit is quiet enough that ${name} can hear the ship's fans. A maintenance robot points at a blue planet and a city that should not be lit. The radio hums, waiting for a reply.`,
      options: ["Answer the radio", "Ask the robot for the logs", "Hold orbit and watch a little longer"],
    },
  },
  animals: {
    little: {
      text: (name) =>
        `A small fox sits by a stream. It looks at ${name} and wags its tail. Birds sing in the trees.`,
      options: ["Pet the fox", "Listen to the birds", "Sit by the water"],
    },
    young: {
      text: (name) =>
        `A small fox waits by a clear stream and wags its tail when ${name} comes close. Birds trade songs in the branches. The fox seems to want company, not trouble.`,
      options: ["Walk with the fox", "Listen to the birds", "Sit by the stream"],
    },
    mid: {
      text: (name) =>
        `A fox with a nick in one ear meets ${name} at the stream and will not cross until someone follows. Upstream, birds go quiet in one tree and loud in the next. The fox looks back, then ahead.`,
      options: ["Follow the fox upstream", "Climb to see the quiet tree", "Wait and watch the bank"],
    },
    adult: {
      text: (name) =>
        `The fox at the stream has been here longer than the path. It studies ${name}, then starts upstream where the birds have rearranged their songs. Something in the wood has shifted, and the fox intends to show it.`,
      options: ["Follow the fox", "Read the change in the birds", "Stay on the bank and observe"],
    },
  },
  mystery: {
    young: {
      text: (name) =>
        `${name} finds a picnic basket with a note that says, "Find me by the yellow gate." Nothing is broken. It is a puzzle, and it feels like a game.`,
      options: ["Look for the yellow gate", "Read the note again", "Ask a friend to help"],
    },
    mid: {
      text: (name) =>
        `A picnic basket sits in the empty park with a note: "Find me by the yellow gate." The sandwiches are still cool, so the writer is close. ${name} has a puzzle, not a threat.`,
      options: ["Search for the yellow gate", "Check who packed the basket", "Ask the nearest neighbor"],
    },
    adult: {
      text: (name) =>
        `The park is empty except for a picnic basket and a note in steady handwriting: "Find me by the yellow gate." The food is still cool. Whoever left it wants to be found, and they left the first clue on purpose.`,
      options: ["Search for the yellow gate", "Study the handwriting", "Ask who uses this park"],
    },
  },
  funny: {
    little: {
      text: (name) =>
        `${name} wears one red sock and one blue sock. A hat hops by itself. It giggles.`,
      options: ["Do a silly dance", "Talk to the hat", "Giggle and look"],
    },
    young: {
      text: (name) =>
        `${name}'s hat hops off the bench and giggles. One red sock and one blue sock seem to be in on the joke. The day just got wonderfully silly.`,
      options: ["Dance with the hat", "Ask the socks what happened", "Follow the giggling sound"],
    },
    mid: {
      text: (name) =>
        `${name}'s hat leaves the bench, bows, and giggles like it has a plan. The mismatched socks start tapping. The town square is one joke away from joining in.`,
      options: ["Dance with the hat", "Interview the socks", "Follow the giggle around the square"],
    },
    adult: {
      text: (name) =>
        `The hat on the bench stands up, bows to ${name}, and laughs in a voice like a teacup. The mismatched socks tap along. It is absurd, and it is clearly an invitation.`,
      options: ["Accept the dance", "Ask the hat what it wants", "Follow the laugh down the street"],
    },
  },
  romance: {
    adult: {
      text: (name) =>
        `${name} meets someone at the bookshop who remembers a line from the same poem. They walk as far as the corner, talking easily, and the evening feels unhurried. The story stays with the feeling, not with anything private.`,
      options: ["Keep walking and talking", "Trade favorite poems", "Stop for tea and stay a while"],
    },
  },
};

/** @type {Record<string, Array<(name: string, choice: string) => string>>} */
const CONTINUATIONS = {
  fantasy: [
    (name, choice) =>
      `${name} chooses "${choice}". The light gets warmer, and a new path shows three gentle ways forward.`,
    (name, choice) =>
      `After "${choice}", ${name} hears soft bells. A friendly shape waves from the next bend.`,
    (name, choice) =>
      `${name} follows through on "${choice}". The garden opens into a quiet courtyard with a sparkling fountain.`,
  ],
  adventure: [
    (name, choice) =>
      `${name} decides on "${choice}". The hill stays bright, and the bell rings once, closer than before.`,
    (name, choice) =>
      `"${choice}" leads ${name} to a lookout. The red star on the map matches a cairn of pale stones.`,
    (name, choice) =>
      `${name} keeps going with "${choice}". A painted sign points three ways, all of them safe to try.`,
  ],
  space: [
    (name, choice) =>
      `${name} picks "${choice}". The ship hums a happy note. The blue planet turns, patient and bright.`,
    (name, choice) =>
      `After "${choice}", the robot projects a simple map of three landing spots. All of them look welcoming.`,
    (name, choice) =>
      `${name} stays with "${choice}". A soft reply comes over the radio, inviting the crew to visit.`,
  ],
  animals: [
    (name, choice) =>
      `${name} chooses "${choice}". The fox flicks an ear and trots a few steps, then waits.`,
    (name, choice) =>
      `After "${choice}", ${name} finds paw prints that lead to a sunny clearing.`,
    (name, choice) =>
      `${name} stays kind and tries "${choice}". Birds settle nearby, as if the hard part is over.`,
  ],
  mystery: [
    (name, choice) =>
      `${name} decides on "${choice}". A second note, folded small, points toward a yellow gate.`,
    (name, choice) =>
      `"${choice}" reveals a button under the basket. It is only a clue, and it is not a trap.`,
    (name, choice) =>
      `${name} follows "${choice}" and spots the yellow gate behind a hedge, with one more note tied to it.`,
  ],
  funny: [
    (name, choice) =>
      `${name} tries "${choice}". The hat applauds with its brim. Even the bench looks amused.`,
    (name, choice) =>
      `After "${choice}", a chorus of giggles answers from three different corners.`,
    (name, choice) =>
      `${name} commits to "${choice}". Confetti made of leaves drifts down, and nobody is in trouble.`,
  ],
  romance: [
    (name, choice) =>
      `${name} chooses "${choice}". The conversation stays warm and unhurried. They learn one true thing about each other and leave the rest for later.`,
    (name, choice) =>
      `They try "${choice}". Lamplight makes the street kind. When the moment grows close, the story fades to black and returns on the walk home.`,
    (name, choice) =>
      `After "${choice}", the evening ends with a promise to meet again. Nothing private is described. The feeling is enough.`,
  ],
};

/**
 * @param {string} theme
 * @param {string} ageGroup
 */
function openingFor(theme, ageGroup) {
  const bucket = OPENINGS[theme];
  if (!bucket) return OPENINGS.fantasy.mid;
  const kind = voice(ageGroup);
  return bucket[kind] ?? bucket.young ?? bucket.mid ?? bucket.adult ?? OPENINGS.fantasy.mid;
}

/**
 * @param {string} text
 */
function snippet(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 120) return clean;
  return `${clean.slice(0, 117)}...`;
}

/**
 * @param {{ readerName: string, ageGroup: string, theme: string, history: Array<{ text: string, options: string[], choice?: { type: string, index?: number, text?: string } }> }} input
 */
export function demoBeat(input) {
  const name = input.readerName;
  const ageGroup = input.ageGroup;
  let theme = input.theme;
  if (theme === "surprise") theme = surpriseTheme(name, ageGroup);

  if (!input.history.length) {
    const opening = openingFor(theme, ageGroup);
    return { text: opening.text(name), options: [...opening.options], steered: false };
  }

  const last = input.history[input.history.length - 1];
  const choice = last.choice;
  if (choice?.type === "free") {
    const typed = String(choice.text ?? "");
    const screen = screenReaderText(typed, ageGroup);
    if (!screen.ok) return steeredBeat({ readerName: name, ageGroup, theme: input.theme });
    const idea = snippet(typed);
    const text =
      ageGroup === "little-kids"
        ? `${name} has an idea. ${idea} The story tries that kind idea.`
        : `${name} suggests a next step: ${idea} The tale follows it, and stays right for this age group.`;
    const opening = openingFor(theme, ageGroup);
    return { text, options: [...opening.options], steered: false };
  }

  const index = choice?.type === "option" ? choice.index ?? 0 : 0;
  const label = last.options?.[index] ?? "try a kind next step";
  const lines = CONTINUATIONS[theme] ?? CONTINUATIONS.fantasy;
  const line = lines[(input.history.length - 1) % lines.length];
  const opening = openingFor(theme, ageGroup);
  const rotated = [...opening.options.slice(index), ...opening.options.slice(0, index)];
  return {
    text: line(name, label),
    options: /** @type {[string, string, string]} */ ([rotated[0], rotated[1], rotated[2]]),
    steered: false,
  };
}
