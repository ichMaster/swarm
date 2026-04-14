# Issues — Swarm Evolution v1

Phased execution plan with dependencies. Each issue is a discrete unit of work.

## Summary

| #  | Issue | Phase | Depends on | Priority |
|----|-------|-------|------------|----------|
| 01 | Scaffold directory structure | 1 | -- | P0 |
| 02 | Extract server + claude-proxy | 1 | 01 | P0 |
| 03 | Split index.html into client modules | 1 | 01 | P0 |
| 04 | Static file server | 1 | 02 | P0 |
| 05 | Update package.json, delete old files | 1 | 02,03,04 | P0 |
| 06 | .env parser | 2 | 02 | P0 |
| 07 | State persistence (server + client) | 2 | 03,04 | P0 |
| 08 | Auto-open browser on startup | 2 | 02 | P0 |
| 09 | Causal observation linking | 2 | 03 | P0 |
| 10 | Keyboard shortcuts | 3 | 03 | P1 |
| 11 | Claude panel loading animation | 3 | 03 | P1 |
| 12 | Request deduplication | 3 | 03 | P1 |
| 13 | Rate limiting | 3 | 02 | P1 |
| 14 | Seed control (PRNG) | 3 | 03 | P1 |
| 15 | Test: env parser | 4 | 06 | P1 |
| 16 | Test: static server | 4 | 04 | P1 |
| 17 | Test: claude-proxy | 4 | 02 | P1 |
| 18 | Test: state persistence | 4 | 07 | P1 |
| 19 | Test: rate limiter | 4 | 13 | P1 |
| 20 | Test: simulation | 4 | 03 | P1 |
| 21 | Test: PRNG | 4 | 14 | P1 |
| 22 | Test: client state | 4 | 07 | P1 |
| 23 | Test: integration | 4 | 04,06,07,13 | P1 |
| 24 | Spatial hash grid | 5 | 03 | P2 |
| 25 | Multi-window comparison | 5 | 07 | P2 |
| 26 | Mobile layout | 5 | 03 | P2 |
| 27 | Additional export formats | 5 | 07 | P2 |
| 28 | Onboarding tooltip | 5 | 07 | P2 |
| 29 | Update README | 6 | all | P2 |
| 30 | Manual verification pass | 6 | 29 | P2 |

---

## Phase 1 — Project Restructuring

Foundation work. Everything else depends on the new structure being in place.

### ISSUE-01: Scaffold project directory structure

**Description:** Create the target directory layout for the restructured project. This is the foundation for all subsequent work.

**What should be done:**
- Create directories: `src/server/`, `src/client/js/`, `src/client/css/`, `test/server/`, `test/client/`, `test/integration/`
- Do not modify or delete any existing files

**Expected results:** Empty directory tree matching the target project structure from spec section 1 is in place. All subsequent issues can create files in these directories.

**Acceptance criteria:**
- [ ] `src/server/` directory exists
- [ ] `src/client/js/` directory exists
- [ ] `src/client/css/` directory exists
- [ ] `test/server/` directory exists
- [ ] `test/client/` directory exists
- [ ] `test/integration/` directory exists
- [ ] No existing files were modified or deleted

**Dependencies:** none
**Spec ref:** section 1, "Target project structure"

---

### ISSUE-02: Extract server — create `src/server/index.js` and `src/server/claude-proxy.js`

**Description:** Extract the monolithic `proxy.js` into modular server components with a composable routing entry point.

**What should be done:**
- Create `src/server/claude-proxy.js` — extract proxy logic from `proxy.js`, export as `(req, res) => void` handler
- Create `src/server/index.js` — entry point that creates HTTP server, routes requests to handlers by URL/method
- Remove CORS headers (no longer needed — same-origin serving)
- Use only Node.js stdlib (`http`, `https`, `fs`, `path`, `url`)

**Expected results:** Running `node src/server/index.js` starts an HTTP server on port 8787. `POST /claude` proxies requests to Anthropic API identically to the old `proxy.js`.

**Acceptance criteria:**
- [ ] `src/server/index.js` exists and starts an HTTP server on port 8787
- [ ] `src/server/claude-proxy.js` exports a `(req, res) => void` handler
- [ ] `POST /claude` with `{ prompt: "test" }` proxies to Anthropic API and returns response
- [ ] CORS headers removed (same-origin serving)
- [ ] Server uses only Node.js stdlib (no npm dependencies)
- [ ] `node src/server/index.js` starts without errors

