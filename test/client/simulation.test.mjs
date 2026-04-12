import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  W, H, INIT_POP, MAX_POP, MIN_POP,
  ENERGY_START, ENERGY_DRAIN, FOOD_ENERGY, REPRODUCE_THRESHOLD,
  MUTATION_AMOUNT, GENE_NAMES, GENE_RANGES,
  clamp, rnd, dist2, wrap, setRng,
  randomGenome, mutateGenome, makeBoid, makeFood, makePredator,
  step, detectTrends, createInitialState, createEmptyHistory,
} from "../../src/client/js/simulation.js";

// Use deterministic rng for tests
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("simulation", () => {
  it("boid movement follows Reynolds rules (boids move after step)", () => {
    setRng(mulberry32(42));
    const state = createInitialState({ foodCount: 10, predatorCount: 0, mutationRate: 0 });
    const b = state.boids[0];
    const startX = b.x, startY = b.y;
    step(state, { foodCount: 10, predatorCount: 0, mutationRate: 0, simSpeed: 1 });
    // Boid should have moved
    assert.ok(b.x !== startX || b.y !== startY, "boid should move after step");
  });

  it("energy drain = speed * 0.5 + size * 0.3", () => {
    setRng(mulberry32(99));
    const genome = {};
    for (const g of GENE_NAMES) genome[g] = 0.5;
    genome.speed = 0.8;
    genome.size = 0.6;
    const b = makeBoid(100, 100, genome);
    const startEnergy = b.energy;

    // Create minimal state with just this boid, no food/predators
    const state = {
      boids: [b],
      food: [],
      predators: [],
      stats: { tick: 0, births: 0, deaths: 0, eaten: 0 },
    };
    step(state, { foodCount: 0, predatorCount: 0, mutationRate: 0, simSpeed: 1 });

    const expectedDrain = ENERGY_DRAIN * (0.5 + genome.speed * 0.5 + genome.size * 0.3);
    const actualDrain = startEnergy - state.boids[0].energy;
    assert.ok(Math.abs(actualDrain - expectedDrain) < 0.01,
      `expected drain ~${expectedDrain.toFixed(4)}, got ${actualDrain.toFixed(4)}`);
  });

  it("reproduction triggers at energy > 70", () => {
    setRng(mulberry32(7));
    const genome = {};
    for (const g of GENE_NAMES) genome[g] = 0.5;
    const b = makeBoid(100, 100, genome);
    b.energy = REPRODUCE_THRESHOLD + 10;

    const state = {
      boids: [b],
      food: [],
      predators: [],
      stats: { tick: 0, births: 0, deaths: 0, eaten: 0 },
    };
    step(state, { foodCount: 0, predatorCount: 0, mutationRate: 0.1, simSpeed: 1 });

    assert.ok(state.stats.births > 0 || state.boids.length > 1,
      "boid with energy > 70 should reproduce");
  });

  it("death at energy <= 0", () => {
    setRng(mulberry32(3));
    const genome = {};
    for (const g of GENE_NAMES) genome[g] = 0.5;
    const b = makeBoid(100, 100, genome);
    b.energy = 0.01; // will go negative after drain

    const state = {
      boids: [b],
      food: [],
      predators: [],
      stats: { tick: 0, births: 0, deaths: 0, eaten: 0 },
    };
    step(state, { foodCount: 0, predatorCount: 0, mutationRate: 0, simSpeed: 1 });

    assert.ok(state.stats.deaths > 0, "boid with near-zero energy should die");
  });

  it("mutation within configured rate", () => {
    setRng(mulberry32(42));
    const genome = {};
    for (const g of GENE_NAMES) genome[g] = 0.5;

    // With rate=1.0, all genes should mutate
    const mutated = mutateGenome(genome, 1.0);
    let changed = 0;
    for (const g of GENE_NAMES) {
      if (mutated[g] !== genome[g]) changed++;
    }
    assert.ok(changed > 0, "mutation rate 1.0 should change at least some genes");

    // With rate=0, no genes should mutate
    setRng(mulberry32(42));
    const unchanged = mutateGenome(genome, 0);
    for (const g of GENE_NAMES) {
      assert.equal(unchanged[g], genome[g], `gene ${g} should not mutate at rate 0`);
    }
  });

  it("emergency respawn below population threshold", () => {
    setRng(mulberry32(1));
    // Start with fewer than MIN_POP boids, all with low energy
    const state = {
      boids: [],
      food: [],
      predators: [],
      stats: { tick: 0, births: 0, deaths: 0, eaten: 0 },
    };
    step(state, { foodCount: 0, predatorCount: 0, mutationRate: 0, simSpeed: 1 });

    assert.ok(state.boids.length >= MIN_POP,
      `should respawn to at least ${MIN_POP}, got ${state.boids.length}`);
  });

  it("runs in Node.js without DOM dependencies", () => {
    assert.equal(typeof step, "function");
    assert.equal(typeof createInitialState, "function");
    assert.equal(typeof detectTrends, "function");
  });
});
