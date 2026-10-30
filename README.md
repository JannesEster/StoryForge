# StoryForge

StoryForge is a choose your path story site for GitHub Pages. A reader enters a name and an age group, then picks a theme. Each part of the story ends with three choices and a box where they can write something else. The tale continues from that choice and keeps the earlier parts so it stays coherent. The reader can start over at any time.

The age group changes the tone. Little kids get gentle stories in short sentences, with nothing scary. Kids get cozy adventures. Tweens and teens get age appropriate fantasy and adventure, without crude, sexual, gory, or overly frightening scenes. Adults can choose more mature themes. Romance is offered only to adults, and it fades to black. There is no explicit sexual content for anyone. Sexual content involving minors is never allowed, including when the reader is an adult.

With no Worker URL, the site tells a new story in the browser through the free Pollinations text API. No account, key, or fee is required. Add `?demo=1` to the address for saved demo stories.

## Run the site locally

From the repo root:

```bash
cd site
python3 -m http.server 8080
```

Open http://127.0.0.1:8080

Leave `workerUrl` empty in `site/js/config.js` for Pollinations. Open http://127.0.0.1:8080/?demo=1 for demo mode.

## Run the Worker locally

```bash
cd worker
npm install
npm test
npx wrangler dev
```

Wrangler serves the Worker at http://127.0.0.1:8787

`npx wrangler dev` may ask you to log in before it listens, because the Workers AI binding is remote. `npx wrangler dev --local` starts with remote bindings off, so you can test checks and refusals without a login. A story that needs the model returns a friendly error until you log in or deploy.

To use it from the site, set `workerUrl` in `site/js/config.js` to `http://127.0.0.1:8787` and reload. The Worker allows that localhost origin, plus http://localhost on any port.

`npm test` checks prompt building, input checks, reply parsing, demo stories, and the request handler. A live model call needs `npx wrangler login` because Workers AI uses your Cloudflare account, including during local dev.

## Deploy the Worker

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

The default provider is Cloudflare Workers AI, so you do not need an API key. The model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, a current Llama 3.3 instruct model that supports JSON mode. Workers AI includes a free allocation of 10,000 neurons per day. This 70B model uses that allocation faster than a smaller one. To switch models, change `WORKERS_AI_MODEL` in `worker/wrangler.jsonc` and deploy again. `@cf/meta/llama-3.1-8b-instruct-fast` is a smaller Llama 3 option. It is not on the Workers AI JSON mode list, and the Worker still parses the reply and falls back when the JSON is unusable.

After deploy, copy the workers.dev URL into `workerUrl` in `site/js/config.js`, commit, and push to `main`.

## Switch to an OpenAI compatible provider

1. In `worker/wrangler.jsonc`, set `LLM_PROVIDER` to `openai`.
2. Optionally change `OPENAI_MODEL` (default `gpt-4o-mini`) and `OPENAI_BASE_URL` (default `https://api.openai.com/v1`). The base URL can point at any chat completions API with the same shape.
3. Store the key as a Wrangler secret. Do not put it in the repo.

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY
```

Wrangler prompts for the value. Setting a secret deploys a new version of the Worker.

For local dev, copy `worker/.dev.vars.example` to `worker/.dev.vars` and fill in the key there. `.dev.vars` is gitignored.

Set `LLM_PROVIDER` back to `workers-ai` and run `npx wrangler deploy` to return to Workers AI.

## Deploy the site on GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `site` folder when `main` changes.

1. On GitHub, open Settings, then Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push to `main`, or run the workflow from the Actions tab.

The site address is https://jannesester.github.io/StoryForge/

The published site tells live stories through Pollinations until `site/js/config.js` contains your Worker URL. Demo stories stay available at `?demo=1`.

## Safety rules

Age rules and the story bible are shared by the page and the Worker. In Pollinations mode the page builds the prompt and checks free text before the call. A reader can still change that page, so the Worker is the stronger setup later: the same rules then run on the server, where the page cannot replace them.

* Little kids, ages 4 to 7: very simple words, short sentences, kind characters, nothing scary.
* Kids, ages 8 to 10: cozy adventure and simple mysteries, still nothing scary.
* Tweens, ages 11 to 12, and teens, ages 13 to 17: adventure and mystery without crude language, sexual content, gore, or frights beyond that age. Romance is not offered.
* Adults, ages 18 and up: conflict, loss, and romance are allowed. Romance fades to black. No explicit sexual content and no graphic gore.
* Sexual or romantic content involving anyone under 18 is refused for every reader.
* Free text is capped at 240 characters. The Worker runs a keyword and pattern check first. If the idea is not allowed, the story gently refuses, offers three new choices, and does not send the disallowed text to the model.
* The model is asked for JSON with `text` and exactly three `options`. The Worker accepts raw JSON, fenced JSON, and JSON after a short preamble. If that fails, it can keep safe prose. If the reply is unsafe or unreadable, it substitutes a canned beat.
* Each IP address can send 30 story requests per 10 minutes. The counter lives in Worker memory, so it applies per isolate.
* Browser requests are accepted only from https://jannesester.github.io and from http://localhost or http://127.0.0.1.

Themes depend on age. Mystery is hidden from little kids because suspense is easy to make frightening. Romance is hidden from everyone under 18. Surprise me picks an allowed theme and never picks romance.

## Layout

* `site/` is the static site.
* `worker/` is the Cloudflare Worker (`wrangler.jsonc`, source, and tests).
* `site/js/catalog.js`, `site/js/safety.js`, `site/js/craft.js`, `site/js/prompt.js`, `site/js/parse.js`, and `site/js/tell.js` are imported by both the site and the Worker, so demo mode, Pollinations, and the server share the age list, the story bible, and the free text check.

## Story modes

1. If `workerUrl` is set, the Worker tells the story and enforces the rules on the server.
2. Otherwise the page calls Pollinations directly. Each new story gets a fresh story bible (setting, sidekick, twist, tone, structure, ending). A custom idea on the theme screen is checked before that call. If Pollinations fails or takes too long, the page shows a safe next step and the story keeps going.
3. `?demo=1` plays saved demo parts and does not call a model.

The Worker is the more robust option later, because the age rules then run server-side.