**Dependencies:** ISSUE-01
**Spec ref:** 3.1

---

### ISSUE-03: Split `index.html` into client modules

**Description:** Break the monolithic `index.html` (single-file simulator) into separate ES module files with clean separation of concerns.

**What should be done:**
- Create `src/client/index.html` — HTML shell with `<script type="module">` imports
- Create `src/client/css/style.css` — extract all styles from inline `<style>`
- Create `src/client/js/simulation.js` — boids engine, Reynolds rules, evolution logic (pure functions, no DOM)
- Create `src/client/js/renderer.js` — Canvas 2D drawing
- Create `src/client/js/ui.js` — sliders, panels, sparklines, DOM updates
- Create `src/client/js/claude.js` — Claude API client
- Create `src/client/js/main.js` — app bootstrap, wires modules together

**Expected results:** The simulation runs identically in the browser as before. Core simulation logic is testable in Node.js without a DOM. All UI strings remain in Ukrainian.

**Acceptance criteria:**
- [ ] All 7 client files created in correct locations
- [ ] `index.html` uses `<script type="module">` to load JS
- [ ] CSS extracted from inline `<style>` into `css/style.css`
- [ ] Simulation runs identically to the monolithic version in browser
- [ ] `simulation.js` exports pure functions with no DOM dependency
- [ ] `simulation.js` can be imported in Node.js without errors
- [ ] All UI strings remain in Ukrainian
- [ ] No emoji in any file

**Dependencies:** ISSUE-01
**Spec ref:** section 1 "Target project structure", section 4 constraints

---

### ISSUE-04: Create static file server module `src/server/static.js`

**Description:** Add a static file server module so the same Node process serves both HTML/JS/CSS and the API proxy.

**What should be done:**
- Create `src/server/static.js` exporting a `(req, res) => void` handler
- Serve files from `src/client/` with correct MIME types: `text/html`, `application/javascript`, `text/css`, `application/json`, `image/x-icon`
- Block directory traversal — resolve paths against client root, reject anything that escapes
- Serve `index.html` for `GET /`

**Expected results:** All client assets are served from the same HTTP server. No need for `file://` URLs or separate static server.

**Acceptance criteria:**
- [ ] `GET /` returns `src/client/index.html` with `Content-Type: text/html`
- [ ] `.js` files served with `Content-Type: application/javascript`
- [ ] `.css` files served with `Content-Type: text/css`
- [ ] Requests with `../` return 400/403 (directory traversal blocked)
- [ ] Missing files return 404
- [ ] Module exports a `(req, res) => void` handler

**Dependencies:** ISSUE-02
**Spec ref:** 3.1

---

### ISSUE-05: Update `package.json` and delete old files

**Description:** Finalize the restructuring by updating scripts and removing the old monolithic files.

**What should be done:**
- Update `start` script to `node src/server/index.js`
- Add test scripts: `test`, `test:server`, `test:client`, `test:integration`
- Delete root-level `proxy.js` (replaced by `src/server/`)
- Delete root-level `index.html` (replaced by `src/client/`)
- Ensure `dependencies` and `devDependencies` are both empty

**Expected results:** `npm start` launches the new unified server. `npm test` runs all tests. No orphaned files from the old structure remain.

**Acceptance criteria:**
- [ ] `npm start` runs `node src/server/index.js`
- [ ] `npm test` runs `node --test test/**/*.test.js`
- [ ] `npm run test:server`, `test:client`, `test:integration` scripts exist
- [ ] Root `proxy.js` deleted
- [ ] Root `index.html` deleted
- [ ] `dependencies` is empty in `package.json`
- [ ] `devDependencies` is empty in `package.json`

**Dependencies:** ISSUE-02, ISSUE-03, ISSUE-04
**Spec ref:** section 6

---

## Phase 2 — P0 Features (blocks "done" state)

Core functionality. Can be worked in parallel after Phase 1 is complete.

### ISSUE-06: Implement `.env` parser — `src/server/env.js`

**Description:** Add a minimal `.env` file parser so users only need to create a `.env` file instead of manually exporting environment variables.

**What should be done:**
- Create `src/server/env.js` — a <=30-line parser (no dependencies)
- Read `.env` at process start, set `process.env` values
- Handle: `KEY=value` lines, `#` comments, empty lines, double-quoted values (strip quotes)
- Do not overwrite pre-existing env vars
- Print warning to stderr if `ANTHROPIC_API_KEY` is missing after load
- Handle missing `.env` file gracefully (no crash)

