import { AGE_GROUPS, LIMITS, THEMES, ageLabel, isThemeAllowed, themeLabel } from "./catalog.js";
import { config } from "./config.js";
import { BLOCKED_IDEA_MESSAGE, createBible, emptyStoryState, loadRecent, rememberStory, screenCustomIdea } from "./craft.js";
import { screenReaderText } from "./safety.js";
import { requestStory, storyMode } from "./tell.js";

const startStep = document.querySelector("#step-start");
const themeStep = document.querySelector("#step-theme");
const storyStep = document.querySelector("#step-story");
const startForm = document.querySelector("#start-form");
const themeForm = document.querySelector("#theme-form");
const freeForm = document.querySelector("#free-form");
const nameInput = document.querySelector("#reader-name");
const ageChoices = document.querySelector("#age-choices");
const themeChoices = document.querySelector("#theme-choices");
const themeLead = document.querySelector("#theme-lead");
const nameError = document.querySelector("#name-error");
const ageError = document.querySelector("#age-error");
const themeError = document.querySelector("#theme-error");
const freeText = document.querySelector("#free-text");
const freeCount = document.querySelector("#free-count");
const freeError = document.querySelector("#free-error");
const storyError = document.querySelector("#story-error");
const storyLog = document.querySelector("#story-log");
const storyLatest = document.querySelector("#story-latest");
const storyMeta = document.querySelector("#story-meta");
const optionsEl = document.querySelector("#options");
const loading = document.querySelector("#loading");
const modeBadge = document.querySelector("#mode-badge");
const footerNote = document.querySelector("#footer-note");
const restartButton = document.querySelector("#restart");
const themeBack = document.querySelector("#theme-back");
const customIdea = document.querySelector("#custom-idea");
const customCount = document.querySelector("#custom-count");
const customError = document.querySelector("#custom-error");
const startCustomButton = document.querySelector("#start-custom");
const softStart = document.querySelector("#soft-start");
const newStoryButton = document.querySelector("#new-story");
const optionsLabel = document.querySelector("#options-label");

const state = {
  readerName: "",
  ageGroup: "",
  theme: "",
  history: [],
  bible: null,
  storyState: emptyStoryState(),
  customIdea: "",
  busy: false,
};

const mode = storyMode({
  workerUrl: config.workerUrl,
  demo: new URLSearchParams(window.location.search).get("demo") === "1",
});
const namePattern = /^[\p{L}][\p{L}\p{M}'’.\- ]{0,39}$/u;
let generation = 0;

function show(element, visible) {
  element.hidden = !visible;
}

function setError(element, message) {
  element.hidden = !message;
  element.textContent = message || "";
}

function selectedRadio(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : "";
}

function renderChoices(container, items, name) {
  container.replaceChildren();
  for (const item of items) {
    const label = document.createElement("label");
    label.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = item.id;
    input.required = true;
    const body = document.createElement("span");
    body.className = "choice-body";
    const title = document.createElement("span");
    title.className = "choice-title";
    title.textContent = item.label;
    const meta = document.createElement("span");
    meta.className = "choice-meta";
    meta.textContent = item.range || "";
    const blurb = document.createElement("span");
    blurb.className = "choice-blurb";
    blurb.textContent = item.blurb;
    body.append(title);
    if (item.range) body.append(meta);
    body.append(blurb);
    label.append(input, body);
    container.append(label);
  }
}

function renderThemeChoices() {
  const allowed = new Set(
    THEMES.map((theme) => theme.id).filter((id) => isThemeAllowed(state.ageGroup, id)),
  );
  renderChoices(
    themeChoices,
    THEMES.filter((theme) => allowed.has(theme.id)),
    "theme",
  );
  const group = AGE_GROUPS.find((item) => item.id === state.ageGroup);
  themeLead.textContent = group
    ? `${group.label}, ${group.range}. ${group.blurb}`
    : "Pick a theme that fits the reader.";
}

function setBusy(busy) {
  state.busy = busy;
  show(loading, busy);
  for (const button of document.querySelectorAll("button")) {
    if (button !== restartButton) button.disabled = busy;
  }
  freeText.disabled = busy;
}

function beatElement(text, partNumber) {
  const section = document.createElement("section");
  section.className = "beat";
  const heading = document.createElement("h3");
  heading.className = "choice-meta";
  heading.textContent = `Part ${partNumber}`;
  section.append(heading);
  for (const paragraph of text.split(/\n{2,}/)) {
    const p = document.createElement("p");
    p.textContent = paragraph.trim();
    if (p.textContent) section.append(p);
  }
  return section;
}

function showBeat(beat) {
  const partNumber = storyLog.children.length + storyLatest.children.length + 1;
  if (storyLatest.firstChild) storyLog.append(storyLatest.firstChild);
  storyLatest.replaceChildren(beatElement(beat.text, partNumber));
  const ending = Boolean(beat.is_ending);
  optionsLabel.hidden = ending;
  optionsEl.hidden = ending;
  freeForm.hidden = ending;
  newStoryButton.hidden = !ending;
  if (beat.state) state.storyState = beat.state;
  if (beat.bible) state.bible = beat.bible;
  optionsEl.replaceChildren();
  beat.options.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";
    const indexBadge = document.createElement("span");
    indexBadge.className = "option-index";
    indexBadge.textContent = String(index + 1);
    const text = document.createElement("span");
    text.textContent = label;
    button.append(indexBadge, text);
    button.addEventListener("click", () => {
      void choose({ type: "option", index });
    });
    optionsEl.append(button);
  });
  storyLatest.focus();
}

