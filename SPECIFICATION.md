# Swarm Evolution v1 — Engineering Specification

**Status**: partial implementation, ready for completion by Claude Code
**Target**: standalone local application — no cloud dependencies, no build step, runs from a single folder
**Language**: all user-facing strings must remain in Ukrainian; code and comments in English

---

## 0 — Context

This is iteration 1 of a 5-iteration roadmap to build a swarm intelligence research platform, ultimately targeting sim2real deployment on physical UGV robots. Iteration 1 is deliberately minimal: a browser-based boids simulator with evolutionary selection, designed to produce intuition about emergent behavior before moving to more serious tooling (Python/pygame in iteration 2, StarCraft/SMAC in iteration 3, NEAT controllers in iteration 4, ARGoS sim2real in iteration 5).

The current state is a working prototype. This spec describes what needs to be done to turn it into a production-grade local tool suitable for daily research use.

---

## 1 — What exists today

### File tree

```
swarm-evolution-v1/
├── index.html           # Self-contained single-file simulator (vanilla JS + Canvas 2D)
├── proxy.js             # Minimal Node.js HTTP proxy to Anthropic API (no deps, uses only stdlib)
├── package.json         # Scripts only, no runtime dependencies
├── .env.example         # Template for ANTHROPIC_API_KEY
├── .gitignore
├── README.md            # User-facing setup instructions (Ukrainian)
└── SPECIFICATION.md     # This file
```

### Functionality currently working

**Simulation core (`index.html`, `<script>` block):**
- 2D canvas 900×600 with wraparound edges
- 60-120 boids, each with a 7-gene genome: `speed`, `perception`, `cohesion`, `alignment`, `separation`, `fleeStrength`, `size`
- Classic three Reynolds rules (separation, alignment, cohesion) plus predator flee and food seek
- 40 food particles (green dots), 2 predators (red circles with simple nearest-prey hunting)
- Asynchronous evolution: reproduction at energy > 70 with mutation, death at energy ≤ 0 or predator contact
- Emergency respawn when population drops below 20
- Energy drain proportional to `speed × 0.5 + size × 0.3`, creating natural selection pressure against large fast agents
- HSL color encoding of genome for visual drift detection

**UI:**
- Right sidebar: sliders for sim speed (1-8×), food count (5-100), predator count (0-6), mutation rate (0-50%)
- Population metrics panel (current, avg age, births, deaths, eaten, tick)
- Per-gene sparkline history panel (200 ticks of history)
- Three commentary panels below canvas:
  1. User actions log (yellow) — auto-populated on slider change
  2. Observed dynamics (green) — rule-based trend detector running every 30 ticks
  3. Claude commentary (purple, full-width) — on-demand LLM analysis via proxy

**Proxy (`proxy.js`):**
- Node.js HTTP server on port 8787, single endpoint `POST /claude`
- Accepts `{ prompt: string }`, forwards to `api.anthropic.com/v1/messages`
- Reads `ANTHROPIC_API_KEY` from environment, model from `CLAUDE_MODEL` (defaults to `claude-sonnet-4-5`)
- CORS open (`*`) for local development
- No npm dependencies (stdlib only: `http`, `https`)

### What does NOT work yet

1. **No .env auto-loading**: `proxy.js` reads from `process.env` but the project doesn't load `.env` files. User has to `export` manually.
2. **No static file server**: user has to open `index.html` directly via `file://`, which breaks some browser security features and feels amateurish. Should serve HTML from the same Node process as the proxy.
3. **No persistence**: simulation state, user history, and exported genomes are lost on page reload. Should persist to `localStorage` or, better, to disk via a proxy endpoint.
4. **Claude panel has no loading indicator animation** — just static "Думає..." text. Should have a subtle progress animation.
5. **No automatic observations on user actions**: when the user changes a slider, panels 1 and 2 update independently. There's no causal link — the system doesn't say "you increased predators to 5, and 30 seconds later cohesion started rising". The correlation exists implicitly in the data but is not surfaced.
6. **Single window only**: no way to run multiple simulations in parallel with different parameters for comparison.
7. **No seed control**: every run starts random, reproducibility is impossible.
8. **Spatial lookup is O(n²)**: works fine up to ~200 boids but slows visibly above. The roadmap explicitly defers spatial hashing to iteration 2, but if it's a 30-minute fix, do it here.
9. **No export of full history**: Export top 10 only dumps current longest-lived boids. Should also offer "export full run as JSON" for external analysis.
10. **No keyboard shortcuts**: space to pause, R to reset, C to ask Claude would be natural.
11. **No mobile layout**: breaks on narrow screens below ~1100px.
12. **Proxy has no rate limiting or request deduplication**: clicking "Ask Claude" twice in quick succession makes two API calls.