**Expected results:** `cp .env.example .env` + adding the key is the only setup step. No manual `export` needed.

**Acceptance criteria:**
- [ ] Parses `KEY=value` lines and sets `process.env`
- [ ] Ignores `#` comment lines and empty lines
- [ ] Strips double quotes from values (`"value"` -> `value`)
- [ ] Does not overwrite pre-existing env vars
- [ ] Prints warning to stderr if `ANTHROPIC_API_KEY` is missing after load
- [ ] Handles missing `.env` file gracefully (no crash)
- [ ] Implementation is <=30 lines

**Dependencies:** ISSUE-02
**Spec ref:** 3.2

---

### ISSUE-07: Implement state persistence — `src/server/state.js` + `src/client/js/state.js`

**Description:** Add server-side state storage and client-side auto-save/restore so simulation history survives page reloads.

**What should be done:**
- Server: create `src/server/state.js` with `POST /save` (writes to `./state.json`) and `GET /state` (reads back, 404 if missing)
- Client: create `src/client/js/state.js` with auto-save every 30s + on `beforeunload`
- On page load, if state exists and is <24h old, show restore banner with "Вiдновити" / "Почати нову" buttons
- Persist: user log, observation history, gene history series, slider parameters
- Do NOT persist boid entities (positions, velocities)
- Add "Експорт повного запуску" button — downloads JSON with complete history

**Expected results:** Users can close and reopen the browser without losing their experiment history. Full run data can be exported for external analysis.

**Acceptance criteria:**
- [ ] `POST /save` writes JSON body to `./state.json`
- [ ] `GET /state` returns contents of `./state.json`
- [ ] `GET /state` returns 404 when no file exists
- [ ] Client auto-saves every 30 seconds
- [ ] Client saves on `beforeunload`
- [ ] Restore banner appears on load when state is <24h old
- [ ] Banner shows "Вiдновити" and "Почати нову" buttons (Ukrainian)
- [ ] Boid entities are NOT persisted (only aggregate data)
- [ ] "Експорт повного запуску" button downloads JSON with full history

**Dependencies:** ISSUE-03, ISSUE-04
**Spec ref:** 3.3

---

### ISSUE-08: Auto-open browser on startup

**Description:** Automatically open the user's default browser when the server starts, eliminating the manual "open localhost" step.

**What should be done:**
- After server starts listening, spawn the platform-appropriate open command
- macOS: `open <url>`, Linux: `xdg-open <url>`, Windows: `start <url>`
- Detect platform via `process.platform`
- If spawn fails (headless environment), log the URL and continue without crashing

**Expected results:** Running `npm start` opens `http://localhost:8787` in the browser automatically. On headless systems, the URL is printed to stdout.

**Acceptance criteria:**
- [ ] Browser opens automatically after `npm start`
- [ ] Uses `open` on macOS, `xdg-open` on Linux, `start` on Windows
- [ ] Does not crash on headless environments (fails silently)
- [ ] URL opened is `http://localhost:8787`

**Dependencies:** ISSUE-02
**Spec ref:** 3.4

---

### ISSUE-09: Causal observation linking

**Description:** Surface the causal link between user slider changes and resulting gene/population shifts, making the connection between panels 1 and 2 explicit.

**What should be done:**
- When a slider changes, record the action with the current tick number
- After 60 ticks, check if any significant gene or population change occurred since the action
- If yes, produce a reaction-type observation in panel 2 with yellow-green color
- Format: `[reaction] Пiсля збiльшення хижакiв до 5, cohesion [up arrow] на 0.12 за 60 тiкiв`
- Include: which slider changed, to what value, which gene shifted, by how much

**Expected results:** When users adjust parameters, the system explicitly tells them what effect their change had on the population after 60 ticks.

**Acceptance criteria:**
- [ ] Slider changes are recorded with their tick number
- [ ] After 60 ticks, gene/population changes are checked against recorded actions
- [ ] Reaction observations appear in panel 2 with yellow-green color
- [ ] Reaction text includes: which slider changed, to what value, which gene shifted, by how much
- [ ] All observation text is in Ukrainian

**Dependencies:** ISSUE-03
**Spec ref:** 3.5

---

## Phase 3 — P1 Features (quality improvements)

Can be worked in parallel. Each issue is independent.

### ISSUE-10: Keyboard shortcuts — `src/client/js/main.js`

