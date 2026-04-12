import { step, createInitialState, createEmptyHistory } from "./simulation.js";
import { draw } from "./renderer.js";
import { askClaude } from "./claude.js";
import {
  renderMetrics, renderObservations, renderUserLog,
  bindSlider, getObservations, getUserLog,
  resetUserLog, resetObservations,
  setObservations, setUserLog,
} from "./ui.js";
import {
  loadState, startAutoSave, exportFullRun, showRestoreBanner,
} from "./state.js";

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
const getGeneAvg = () => lastMetrics.geneAvg || null;
bindSlider("sim-speed", "lbl-speed", "simSpeed", params, v => v, null, getTick, getGeneAvg);
bindSlider("food-count", "lbl-food", "foodCount", params, v => v, null, getTick, getGeneAvg);
bindSlider("predator-count", "lbl-predators", "predatorCount", params, v => v, null, getTick, getGeneAvg);
bindSlider("mutation-rate", "lbl-mutation", "mutationRate", params, v => v / 100, null, getTick, getGeneAvg);

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

document.getElementById("btn-export-run").addEventListener("click", () => {
  exportFullRun(params, history, getUserLog(), getObservations());
});

document.getElementById("btn-claude").addEventListener("click", async () => {
  const btn = document.getElementById("btn-claude");
  const body = document.getElementById("claude-body");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Claude думає...';
  body.className = "claude-body loading";
  body.textContent = "";
  try {
    const reply = await askClaude({
      params, metrics: lastMetrics, userLog: getUserLog(), observations: getObservations(),
    });
    body.className = "claude-body fade-in";
    body.textContent = reply;
  } catch (e) {
    body.className = "claude-body error";
    body.textContent = `Помилка: ${e.message}\n\nДля роботи LLM-панелi потрiбен локальний proxy-сервер. Запусти:\n  node src/server/index.js\n(див. README.md)`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Запитати Claude";
  }
});

// ============ KEYBOARD SHORTCUTS ============
function toggleCheatsheet() {
  let overlay = document.getElementById("cheatsheet-overlay");
  if (overlay) {
    overlay.remove();
    return;
  }
  overlay = document.createElement("div");
  overlay.id = "cheatsheet-overlay";
  overlay.className = "cheatsheet-overlay";
  overlay.innerHTML = `
    <div class="cheatsheet">
      <div class="cheatsheet-title">Клавiшi</div>
      <div>Space — пауза / продовження</div>
      <div>R — скидання (з пiдтвердженням)</div>
      <div>C — запитати Claude</div>
      <div>E — export top 10</div>
      <div>1..8 — швидкiсть симуляцiї</div>
      <div>? — показати/сховати цю пiдказку</div>
      <div class="cheatsheet-close">натисни будь-яку клавiшу або клiкни щоб закрити</div>
    </div>
  `;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;

  switch (e.key) {
    case " ":
      e.preventDefault();
      document.getElementById("btn-toggle").click();
      break;
    case "r":
    case "R":
      if (confirm("Скинути симуляцiю?")) {
        document.getElementById("btn-reset").click();
      }
      break;
    case "c":
    case "C":
      document.getElementById("btn-claude").click();
      break;
    case "e":
    case "E":
      document.getElementById("btn-export").click();
      break;
    case "?":
      toggleCheatsheet();
      break;
    default:
      if (e.key >= "1" && e.key <= "8") {
        params.simSpeed = +e.key;
        document.getElementById("sim-speed").value = e.key;
        document.getElementById("lbl-speed").textContent = e.key;
      }
      // Close cheatsheet on any other key
      const cs = document.getElementById("cheatsheet-overlay");
      if (cs) cs.remove();
      break;
  }
});

// ============ AUTO-SAVE ============
startAutoSave(() => ({
  params, history, userLog: getUserLog(), observations: getObservations(),
}));

// ============ RESTORE OR START ============
async function boot() {
  const saved = await loadState();
  if (saved) {
    showRestoreBanner(
      () => {
        // Restore
        Object.assign(params, saved.params);
        history = saved.history;
        if (saved.userLog) setUserLog(saved.userLog);
        if (saved.observations) setObservations(saved.observations);
        // Sync slider UI to restored params
        document.getElementById("sim-speed").value = params.simSpeed;
        document.getElementById("lbl-speed").textContent = params.simSpeed;
        document.getElementById("food-count").value = params.foodCount;
        document.getElementById("lbl-food").textContent = params.foodCount;
        document.getElementById("predator-count").value = params.predatorCount;
        document.getElementById("lbl-predators").textContent = params.predatorCount;
        document.getElementById("mutation-rate").value = Math.round(params.mutationRate * 100);
        document.getElementById("lbl-mutation").textContent = Math.round(params.mutationRate * 100);
        state = createInitialState(params);
        renderUserLog();
        renderObservations();
      },
      () => {
        // Start new
        initState();
      }
    );
  } else {
    initState();
  }
  renderUserLog();
  renderObservations();
  loop();
}

boot();
