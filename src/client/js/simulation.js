import { t } from "./i18n.js";

// ============ CONSTANTS ============
const W = 1800, H = 900;
const INIT_POP = 120, MAX_POP = 240, MIN_POP = 40;
const ENERGY_START = 50, ENERGY_DRAIN = 0.15;
const FOOD_ENERGY = 35, REPRODUCE_THRESHOLD = 70;
const MUTATION_AMOUNT = 0.15;
const HISTORY_LEN = 200;
const TREND_WINDOW = 60;

const GENE_RANGES = {
  speed: [0.3, 1.0], perception: [0.3, 1.0], cohesion: [0.0, 1.0],
  alignment: [0.0, 1.0], separation: [0.3, 1.0],
  fleeStrength: [0.2, 1.0], size: [0.4, 1.0],
};
const GENE_NAMES = Object.keys(GENE_RANGES);
const GENE_UA = {
  speed: "швидкiсть", perception: "сприйняття", cohesion: "згуртованiсть",
  alignment: "вирiвнювання", separation: "вiдштовхування",
  fleeStrength: "втеча", size: "розмiр",
};
const GENE_COLORS = {
  speed: "#f59e0b", perception: "#10b981", cohesion: "#3b82f6",
  alignment: "#8b5cf6", separation: "#ec4899",
  fleeStrength: "#ef4444", size: "#64748b",
};

// ============ HELPERS ============
let _rng = Math.random;
const setRng = (fn) => { _rng = fn; };
const getRng = () => _rng;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd = (lo, hi) => lo + _rng() * (hi - lo);
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const wrap = (v, max) => ((v % max) + max) % max;

const randomGenome = () => {
  const g = {};
  for (const k of GENE_NAMES) { const [lo, hi] = GENE_RANGES[k]; g[k] = rnd(lo, hi); }
  return g;
};

const mutateGenome = (g, rate) => {
  const out = {};
  for (const k of GENE_NAMES) {
    const [lo, hi] = GENE_RANGES[k];
    out[k] = _rng() < rate
      ? clamp(g[k] + rnd(-MUTATION_AMOUNT, MUTATION_AMOUNT), lo, hi)
      : g[k];
  }
  return out;
};