**Description:** Add keyboard shortcuts for common actions to speed up the research workflow.

**What should be done:**
- Add a single `keydown` listener on `window`
- Ignore shortcuts when focus is on an `<input>` element
- Implement: `Space` (pause/resume), `R` (reset with confirmation), `C` (ask Claude), `E` (export top 10), `1`..`8` (set sim speed), `?` (toggle cheatsheet overlay)
- Create a cheatsheet overlay listing all shortcuts

**Expected results:** Power users can control the simulation entirely from the keyboard. Sliders still work normally when focused.

**Acceptance criteria:**
- [ ] All 6 shortcuts work as specified
- [ ] Shortcuts are ignored when an `<input>` element has focus
- [ ] `?` toggles a visible cheatsheet overlay listing all shortcuts
- [ ] `R` shows a confirmation dialog before resetting
- [ ] Single `keydown` listener (not multiple per-key listeners)

**Dependencies:** ISSUE-03
**Spec ref:** 3.6

---

### ISSUE-11: Claude panel loading animation

**Description:** Replace the static "Думає..." text with a proper loading animation during Claude API requests.

**What should be done:**
- Button: show a CSS rotating spinner + text "Claude думає..." during request
- Panel body: show animated ellipsis (`.` -> `..` -> `...`) in 500ms intervals during fetch
- On response: smooth fade-in of response text (CSS opacity transition)
- All animations must use CSS `@keyframes` only — no JS animation loops

**Expected results:** Users get clear visual feedback that a request is in progress and see the response appear smoothly.

**Acceptance criteria:**
- [ ] Button shows CSS spinner and "Claude думає..." during request
- [ ] Panel body shows animated ellipsis (`.` -> `..` -> `...`) in 500ms intervals
- [ ] Response text fades in on arrival (CSS opacity transition)
- [ ] All animations use CSS `@keyframes` only, no JS animation loops
- [ ] No visual glitches on rapid click/response cycles

**Dependencies:** ISSUE-03
**Spec ref:** 3.7

---

### ISSUE-12: Request deduplication — `src/client/js/claude.js`

**Description:** Prevent duplicate API calls when the user clicks the Claude button multiple times while a request is pending.

**What should be done:**
- Track in-flight request state in `claude.js`
- Ignore button clicks while a request is pending
- Add `AbortController` to cancel pending request on page `beforeunload`

**Expected results:** Only one Claude API request is active at a time. Pending requests are cancelled on page unload.

**Acceptance criteria:**
- [ ] Clicking "Ask Claude" while a request is in-flight is ignored
- [ ] Button is visually disabled during pending request
- [ ] `AbortController` cancels pending request on `beforeunload`
- [ ] No duplicate API calls on rapid button clicks

**Dependencies:** ISSUE-03
**Spec ref:** 3.8

---

### ISSUE-13: Rate limiting — `src/server/rate-limiter.js`

**Description:** Add server-side rate limiting to prevent accidental API cost spikes from rapid Claude requests.

**What should be done:**
- Create `src/server/rate-limiter.js` with a token-bucket implementation
- Max 10 requests per minute per client IP
- Return HTTP 429 with a descriptive message when exceeded
- Hand-roll a `Map<string, { tokens, lastRefill }>` with 30-second cleanup interval
- No npm dependencies

**Expected results:** Accidental rapid clicks or scripts cannot exceed 10 API calls/minute. Legitimate use is unaffected.

**Acceptance criteria:**
- [ ] Requests under 10/min per IP pass through normally
- [ ] 11th request within 1 minute returns HTTP 429
- [ ] Tokens refill over time (requests succeed again after cooldown)
- [ ] Different IPs are tracked independently
- [ ] Stale entries cleaned up every 30 seconds
- [ ] No npm dependencies used

**Dependencies:** ISSUE-02
**Spec ref:** 3.9

---

### ISSUE-14: Seed control — `src/client/js/prng.js`

**Description:** Add deterministic PRNG support so users can reproduce interesting simulation runs with a specific seed.

**What should be done:**
- Create `src/client/js/prng.js` — implement Mulberry32 PRNG as a pure function
- Add "Seed" input field in the UI next to the Reset button
- If seed is filled, use deterministic PRNG instead of `Math.random()`
- If seed is empty, use default random behavior
- Include seed value in export JSON

**Expected results:** Users can set a seed, run an experiment, share the seed, and others can reproduce the exact same simulation.