---

## 2 — Completion criteria (what "done" looks like)

A user with a fresh machine should be able to:

```bash
git clone <repo> swarm-evolution-v1
cd swarm-evolution-v1
cp .env.example .env
# edit .env, paste API key
npm start
# opens http://localhost:8787 in browser automatically
```

...and have a fully functional simulator with working Claude commentary, persistent state across reloads, and no manual steps beyond editing the `.env` file once. No separate terminals. No `file://` URLs. No CORS workarounds. No "open index.html manually" instructions.

---

## 3 — Required work, in priority order

### P0 — Must have (blocks "done" state)

#### 3.1 Unified server: serve HTML + proxy from one process

Modify `proxy.js` to also serve static files from the project directory. The same server (port 8787 by default) should:

- `GET /` → serve `index.html`
- `GET /<anything>.html|.js|.css|.ico` → serve from project root with correct Content-Type
- `POST /claude` → existing proxy behavior (unchanged)
- `POST /save` → new endpoint for state persistence (see 3.3)
- `GET /state` → new endpoint to load last saved state

Use only Node.js stdlib (`http`, `fs`, `path`, `url`). Do not add `express` or any npm dependencies — the entire value prop is "zero-install, zero-build".

MIME types to handle: `text/html`, `application/javascript`, `text/css`, `application/json`, `image/x-icon`, `text/markdown`.

Directory traversal must be blocked: resolve requested paths against the project root and reject anything that escapes it.

#### 3.2 `.env` loading

Implement a minimal `.env` parser (≤30 lines, no dependencies). Read `.env` if it exists at process start, apply values to `process.env` unless already set, print warning if `ANTHROPIC_API_KEY` is still missing after the load.

Format: `KEY=value` per line, `#` starts a comment, empty lines ignored, values optionally in double quotes (which are stripped). No need to handle multiline values or variable interpolation.

#### 3.3 State persistence

Add `POST /save` and `GET /state` endpoints to the server. Save simulation state (params, user log, observations, history) to `./state.json` on the server. Auto-save every 30 seconds while simulation is running, plus explicit save on browser `beforeunload`.

On page load, if `./state.json` exists and is less than 24 hours old, offer (via a subtle banner at the top of the page) to restore the previous session. Banner has two buttons: "Вiдновити" and "Почати нову".

Do NOT persist the boid entities themselves (positions, velocities) — only the aggregate data. Simulation always starts fresh on load, because random initial positions are not interesting to preserve. What IS interesting to preserve: user log, observation history, genes history series, and the current slider parameters.

Also add a new button next to "Export top 10" labeled "Export full run". It downloads a JSON file with the complete history (population series, gene series, user log, observations, settings) — this is the seed format for iteration 2 (Python/pygame simulator).

#### 3.4 Auto-open browser on startup

After the server starts listening, automatically open the default browser to `http://localhost:8787`. Use the platform-appropriate command:
- macOS: `open <url>`
- Linux: `xdg-open <url>`
- Windows: `start <url>`

Detect via `process.platform`. If the spawn fails silently (e.g. headless server), just log the URL and continue.

#### 3.5 Causal observation linking

When a user action happens (slider change), mark the current tick. After 60 ticks, when trend detection runs, check if any significant change happened in the 60 ticks AFTER the user action. If yes, produce an observation in panel 2 tagged as "reaction to user action":

> `[reaction] Пiсля збiльшення хижакiв до 5, cohesion ↑ на 0.12 за 60 тiкiв`

Display these reaction-type observations with a distinct color (e.g. yellow-green) to distinguish from autonomous trends.

This makes the causal link between user actions and population response explicit — which is the whole point of having both panels 1 and 2.

### P1 — Should have (significant quality improvements)

#### 3.6 Keyboard shortcuts

- `Space` → toggle pause/resume
- `R` → reset (with confirmation dialog)
- `C` → ask Claude
- `E` → export top 10
- `1`..`8` → set sim speed to that value
- `?` → show/hide keyboard shortcut cheatsheet overlay

Implement via a single `keydown` listener on `window`. Ignore shortcuts when focus is on an `<input>` element (so sliders still work normally).

#### 3.7 Loading animation for Claude panel