const genomeColor = (g) => {
  const hue = (160 + g.cohesion * 100 + g.alignment * 60) % 360;
  const sat = 55 + g.speed * 35;
  const lit = 45 + g.perception * 20;
  return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${lit.toFixed(0)}%)`;
};

// ============ ENTITIES ============
let nextId = 1;

const makeBoid = (x, y, genome) => ({
  id: nextId++, x, y, vx: rnd(-1, 1), vy: rnd(-1, 1),
  energy: ENERGY_START, age: 0, genome: genome || randomGenome(),
});

const makeFood = () => ({ x: rnd(20, W - 20), y: rnd(20, H - 20) });

const makePredator = () => ({
  x: rnd(0, W), y: rnd(0, H), vx: rnd(-1, 1), vy: rnd(-1, 1),
  perception: 120, speed: 1.8,
});

// ============ SPATIAL HASH GRID ============
const GRID_CELL = 110;
const GRID_COLS = Math.ceil(W / GRID_CELL);
const GRID_ROWS = Math.ceil(H / GRID_CELL);

function buildGrid(entities) {
  const cells = new Array(GRID_COLS * GRID_ROWS);
  for (let i = 0; i < cells.length; i++) cells[i] = [];
  for (const e of entities) {
    const col = Math.min(Math.floor(e.x / GRID_CELL), GRID_COLS - 1);
    const row = Math.min(Math.floor(e.y / GRID_CELL), GRID_ROWS - 1);
    cells[row * GRID_COLS + col].push(e);
  }
  return cells;
}

function queryNeighbors(cells, x, y) {
  const col = Math.min(Math.floor(x / GRID_CELL), GRID_COLS - 1);
  const row = Math.min(Math.floor(y / GRID_CELL), GRID_ROWS - 1);
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    const r = ((row + dr) % GRID_ROWS + GRID_ROWS) % GRID_ROWS;
    for (let dc = -1; dc <= 1; dc++) {
      const c = ((col + dc) % GRID_COLS + GRID_COLS) % GRID_COLS;
      const cell = cells[r * GRID_COLS + c];
      for (let i = 0; i < cell.length; i++) result.push(cell[i]);
    }
  }
  return result;
}

// ============ SIMULATION STEP ============
function step(state, params) {
  const { boids, food, predators, stats } = state;
  const newBoids = [], births = [];
  let deaths = 0, eaten = 0;

  const boidGrid = buildGrid(boids);

  for (const b of boids) {
    const percRadius = 30 + b.genome.perception * 80;
    const percRadius2 = percRadius * percRadius;
    const sepRadius2 = 400;
    let sepX = 0, sepY = 0, sepCount = 0;
    let aliX = 0, aliY = 0, aliCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;

    const nearby = queryNeighbors(boidGrid, b.x, b.y);
    for (let ni = 0; ni < nearby.length; ni++) {
      const other = nearby[ni];
      if (other.id === b.id) continue;
      const d2 = dist2(b, other);
      if (d2 < percRadius2) {
        cohX += other.x; cohY += other.y; cohCount++;
        aliX += other.vx; aliY += other.vy; aliCount++;
        if (d2 < sepRadius2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          sepX += (b.x - other.x) / d;
          sepY += (b.y - other.y) / d;
          sepCount++;
        }
      }
    }

    let ax = 0, ay = 0;
    if (sepCount > 0) {
      ax += (sepX / sepCount) * b.genome.separation * 1.5;
      ay += (sepY / sepCount) * b.genome.separation * 1.5;
    }
    if (aliCount > 0) {
      ax += (aliX / aliCount - b.vx) * b.genome.alignment * 0.4;
      ay += (aliY / aliCount - b.vy) * b.genome.alignment * 0.4;
    }
    if (cohCount > 0) {
      ax += (cohX / cohCount - b.x) * b.genome.cohesion * 0.003;
      ay += (cohY / cohCount - b.y) * b.genome.cohesion * 0.003;
    }

    for (const p of predators) {
      const d2p = dist2(b, p);
      if (d2p < percRadius2) {
        const d = Math.sqrt(d2p) + 0.01;
        ax += ((b.x - p.x) / d) * b.genome.fleeStrength * 3;
        ay += ((b.y - p.y) / d) * b.genome.fleeStrength * 3;
      }
    }

    let closestFood = null, closestFoodD2 = percRadius2;
    for (let i = 0; i < food.length; i++) {
      const d2f = dist2(b, food[i]);
      if (d2f < closestFoodD2) { closestFood = i; closestFoodD2 = d2f; }
    }
    if (closestFood !== null) {
      const f = food[closestFood];
      const d = Math.sqrt(closestFoodD2) + 0.01;
      ax += ((f.x - b.x) / d) * 0.5;
      ay += ((f.y - b.y) / d) * 0.5;
    }

    b.vx += ax; b.vy += ay;
    const maxSpeed = 1.5 + b.genome.speed * 2.5;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > maxSpeed) { b.vx = (b.vx / sp) * maxSpeed; b.vy = (b.vy / sp) * maxSpeed; }

    b.x = wrap(b.x + b.vx, W);
    b.y = wrap(b.y + b.vy, H);

    if (closestFood !== null && closestFoodD2 < 100) {
      b.energy += FOOD_ENERGY;
      food[closestFood] = makeFood();
      eaten++;
    }

    b.energy -= ENERGY_DRAIN * (0.5 + b.genome.speed * 0.5 + b.genome.size * 0.3);
    b.age++;

    if (b.energy > REPRODUCE_THRESHOLD && boids.length + newBoids.length + births.length < MAX_POP) {
      b.energy *= 0.5;
      births.push(makeBoid(b.x + rnd(-10, 10), b.y + rnd(-10, 10), mutateGenome(b.genome, params.mutationRate)));
    }
    if (b.energy > 0) newBoids.push(b); else deaths++;
  }

  for (const p of predators) {
    let target = null, targetD2 = p.perception * p.perception;
    for (const b of newBoids) {
      const d2 = dist2(p, b);
      if (d2 < targetD2) { target = b; targetD2 = d2; }
    }
    if (target) {
      const d = Math.sqrt(targetD2) + 0.01;
      p.vx += ((target.x - p.x) / d) * 0.3;
      p.vy += ((target.y - p.y) / d) * 0.3;
    } else {
      p.vx += rnd(-0.2, 0.2);
      p.vy += rnd(-0.2, 0.2);
    }
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > p.speed) { p.vx = (p.vx / sp) * p.speed; p.vy = (p.vy / sp) * p.speed; }
    p.x = wrap(p.x + p.vx, W);
    p.y = wrap(p.y + p.vy, H);

    for (let i = newBoids.length - 1; i >= 0; i--) {
      if (dist2(p, newBoids[i]) < 100) { newBoids.splice(i, 1); deaths++; break; }
    }
  }

  for (const child of births) newBoids.push(child);
  while (newBoids.length < MIN_POP) newBoids.push(makeBoid(rnd(0, W), rnd(0, H)));
  while (predators.length < params.predatorCount) predators.push(makePredator());
  while (predators.length > params.predatorCount) predators.pop();
  while (food.length < params.foodCount) food.push(makeFood());
  while (food.length > params.foodCount) food.pop();

  stats.tick++;
  stats.births += births.length;
  stats.deaths += deaths;
  stats.eaten += eaten;
  state.boids = newBoids;
}

// ============ TREND DETECTION ============
function detectTrends(history) {
  const obs = [];
  const pop = history.population;
  if (pop.length < TREND_WINDOW * 2) return obs;

  const recent = pop.slice(-TREND_WINDOW);
  const older = pop.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
  const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgO = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = avgR - avgO;
  if (Math.abs(diff) > 8) {
    const key = diff > 0 ? "trend.pop_grew" : "trend.pop_fell";
    obs.push(t(key, { n: Math.abs(diff).toFixed(0) }));
  } else if (Math.abs(diff) < 3 && avgR > 30) {
    obs.push(t("trend.pop_stable", { n: avgR.toFixed(0) }));
  }

  for (const g of GENE_NAMES) {
    const series = history.genes[g] || [];
    if (series.length < TREND_WINDOW * 2) continue;
    const rec = series.slice(-TREND_WINDOW);
    const old = series.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
    const aR = rec.reduce((a, b) => a + b, 0) / rec.length;
    const aO = old.reduce((a, b) => a + b, 0) / old.length;
    const d = aR - aO;
    if (Math.abs(d) > 0.05) {
      const key = d > 0 ? "trend.gene_up" : "trend.gene_down";
      obs.push(t(key, { gene: t("gene." + g), delta: Math.abs(d).toFixed(2), val: aR.toFixed(2) }));
    }
  }
  return obs;
}

function createInitialState(params) {
  return {
    boids: Array.from({ length: INIT_POP }, () => makeBoid(rnd(0, W), rnd(0, H))),
    food: Array.from({ length: params.foodCount }, makeFood),
    predators: Array.from({ length: params.predatorCount }, makePredator),
    stats: { tick: 0, births: 0, deaths: 0, eaten: 0 },
  };
}

function createEmptyHistory() {
  return { population: [], genes: Object.fromEntries(GENE_NAMES.map(g => [g, []])) };
}

export {
  W, H, INIT_POP, MAX_POP, MIN_POP,
  ENERGY_START, ENERGY_DRAIN, FOOD_ENERGY, REPRODUCE_THRESHOLD,
  MUTATION_AMOUNT, HISTORY_LEN, TREND_WINDOW,
  GENE_RANGES, GENE_NAMES, GENE_UA, GENE_COLORS,
  GRID_CELL, GRID_COLS, GRID_ROWS,
  clamp, rnd, dist2, wrap, setRng, getRng,
  randomGenome, mutateGenome, genomeColor,
  buildGrid, queryNeighbors,
  makeBoid, makeFood, makePredator,
  step, detectTrends, createInitialState, createEmptyHistory,
};