**Acceptance criteria:**
- [ ] Mulberry32 PRNG implemented and exported as pure function
- [ ] "Seed" input field visible next to Reset button
- [ ] Same seed produces identical simulation runs
- [ ] Empty seed field falls back to `Math.random()`
- [ ] Seed value included in export JSON
- [ ] PRNG module importable in Node.js without DOM

**Dependencies:** ISSUE-03
**Spec ref:** 3.10

---

## Phase 4 — Tests

Tests can be written as soon as the module they test exists. Grouped here for clarity but individual tests can start earlier.

### ISSUE-15: Server unit tests — `test/server/env.test.js`

**Description:** Unit tests for the `.env` parser module to verify all parsing edge cases.

**What should be done:**
- Create `test/server/env.test.js` using `node:test` + `node:assert`
- Write tests covering: `KEY=value` parsing, `#` comments, empty lines, double-quoted values, missing file handling, env var non-overwrite behavior

**Expected results:** All `.env` parser behavior is verified automatically. Tests pass with `node --test test/server/env.test.js`.

**Acceptance criteria:**
- [ ] Test: parses `KEY=value` correctly
- [ ] Test: ignores `#` comment lines
- [ ] Test: ignores empty lines
- [ ] Test: strips double quotes from values
- [ ] Test: handles missing `.env` file without crash
- [ ] Test: does not overwrite existing env vars
- [ ] All tests pass with `node --test test/server/env.test.js`

**Dependencies:** ISSUE-06
**Spec ref:** section 5

---

### ISSUE-16: Server unit tests — `test/server/static.test.js`

**Description:** Unit tests for the static file server to verify MIME types, 404 handling, and directory traversal protection.

**What should be done:**
- Create `test/server/static.test.js` using `node:test` + `node:assert`
- Write tests covering: correct MIME types for `.html`/`.js`/`.css`, 404 for missing files, directory traversal blocking, `GET /` returning `index.html`

**Expected results:** Static file serving behavior is verified including security (traversal). Tests pass with `node --test test/server/static.test.js`.

**Acceptance criteria:**
- [ ] Test: `.html` served as `text/html`
- [ ] Test: `.js` served as `application/javascript`
- [ ] Test: `.css` served as `text/css`
- [ ] Test: missing file returns 404
- [ ] Test: `../` traversal returns 400/403
- [ ] Test: `GET /` returns `index.html`
- [ ] All tests pass with `node --test test/server/static.test.js`

**Dependencies:** ISSUE-04
**Spec ref:** section 5

---

### ISSUE-17: Server unit tests — `test/server/claude-proxy.test.js`

**Description:** Unit tests for the Claude API proxy handler with a mocked upstream API.

**What should be done:**
- Create `test/server/claude-proxy.test.js` using `node:test` + `node:assert`
- Mock the Anthropic API upstream
- Write tests covering: prompt forwarding, text extraction from response, API error handling, missing prompt rejection, invalid JSON rejection

**Expected results:** Proxy behavior is verified without hitting the real Anthropic API. Tests pass with `node --test test/server/claude-proxy.test.js`.

**Acceptance criteria:**
- [ ] Test: forwards prompt to Anthropic API (mocked)
- [ ] Test: returns extracted text from API response
- [ ] Test: handles API error responses gracefully
- [ ] Test: rejects requests with missing `prompt` field
- [ ] Test: rejects invalid JSON body
- [ ] All tests pass with `node --test test/server/claude-proxy.test.js`

**Dependencies:** ISSUE-02
**Spec ref:** section 5

---

### ISSUE-18: Server unit tests — `test/server/state.test.js`

**Description:** Unit tests for the state persistence endpoints verifying save/load round-trip and error handling.

**What should be done:**
- Create `test/server/state.test.js` using `node:test` + `node:assert`
- Write tests covering: saving state to disk, loading state from disk, 404 when no state file, handling corrupt JSON

**Expected results:** State persistence is verified including edge cases. Tests pass with `node --test test/server/state.test.js`.

**Acceptance criteria:**
- [ ] Test: `POST /save` writes state to disk
- [ ] Test: `GET /state` reads state from disk
- [ ] Test: returns 404 when no `state.json` exists
- [ ] Test: handles corrupt/invalid JSON gracefully
- [ ] All tests pass with `node --test test/server/state.test.js`

**Dependencies:** ISSUE-07
**Spec ref:** section 5

---

### ISSUE-19: Server unit tests — `test/server/rate-limiter.test.js`

