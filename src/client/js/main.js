import { step, createInitialState, createEmptyHistory } from "./simulation.js";
import { draw } from "./renderer.js";
import { askClaude } from "./claude.js";
import {
  renderMetrics, renderObservations, renderUserLog,
  bindSlider, getObservations, getUserLog,
  resetUserLog, resetObservations,
} from "./ui.js";

// ============ STATE ============
let state = null;
let history = createEmptyHistory();
let running = true;
let metricsCounter = 0;
let lastMetrics = {};
const params = { foodCount: 40, predatorCount: 2, mutationRate: 0.15, simSpeed: 1 };

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function initState() {
  state = createInitialState(params);
  history = createEmptyHistory();
  resetObservations();
}

const getTick = () => state ? state.stats.tick : 0;

// ============ MAIN LOOP ============
function loop() {
  if (running && state) {
    for (let i = 0; i < params.simSpeed; i++) step(state, params);
    draw(ctx, state);
    metricsCounter++;
    if (metricsCounter >= 10) {
      metricsCounter = 0;
      lastMetrics = renderMetrics(state, history);
    }
  }
  requestAnimationFrame(loop);
}

// ============ UI BINDINGS ============
bindSlider("sim-speed", "lbl-speed", "simSpeed", params, v => v, null, getTick);
bindSlider("food-count", "lbl-food", "foodCount", params, v => v, null, getTick);
bindSlider("predator-count", "lbl-predators", "predatorCount", params, v => v, null, getTick);
bindSlider("mutation-rate", "lbl-mutation", "mutationRate", params, v => v / 100, null, getTick);

document.getElementById("btn-toggle").addEventListener("click", (e) => {
  running = !running;
  e.target.textContent = running ? "Pause" : "Resume";
  e.target.className = running ? "btn-pause" : "btn-resume";
});

document.getElementById("btn-reset").addEventListener("click", () => {
  initState();
  resetUserLog();
  renderUserLog();
});

document.getElementById("btn-export").addEventListener("click", () => {
  if (!state) return;
  const sorted = [...state.boids].sort((a, b) => b.age - a.age).slice(0, 10);
  const data = sorted.map(b => ({ age: b.age, energy: +b.energy.toFixed(1), genome: b.genome }));
  console.log("=== TOP 10 LONGEST-LIVED BOIDS ===\n" + JSON.stringify(data, null, 2));
  alert("Top 10 genomes exported to browser console (F12).");
});

document.getElementById("btn-claude").addEventListener("click", async () => {
  const btn = document.getElementById("btn-claude");
  const body = document.getElementById("claude-body");
  btn.disabled = true;
  btn.textContent = "Думає...";
  body.className = "claude-body";
  body.textContent = "";
  try {
    const reply = await askClaude({
      params, metrics: lastMetrics, userLog: getUserLog(), observations: getObservations(),
    });
    body.textContent = reply;
  } catch (e) {
    body.className = "claude-body error";
    body.textContent = `Помилка: ${e.message}\n\nДля роботи LLM-панелi потрiбен локальний proxy-сервер. Запусти:\n  node src/server/index.js\n(див. README.md)`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Запитати Claude";
  }
});

// ============ START ============
initState();
renderUserLog();
renderObservations();
loop();
