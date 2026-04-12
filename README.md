# Swarm Evolution v1

Browser-based boids simulator with evolutionary selection and AI (Claude) commentary. Iteration 1 of a 5-iteration roadmap toward sim2real swarm intelligence on physical UGV robots. Zero runtime dependencies, zero build step.

---

## Quick Start

```bash
cp .env.example .env       # one-time setup
# add your ANTHROPIC_API_KEY to .env
npm start                  # starts server on port 8787, opens browser
```

Get an API key at https://console.anthropic.com/settings/keys

The simulation runs immediately. Panel 3 (Claude commentary) requires a valid API key; panels 1 and 2 work without one.

---

## Project Structure

```
src/
  server/
    index.js               Entry point — composes routes, starts HTTP server
    claude-proxy.js         POST /claude — proxies to Anthropic API
    static.js              Static file serving from src/client/
  client/
    index.html             HTML shell, loads JS/CSS
    css/style.css          Extracted styles
    js/
      main.js              Bootstrap, keyboard shortcuts
      simulation.js        Boids engine, Reynolds rules, evolution
      renderer.js          Canvas 2D drawing
      ui.js                Sliders, panels, sparklines, DOM
      claude.js            Claude API client
      state.js             Save/restore, export functions
      prng.js              Deterministic PRNG (Mulberry32) for seed control
test/
  server/                  Server unit tests
  client/                  Client logic tests (pure functions, no DOM)
  integration/             Full server integration tests
specification/
  SPECIFICATION.md         Full engineering spec
  ISSUES.md                Phased issue breakdown
```

---

## Commands

```bash
npm start                  # start server on port 8787
npm test                   # run all tests
npm run test:server        # server unit tests only
npm run test:client        # client logic tests only
npm run test:integration   # integration tests only
```

---

## Simulation

### Mechanics

- **Agents:** 60-120 boids, each with a 7-gene genome (`speed`, `perception`, `cohesion`, `alignment`, `separation`, `fleeStrength`, `size`)
- **Movement:** Reynolds flocking rules + predator flee + food seek
- **Evolution:** asynchronous — reproduction at energy > 70 with mutation, death at energy <= 0 or predator contact
- **Energy drain:** `speed * 0.5 + size * 0.3`
- **Environment:** 900x600 canvas with wraparound edges

### Three Commentary Panels

- **Panel 1 (yellow) — User actions.** Automatic log of parameter changes.
- **Panel 2 (green) — Population dynamics.** Rule-based trend detector comparing 60-tick windows.
- **Panel 3 (purple) — Claude commentary.** Calls Claude API with current simulation context for predictions and recommendations.

### Controls

| Control | Range | Effect |
|---------|-------|--------|
| Sim speed | 1-8x | Steps per frame |
| Food | 5-100 | Resource density |
| Predators | 0-6 | Predator pressure |
| Mutation rate | 0-50% | Evolution speed |

All UI text is in Ukrainian.

---

## Experiments to Try

1. **Baseline.** Run as-is. After 1-2 minutes, observe which genes converge.
2. **Predator pressure.** Predators = 6, food = 40. Expect cohesion and fleeStrength to rise.
3. **Abundance.** Predators = 0, food = 100. Cohesion drops, agents become solitary.
4. **Mutation stress test.** Mutation rate = 50%, food = 20, predators = 3. Population either adapts or goes extinct.

---

## Technical Constraints

- No build step — no webpack, vite, babel, TypeScript
- No npm dependencies — stdlib only, uses `node:test` (Node.js 18+)
- No browser frameworks — vanilla JS, Canvas 2D, ES modules
- Node.js 18+, modern browsers (Chrome 100+, Firefox 100+, Safari 15+)

---

## Roadmap

This is iteration 1. Full path:

1. **Iteration 1** (this project) — browser prototype for intuition
2. **Iteration 2** — Python/pygame with spatial index, obstacles, headless mode
3. **Iteration 3** — StarCraft/SMAC as external testbed for architecture validation
4. **Iteration 4** — NEAT evolution of neural network controllers
5. **Iteration 5** — ARGoS with physics and sim2real on physical UGVs