**Description:** Unit tests for the token-bucket rate limiter verifying limits, refill, and per-IP tracking.

**What should be done:**
- Create `test/server/rate-limiter.test.js` using `node:test` + `node:assert`
- Write tests covering: requests under limit pass, 429 when exceeded, token refill over time, per-IP independent tracking

**Expected results:** Rate limiter correctly enforces limits and recovers. Tests pass with `node --test test/server/rate-limiter.test.js`.

**Acceptance criteria:**
- [ ] Test: allows requests under the 10/min limit
- [ ] Test: returns 429 when limit exceeded
- [ ] Test: tokens refill over time
- [ ] Test: tracks per-IP separately
- [ ] All tests pass with `node --test test/server/rate-limiter.test.js`

**Dependencies:** ISSUE-13
**Spec ref:** section 5

---

### ISSUE-20: Client unit tests — `test/client/simulation.test.js`

**Description:** Unit tests for the boids simulation engine verifying physics, evolution, and energy model.

**What should be done:**
- Create `test/client/simulation.test.js` using `node:test` + `node:assert`
- Write tests covering: Reynolds rules, energy drain formula (`speed * 0.5 + size * 0.3`), reproduction at energy > 70, death at energy <= 0, mutation rate, emergency respawn
- Tests must run in Node.js without any DOM dependency

**Expected results:** Core simulation logic is verified as pure functions. Tests pass with `node --test test/client/simulation.test.js`.

**Acceptance criteria:**
- [ ] Test: boid movement follows Reynolds rules
- [ ] Test: energy drain = `speed * 0.5 + size * 0.3`
- [ ] Test: reproduction triggers at energy > 70
- [ ] Test: death at energy <= 0
- [ ] Test: mutation within configured rate
- [ ] Test: emergency respawn below population threshold
- [ ] All tests run in Node.js without DOM dependencies

**Dependencies:** ISSUE-03
**Spec ref:** section 5

---

### ISSUE-21: Client unit tests — `test/client/prng.test.js`

**Description:** Unit tests for the Mulberry32 PRNG verifying determinism and distribution quality.

**What should be done:**
- Create `test/client/prng.test.js` using `node:test` + `node:assert`
- Write tests covering: same seed = same sequence, different seeds = different sequences, roughly uniform distribution

**Expected results:** PRNG determinism and quality are verified. Tests pass with `node --test test/client/prng.test.js`.

**Acceptance criteria:**
- [ ] Test: same seed produces identical sequence
- [ ] Test: different seeds produce different sequences
- [ ] Test: output distribution is roughly uniform
- [ ] All tests pass with `node --test test/client/prng.test.js`

**Dependencies:** ISSUE-14
**Spec ref:** section 5

---

### ISSUE-22: Client unit tests — `test/client/state.test.js`

**Description:** Unit tests for client-side state serialization verifying data integrity and graceful degradation.

**What should be done:**
- Create `test/client/state.test.js` using `node:test` + `node:assert`
- Write tests covering: serialization round-trip preserves all fields, missing fields handled gracefully

**Expected results:** State serialization is lossless and robust. Tests pass with `node --test test/client/state.test.js`.

**Acceptance criteria:**
- [ ] Test: serialization round-trip preserves all fields
- [ ] Test: handles missing fields gracefully (no crash)
- [ ] All tests pass with `node --test test/client/state.test.js`

**Dependencies:** ISSUE-07
**Spec ref:** section 5

---

### ISSUE-23: Integration tests — `test/integration/server.test.js`

**Description:** End-to-end tests that start the full server and verify all endpoints work together.

**What should be done:**
- Create `test/integration/server.test.js` using `node:test` + `node:assert`
- Start the server on a random port in each test
- Write tests covering: `GET /` returns HTML, `GET /css/style.css` returns CSS, `POST /claude` proxies correctly (mocked upstream), `POST /save` + `GET /state` round-trip, clean shutdown

**Expected results:** The full server stack works end-to-end. Tests pass with `node --test test/integration/server.test.js`.

**Acceptance criteria:**
- [ ] Test: server starts on a random port
- [ ] Test: `GET /` returns HTML with 200
- [ ] Test: `GET /css/style.css` returns CSS with correct MIME type
- [ ] Test: `POST /claude` proxies correctly (mocked upstream)
- [ ] Test: `POST /save` + `GET /state` round-trip preserves data
- [ ] Test: server shuts down cleanly without orphaned processes
- [ ] All tests pass with `node --test test/integration/server.test.js`