function clearStoryView() {
  storyLog.replaceChildren();
  storyLatest.replaceChildren();
  optionsEl.replaceChildren();
  freeText.value = "";
  updateCount();
  setError(freeError, "");
  setError(storyError, "");
}

async function continueStory(history) {
  const ticket = ++generation;
  setBusy(true);
  setError(storyError, "");
  loading.textContent = mode === "pollinations"
    ? "The story is unfolding. This can take a little while."
    : "The story is unfolding.";
  try {
    const beat = await requestStory(
      {
        readerName: state.readerName,
        ageGroup: state.ageGroup,
        theme: state.theme,
        history,
        customIdea: state.customIdea,
        bible: state.bible,
        storyState: state.storyState,
        recent: loadRecent(),
      },
      { mode, workerUrl: config.workerUrl },
    );
    if (ticket !== generation) return;
    if (beat.blockedIdea) {
      setError(customError, beat.message || BLOCKED_IDEA_MESSAGE);
      softStart.hidden = false;
      showStep("theme");
      return;
    }
    state.history = history;
    showBeat(beat);
    if (history.length === 0) {
      rememberStory({
        firstLine: beat.text,
        names: [state.readerName, state.bible?.sidekick].filter(Boolean),
        seed: state.bible?.seed,
      });
    }
    freeText.value = "";
    updateCount();
  } catch (error) {
    if (ticket !== generation) return;
    setError(storyError, error instanceof Error ? error.message : "Something went wrong. Please try again.");
  } finally {
    if (ticket === generation) setBusy(false);
  }
}

async function choose(choice) {
  if (state.busy) return;
  const latest = storyLatest.querySelector(".beat");
  if (!latest) return;
  const paragraphs = [...latest.querySelectorAll("p")].map((node) => node.textContent || "");
  const text = paragraphs.join("\n\n");
  const options = [...optionsEl.querySelectorAll(".option span:last-child")].map((node) => node.textContent || "");
  if (options.length !== 3) return;
  const history = [...state.history, { text, options, choice }];
  await continueStory(history);
}

function updateCount() {
  freeCount.textContent = `${freeText.value.length} / ${LIMITS.freeTextMax}`;
}

function showStep(step) {
  show(startStep, step === "start");
  show(themeStep, step === "theme");
  show(storyStep, step === "story");
}

startForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim().replace(/\s+/g, " ");
  const ageGroup = selectedRadio("age");
  setError(nameError, "");
  setError(ageError, "");
  if (!name) {
    setError(nameError, "Please enter a name.");
    nameInput.focus();
    return;
  }
  if (name.length > LIMITS.nameMax) {
    setError(nameError, `Please keep the name to ${LIMITS.nameMax} characters.`);
    return;
  }
  if (!ageGroup) {
    setError(ageError, "Please choose an age group.");
    return;
  }
  if (!namePattern.test(name) || !screenReaderText(name, ageGroup).ok) {
    setError(nameError, "Please choose a different name, using letters.");
    nameInput.focus();
    return;
  }
  state.readerName = name;
  state.ageGroup = ageGroup;
  renderThemeChoices();
  showStep("theme");
  themeStep.querySelector("h2")?.focus?.();
});

themeBack.addEventListener("click", () => {
  showStep("start");
  nameInput.focus();
});

themeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const theme = selectedRadio("theme");
  setError(themeError, "");
  if (!theme) {
    setError(themeError, "Please choose a theme.");
    return;
  }
  state.theme = theme;
  state.customIdea = "";
  state.history = [];
  state.storyState = emptyStoryState();
  state.bible = createBible({
    readerName: state.readerName,
    ageGroup: state.ageGroup,
    theme,
    recent: loadRecent(),
  });
  storyMeta.textContent = `${state.readerName}, ${ageLabel(state.ageGroup)}, ${themeLabel(theme)}`;
  clearStoryView();
  showStep("story");
  await continueStory([]);
});

function updateCustomCount() {
  customCount.textContent = `${customIdea.value.length} / ${LIMITS.customIdeaMax}`;
}

startCustomButton.addEventListener("click", async () => {
  setError(customError, "");
  softStart.hidden = true;
  const screened = screenCustomIdea(customIdea.value, state.ageGroup);
  if (!screened.ok) {
    if (screened.code === "too_long") {
      setError(customError, `Please keep your idea to ${LIMITS.customIdeaMax} characters.`);
    } else if (screened.code === "blocked") {
      setError(customError, BLOCKED_IDEA_MESSAGE);
      softStart.hidden = false;
    } else {
      setError(customError, "Write an idea, or pick a theme above.");
    }
    return;
  }
  state.theme = "custom";
  state.customIdea = screened.text;
  state.history = [];
  state.storyState = emptyStoryState();
  state.bible = createBible({
    readerName: state.readerName,
    ageGroup: state.ageGroup,
    theme: "custom",
    customIdea: screened.text,
    recent: loadRecent(),
  });
  storyMeta.textContent = `${state.readerName}, ${ageLabel(state.ageGroup)}, your idea`;
  clearStoryView();
  showStep("story");
  await continueStory([]);
});

softStart.addEventListener("click", async () => {
  softStart.hidden = true;
  setError(customError, "");
  customIdea.value = "";
  updateCustomCount();
  state.theme = "surprise";
  state.customIdea = "";
  state.history = [];
  state.storyState = emptyStoryState();
  state.bible = createBible({
    readerName: state.readerName,
    ageGroup: state.ageGroup,
    theme: "surprise",
    recent: loadRecent(),
  });
  storyMeta.textContent = `${state.readerName}, ${ageLabel(state.ageGroup)}, Surprise me`;
  clearStoryView();
  showStep("story");
  await continueStory([]);
});

customIdea.addEventListener("input", updateCustomCount);

freeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = freeText.value.trim().replace(/\s+/g, " ");
  setError(freeError, "");
  if (!text) {
    setError(freeError, "Write a short idea, or pick one of the three choices.");
    freeText.focus();
    return;
  }
  if (text.length > LIMITS.freeTextMax) {
    setError(freeError, `Please keep your idea to ${LIMITS.freeTextMax} characters or fewer.`);
    return;
  }
  await choose({ type: "free", text });
});

freeText.addEventListener("input", updateCount);

function leaveStory(nextStep) {
  generation += 1;
  setBusy(false);
  state.history = [];
  state.bible = null;
  state.storyState = emptyStoryState();
  state.customIdea = "";
  clearStoryView();
  newStoryButton.hidden = true;
  freeForm.hidden = false;
  optionsEl.hidden = false;
  optionsLabel.hidden = false;
  showStep(nextStep);
}

restartButton.addEventListener("click", () => {
  const ok = window.confirm("Start over and clear this story?");
  if (!ok) return;
  state.theme = "";
  leaveStory("start");
  nameInput.focus();
});

newStoryButton.addEventListener("click", () => {
  const ok = window.confirm("Start a new story and leave this one?");
  if (!ok) return;
  leaveStory("theme");
  themeStep.querySelector("h2")?.focus?.();
});

const modeCopy = {
  demo: {
    badge: "Demo mode",
    footer: "Demo mode plays saved story parts in your browser. Add a Worker URL later if you want the checks to run on a server. Romance is for adults only and fades to black.",
  },
  worker: {
    badge: "Live storyteller",
    footer: "Every idea is checked on the server for this age group. Romance is for adults only and fades to black.",
  },
  pollinations: {
    badge: "Storyteller",
    footer: "Stories are told in your browser with a free storyteller, with no account and no key. Ideas are checked before they are sent. A Worker is the stronger setup later, because those checks then run on the server. Add ?demo=1 for saved demo stories. Romance is for adults only and fades to black.",
  },
};

modeBadge.hidden = false;
modeBadge.textContent = modeCopy[mode].badge;
footerNote.textContent = modeCopy[mode].footer;

renderChoices(ageChoices, AGE_GROUPS, "age");
freeText.maxLength = LIMITS.freeTextMax;
customIdea.maxLength = LIMITS.customIdeaMax;
updateCount();
updateCustomCount();
showStep("start");
