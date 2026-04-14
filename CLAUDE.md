# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swarm Evolution v1 — a browser-based boids simulator with evolutionary selection and AI (Claude) commentary. Iteration 1 of a 5-iteration roadmap toward sim2real swarm intelligence on physical UGV robots. Zero runtime dependencies, zero build step.

## Commands

```bash
cp .env.example .env       # add ANTHROPIC_API_KEY (one-time setup)
npm start                  # starts server on port 8787, opens browser
npm test                   # run all tests (node:test)
npm run test:server        # server unit tests only
npm run test:client        # client logic unit tests only
npm run test:integration   # integration tests only
```

## Architecture

```
src/
  server/                  # Node.js server (stdlib only, no dependencies)
    index.js               # Entry point — composes routes, starts HTTP server
    env.js                 # .env file parser
    static.js              # Static file serving from src/client/
    claude-proxy.js        # POST /claude — proxies to Anthropic API
    state.js               # POST /save, GET /state — persistence
    rate-limiter.js        # Token-bucket rate limiter (per-IP)
  client/                  # Browser code — vanilla JS ES modules, no framework
    index.html             # HTML shell, loads JS/CSS
    css/style.css          # Extracted styles
    js/
      main.js              # Bootstrap, keyboard shortcuts
      simulation.js        # Boids engine, Reynolds rules, evolution
      renderer.js          # Canvas 2D drawing
      ui.js                # Sliders, panels, sparklines, DOM
      claude.js            # Claude API client, request deduplication
      state.js             # Save/restore, export functions
      prng.js              # Deterministic PRNG (Mulberry32) for seed control
test/
  server/                  # Server unit tests
  client/                  # Client logic tests (pure functions, no DOM)
  integration/             # Full server integration tests
```

Server modules each export a handler function `(req, res) => void`. The entry point routes requests to handlers by URL/method.

Client uses native ES modules (`<script type="module">`) — no bundler. Core logic (simulation, PRNG, state serialization) is written as pure functions testable in Node.js without a DOM.

## Testing

Uses **Node.js built-in test runner** (`node:test` + `node:assert`). No test framework dependencies. Tests run with `node --test test/**/*.test.js`.

Client tests cover pure logic only (simulation math, PRNG determinism, state serialization). UI/DOM interactions are verified manually.

## Hard Constraints

- **No build step** — no webpack, vite, babel, TypeScript. Runs with `node src/server/index.js`.
- **No npm dependencies** — both `dependencies` and `devDependencies` must be empty. Uses `node:test` (built into Node.js 18+).
- **No browser frameworks** — vanilla JS, Canvas 2D, ES modules.
- **Ukrainian UI strings** — all user-facing text in Ukrainian. Code/comments in English.
- **No emoji** — never include emoji in UI, code, comments, or output.

## Code Style

- 2 spaces indentation
- Double quotes in JS, single quotes in HTML attributes
- `const foo = () => ...` for short utilities, `function foo() {...}` for longer named functions
- `UPPER_SNAKE_CASE` for compile-time constants, `camelCase` for runtime variables
- Sparse comments — explain *why*, not *what*
- Git commits: imperative present tense ("add state persistence endpoint")

## Simulation Mechanics

- 120-240 boids with 7-gene genome: `speed`, `perception`, `cohesion`, `alignment`, `separation`, `fleeStrength`, `size`
- Reynolds flocking rules + predator flee + food seek
- Asynchronous evolution: reproduction at energy > 70 with mutation, death at energy <= 0 or predator contact
- Energy drain: `speed * 0.5 + size * 0.3`
- Canvas: 1800x1200 with wraparound edges

## Key Specification

`specification/SPECIFICATION.md` contains the full engineering spec with prioritized work items (P0/P1/P2), detailed requirements, test coverage expectations, and acceptance criteria. `specification/ISSUES.md` contains the phased issue breakdown with acceptance criteria.

## Compatibility

- Node.js 18+
- Modern browsers only (Chrome 100+, Firefox 100+, Safari 15+)
- Cross-platform (macOS, Linux, Windows)

## Permissions

Claude Code has full permissions to execute the following without prompting:

- **File operations**: Read, Edit, Write, Glob, Grep — all files in the project
- **Git**: all git commands (commit, add, rm, status, log, diff, branch, checkout, etc.)
- **Node.js**: `node`, `npm`, `npx` — run scripts, tests, start server
- **Shell**: `mkdir`, `rm`, `mv`, `cp`, `ls`, `cat`, `touch`, `echo`, `chmod`, `head`, `tail`, `wc`, `diff`, `curl`, `test`, `timeout`, `pwd`, `which`
- **GitHub CLI**: `gh` — issues, PRs, repo operations
- **GitHub MCP**: create/update/list issues, create/merge PRs, push files, search code

When implementing issues, Claude Code should commit after each issue, run tests, and fix any failures without asking for permission.