**Dependencies:** ISSUE-04, ISSUE-06, ISSUE-07, ISSUE-13
**Spec ref:** section 5

---

## Phase 5 — P2 Stretch Goals (optional)

Independent of each other. Only after Phases 1-4 are complete and passing.

### ISSUE-24: Spatial hash grid — `src/client/js/simulation.js`

**Description:** Optimize the O(n^2) neighbor lookup to support 1000+ boids at 60fps using a uniform spatial grid.

**What should be done:**
- Implement a uniform grid in `simulation.js` with cell size = max perception radius (~110px)
- For each step, bin all boids into cells
- When querying neighbors, check only the 9 adjacent cells
- Keep implementation to ~50 lines

**Expected results:** Simulation handles 1000+ boids at 60fps on a 2020-era laptop. Flocking behavior is identical to the O(n^2) version.

**Acceptance criteria:**
- [ ] Uniform grid with cell size = max perception radius (~110px)
- [ ] Neighbor queries check only 9 adjacent cells
- [ ] 1000+ boids run at 60fps on a 2020-era laptop
- [ ] Simulation behavior is identical to O(n^2) version
- [ ] Implementation is ~50 lines

**Dependencies:** ISSUE-03
**Spec ref:** 3.11

---

### ISSUE-25: Multi-window comparison mode

**Description:** Allow running two independent simulations side by side in separate browser tabs for parameter comparison.

**What should be done:**
- Add "Нове вiкно" button to the UI
- Clicking it opens a new tab with an independent simulation
- Assign each tab a unique ID via `sessionStorage.tabId`
- Key `state.json` entries by tab ID to support multiple slots
- No inter-tab communication

**Expected results:** Users can run two experiments with different parameters simultaneously and compare results visually.

**Acceptance criteria:**
- [ ] "Нове вiкно" button visible in UI
- [ ] Clicking it opens a new tab with independent simulation
- [ ] Each tab has its own `sessionStorage.tabId`
- [ ] `state.json` supports multiple named slots keyed by tab ID
- [ ] No inter-tab communication

**Dependencies:** ISSUE-07
**Spec ref:** 3.12

---

### ISSUE-26: Mobile layout

**Description:** Add responsive CSS so the simulator is usable on narrow screens and tablets.

**What should be done:**
- Add CSS media query for viewports below 1100px
- Canvas stacks on top, sidebar moves below
- Commentary panels stack vertically
- Canvas scales to fit width while preserving 1800:1200 aspect ratio

**Expected results:** The simulator is usable on tablets and narrow browser windows without horizontal scrolling.

**Acceptance criteria:**
- [ ] Media query triggers at <1100px viewport width
- [ ] Canvas stacks on top, sidebar moves below
- [ ] Commentary panels stack vertically
- [ ] Canvas scales to fit width preserving 1800:1200 aspect ratio
- [ ] No horizontal scroll on mobile

**Dependencies:** ISSUE-03
**Spec ref:** 3.13

---

### ISSUE-27: Additional export formats

**Description:** Add CSV and PNG export options alongside the existing JSON exports for external analysis and sharing.

**What should be done:**
- Add "Export CSV" button — downloads a `.csv` file with columns: tick, population, gene averages
- Add "Export image" button — uses `canvas.toBlob()` to download current canvas as PNG

**Expected results:** Users can export data as CSV for Excel/pandas analysis and capture the current canvas as an image.

**Acceptance criteria:**
- [ ] "Export CSV" button downloads a `.csv` file
- [ ] CSV contains columns: tick, population, gene averages
- [ ] CSV opens correctly in Excel/pandas
- [ ] "Export image" button downloads current canvas as `.png`
- [ ] PNG uses `canvas.toBlob()` for generation

**Dependencies:** ISSUE-07
**Spec ref:** 3.14

---

### ISSUE-28: Onboarding tooltip

**Description:** Show a first-visit overlay explaining the UI layout to new users.

**What should be done:**
- On first visit (no `state.json`), show a dismissable overlay
- Overlay explains the three commentary panels and the Ask Claude button
- Dismissable via close button or clicking outside
- Store dismissal in `localStorage` so it does not reappear
- All text in Ukrainian

**Expected results:** New users understand the UI layout on first visit. Returning users are not interrupted.