Replace the static "Думає..." button label with:
- Button shows a rotating spinner (CSS `@keyframes`) and text "Claude думає..."
- Panel body shows an animated ellipsis progression: `.` → `..` → `...` in 500ms intervals during fetch
- On success, smooth fade-in of the response text (CSS `@keyframes` opacity transition)

#### 3.8 Request deduplication

In `index.html`, track whether a Claude request is in flight. Ignore button clicks while pending. Already partly done (`btn.disabled = true`), but add an `AbortController` to cancel pending requests on page unload.

#### 3.9 Rate limiting in proxy

Add a simple token bucket in `proxy.js`: max 10 requests per minute per client IP, return HTTP 429 when exceeded. Don't use any library — hand-roll a `Map<string, { tokens, lastRefill }>` with a 30-second cleanup interval.

#### 3.10 Seed control for reproducibility

Add a "Seed" field next to the Reset button. If filled, use it to seed a deterministic PRNG (Mulberry32 is fine, 10 lines) instead of `Math.random`. Empty = current random behavior.

When the user runs an interesting experiment and wants to reproduce it, they set the seed explicitly, and the same genome convergence pattern unfolds.

Export should include the seed in the JSON.

### P2 — Nice to have (stretch goals)

#### 3.11 Spatial hash grid

Replace the naive O(n²) neighbor lookup with a uniform grid where cell size = maximum perception radius (~110px). For each step, bin all boids into cells, and when querying neighbors, only check the 9 adjacent cells. This is a 50-line change and should bring the simulation to comfortable 1000+ boids at 60fps.

Note: this is technically iteration 2 territory per the roadmap. Include it if time permits, but don't let it block P0/P1 items.

#### 3.12 Multi-window comparison mode

Add a "New window" button that opens a second browser tab running an independent simulation with its own state. Both tabs share the `state.json` file but keyed by tab ID (use `sessionStorage.tabId`). This lets the user run two experiments side by side.

Don't implement inter-tab communication — they're independent. Just make sure `state.json` structure supports multiple named slots.

#### 3.13 Mobile layout

Add CSS media query for screens below 1100px: canvas stacks on top, sidebar moves below, commentary panels stack vertically. Canvas should scale to fit width while preserving aspect ratio.

#### 3.14 Export formats

Add two more export options alongside "Export top 10" and "Export full run":
- **Export as CSV**: flat table of tick / population / gene averages, suitable for opening in Excel/pandas
- **Export as image**: `canvas.toBlob()` → PNG download of current state

#### 3.15 Onboarding tooltip

On first visit (detect via missing `state.json`), show a small dismissable overlay explaining the three commentary panels and pointing to the Ask Claude button. Store dismissal in `localStorage`.

---

## 4 — Constraints

### Hard constraints (do not violate)

- **No build step**. No webpack, vite, babel, typescript compilation. The project must run by executing `node proxy.js` with zero prior build.
- **No npm runtime dependencies**. `package.json` should have an empty `dependencies` object. Only Node.js stdlib (`http`, `https`, `fs`, `path`, `url`, `crypto`).
- **No frameworks in the browser**. No React, Vue, Svelte. Vanilla JS, Canvas 2D, inline `<script>` block. Exception: if a tiny single-file library (<5KB, MIT/Apache license) is genuinely necessary, vendor it into the HTML as a `<script>` block with a source comment.
- **Ukrainian UI strings**. All labels, button text, panel titles, tooltips, error messages shown to the user must be in Ukrainian. Code comments, variable names, internal logs, and this documentation stay in English.
- **No emoji in any output**. Per user's standing instructions, never include emoji in UI, diagrams, documents, code, or text. Use text labels or SVG icons instead.
- **Single HTML file for the simulator**. `index.html` stays self-contained with inline CSS and JS. Do not split into separate `.js` / `.css` files. The file is the delivery artifact.

### Soft constraints (prefer but not enforced)

- Target ~60fps at 120 boids on a 2020-era laptop.
- Keep total project size under 100KB (excluding `node_modules`, which should be empty).
- Prefer clarity over cleverness in code. This is research tooling; the user will read and modify it.

### Compatibility

- Node.js 18+ (uses no Node-20-specific features; `fetch` is available in 18 but proxy already uses `https` module, so no dependency)
- Modern evergreen browsers only (Chrome 100+, Firefox 100+, Safari 15+). No IE, no polyfills.
- Linux, macOS, Windows — no OS-specific paths or commands outside the browser-open logic.

---

## 5 — Testing & verification

After completion, verify by running this sequence on a clean checkout:

1. `cp .env.example .env`, add real API key
2. `npm start`
3. Browser should open automatically to `http://localhost:8787`
4. Simulation should start running immediately
5. Move sliders — entries should appear in panel 1 (yellow)
6. Wait 2 minutes — entries should appear in panel 2 (green)
7. Click "Запитати Claude" — response should appear in panel 3 within 5 seconds
8. Press `Space` — simulation pauses, button changes to "Resume"
9. Press `Space` again — resumes
10. Press `E` — console shows exported genomes
11. Click "Export full run" — browser downloads JSON file
12. Close browser tab, run `npm start` again — banner should offer to restore the previous session
13. Click "Вiдновити" — user log, observations, and sparkline history should reappear
14. Kill server with Ctrl+C — should exit cleanly without leaving orphaned processes

All 14 steps should pass without manual intervention beyond what's described.

---

## 6 — Files to create, modify, delete

### Create
- (none — everything can be done by modifying existing files)

### Modify
- `index.html` — add keyboard shortcuts (P1), state persistence hooks (P0), reaction observations (P0), loading animations (P1), seed control (P1), additional exports (P2), mobile CSS (P2), onboarding (P2)
- `proxy.js` — unify with static server (P0), load `.env` (P0), add `/save` and `/state` endpoints (P0), auto-open browser (P0), rate limiting (P1)
- `package.json` — simplify `start` script to just `node proxy.js` (both static serving and proxy handled there)
- `README.md` — update to reflect the unified server flow (`npm start` replaces the two-terminal dance)

### Delete
- (none)

---

## 7 — Style and conventions

- Indent: 2 spaces
- Strings: double quotes in JS, single quotes in HTML attributes
- Functions: prefer `const foo = () => ...` for short utilities, `function foo() {...}` for longer named exports
- Constants: `UPPER_SNAKE_CASE` for compile-time values, `camelCase` for runtime variables
- Comments: sparse, only where logic is non-obvious. Explain the *why*, not the *what*
- Commits (if using git): imperative present tense, descriptive: "add state persistence endpoint", not "added stuff"

---

## 8 — Out of scope (explicitly deferred)

These items are part of iteration 2 or later and should NOT be added to v1 even if they seem easy:

- Python/pygame port
- Spatial indexing beyond simple grid (quadtree, k-d tree)
- Obstacles or walls in the simulation
- Neural network controllers (NEAT)
- StarCraft/SMAC integration
- Multi-agent tasks (patrol, convoy, search-and-track)
- Physics engine (ARGoS, Webots)
- Real robot deployment hooks
- User authentication or multi-user support
- Cloud deployment
- Docker/containerization
- CI/CD pipelines

If any of these feel tempting, refer to the main `swarm-simulator-roadmap.md` — they belong to iterations 2-5 and will be implemented with different tooling and architecture.

---

## 9 — Questions to resolve before starting (optional)

If any of the following are unclear, ask the user before writing code:

1. Should state persistence use `./state.json` at project root, or a hidden file in `~/.swarm-evolution/`? Default answer: project root, for simplicity and transparency.
2. Should the unified server also handle HTTPS for security, or plain HTTP is fine for localhost? Default: plain HTTP.
3. Should rate limiting be per-IP or global? Default: per-IP.
4. For the reaction observations (3.5), what's the minimum lag before attributing a gene shift to a user action? Default: 30 ticks minimum, 120 ticks maximum window.

---

## 10 — Deliverables checklist

When complete, all of the following should be true:

- [ ] `npm start` launches everything in one command
- [ ] Browser opens automatically
- [ ] `.env` loading works without external deps
- [ ] Static files served from same process as proxy
- [ ] State persists across reloads with recovery banner
- [ ] Claude panel works with nice loading animation
- [ ] Keyboard shortcuts functional
- [ ] Reaction observations appear when causality is clear
- [ ] Seed control enables reproducibility
- [ ] Export full run produces valid JSON
- [ ] Rate limiting protects against accidental API spam
- [ ] Clean shutdown on Ctrl+C
- [ ] README updated to reflect single-command workflow
- [ ] No new npm dependencies introduced
- [ ] All UI strings still in Ukrainian
- [ ] No emoji anywhere in output
- [ ] Works on Chrome, Firefox, Safari
- [ ] Project directory stays under 100KB

---

**End of specification.**

This document should be enough for Claude Code to take the current state of the project and complete it without further guidance. If ambiguity arises, default to the simplest interpretation that satisfies the hard constraints.