**Acceptance criteria:**
- [ ] Overlay appears on first visit (no `state.json`)
- [ ] Overlay explains the three commentary panels and Ask Claude button
- [ ] Overlay is dismissable (close button or click outside)
- [ ] Dismissal stored in `localStorage`
- [ ] Overlay does not appear on subsequent visits
- [ ] All text in Ukrainian

**Dependencies:** ISSUE-07
**Spec ref:** 3.15

---

## Phase 6 — Finalize

### ISSUE-29: Update `README.md`

**Description:** Update the README to reflect the new project structure and single-command workflow.

**What should be done:**
- Document the new `src/server/`, `src/client/`, `test/` structure
- Update setup instructions: `cp .env.example .env` + `npm start`
- Document `npm test`
- Remove old two-terminal instructions
- Keep README text in Ukrainian

**Expected results:** A new user can follow the README to set up and run the project in under 2 minutes.

**Acceptance criteria:**
- [ ] README reflects `src/server/`, `src/client/`, `test/` structure
- [ ] Setup instructions: `cp .env.example .env` + `npm start`
- [ ] `npm test` documented
- [ ] Old two-terminal instructions removed
- [ ] README text in Ukrainian

**Dependencies:** all previous phases
**Spec ref:** section 6

---

### ISSUE-30: Manual verification pass

**Description:** Run the full 14-step manual verification checklist from the spec on a clean checkout to confirm everything works end-to-end.

**What should be done:**
- Clone the repo into a fresh directory
- Follow the setup steps (`cp .env.example .env`, add API key, `npm start`)
- Walk through all 14 verification steps from specification/SPECIFICATION.md section 5
- Document any failures and fix before closing

**Expected results:** All 14 verification steps pass on a clean machine. The project is ready for daily research use.

**Acceptance criteria:**
- [ ] Clean checkout (`git clone` into fresh directory)
- [ ] `cp .env.example .env` + add real API key
- [ ] `npm start` launches server and opens browser
- [ ] Simulation starts running immediately
- [ ] Slider changes appear in panel 1 (yellow)
- [ ] Autonomous observations appear in panel 2 (green) after ~2 min
- [ ] "Запитати Claude" returns response in panel 3 within 5s
- [ ] `Space` pauses/resumes simulation
- [ ] `E` exports top 10 genomes
- [ ] "Export full run" downloads JSON
- [ ] Restart shows restore banner; "Вiдновити" restores state
- [ ] `Ctrl+C` shuts down server cleanly
- [ ] `npm test` passes all tests
- [ ] No emoji in any output

**Dependencies:** ISSUE-29
**Spec ref:** section 5 "Manual verification"

---

## Dependency Graph Summary

```
Phase 1 (restructure)
  ISSUE-01 (scaffold)
    +-- ISSUE-02 (extract server)     +-- ISSUE-03 (split client)
        +-- ISSUE-04 (static server)
        +-- ISSUE-05 (update package.json) <-- depends on 02, 03, 04

Phase 2 (P0 features) -- after Phase 1
  ISSUE-06 (env parser)        <-- depends on 02
  ISSUE-07 (state persistence) <-- depends on 03, 04
  ISSUE-08 (auto-open browser) <-- depends on 02
  ISSUE-09 (causal linking)    <-- depends on 03

Phase 3 (P1 features) -- parallel with Phase 2
  ISSUE-10 (keyboard shortcuts)     <-- depends on 03
  ISSUE-11 (loading animation)      <-- depends on 03
  ISSUE-12 (request deduplication)  <-- depends on 03
  ISSUE-13 (rate limiting)          <-- depends on 02
  ISSUE-14 (seed control)           <-- depends on 03

Phase 4 (tests) -- each test depends on its module
  ISSUE-15..23 (test files)

Phase 5 (P2 stretch) -- after Phases 1-4
  ISSUE-24..28 (optional features)

Phase 6 (finalize)
  ISSUE-29 (README)  <-- depends on all
  ISSUE-30 (manual verification) <-- depends on 29
```

---

## Parallel Execution Opportunities

Within each phase, many issues can be worked in parallel:

- **Phase 1:** ISSUE-02 and ISSUE-03 are independent (both depend only on ISSUE-01)
- **Phase 2:** ISSUE-06, ISSUE-08, ISSUE-09 are independent of each other
- **Phase 3:** all P1 issues (10-14) are independent of each other
- **Phase 4:** test issues are independent of each other (only depend on the module they test)
- **Phase 5:** all P2 issues are independent of each other
