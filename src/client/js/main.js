import { step, createInitialState, createEmptyHistory, setRng, GENE_NAMES } from "./simulation.js";
import { t, setLang, getLang, LANGS } from "./i18n.js";
import { createRng } from "./prng.js";
import { draw } from "./renderer.js";
import { askClaude, isInFlight } from "./claude.js";
import {
  renderMetrics, renderObservations, renderUserLog,
  logUserChange, bindSlider, getObservations, getUserLog,
  resetUserLog, resetObservations,
  setObservations, setUserLog,
} from "./ui.js";
import {
  loadState, startAutoSave, exportFullRun, showRestoreBanner,
  exportCsv, exportCanvasImage,
} from "./state.js";

// ============ STATE ============
let state = null;
let history = createEmptyHistory();
let running = true;
let metricsCounter = 0;
let lastMetrics = {};
const params = { foodCount: 80, predatorCount: 2, mutationRate: 0.15, simSpeed: 1 };

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function initState() {
  const seedVal = document.getElementById("seed-input").value.trim();
  setRng(createRng(seedVal || null));
  state = createInitialState(params);
  history = createEmptyHistory();
  resetObservations();
}

const getTick = () => state ? state.stats.tick : 0;

// ============ RENDER UI (i18n) ============
function renderUI() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById("seed-input").placeholder = t("label.seed_placeholder");
  // Update toggle button text to match current state
  const toggleBtn = document.getElementById("btn-toggle");
  if (running) {
    toggleBtn.textContent = t("btn.pause");
  } else {
    toggleBtn.textContent = t("btn.resume");
  }
}

// ============ LANGUAGE SELECTOR ============
const savedLang = localStorage.getItem("lang") || "uk";
setLang(savedLang);
document.documentElement.lang = savedLang;

const langSelect = document.getElementById("lang-select");
for (const [code, name] of Object.entries(LANGS)) {
  const opt = document.createElement("option");
  opt.value = code;
  opt.textContent = name;
  if (code === savedLang) opt.selected = true;
  langSelect.appendChild(opt);
}
langSelect.addEventListener("change", () => {
  const lang = langSelect.value;
  setLang(lang);
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  renderUI();
  populateScenarios();
  renderObservations();
  renderUserLog();
});

renderUI();

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

// ============ SCENARIO PRESETS ============
const SCENARIOS = [
  { key: "free", food: null, predators: null, mutation: null, speed: null, seed: null },
  { key: "baseline", food: 80, predators: 2, mutation: 15, speed: 4, seed: "" },
  { key: "predator_pressure", food: 80, predators: 6, mutation: 15, speed: 4, seed: "" },
  { key: "scarcity", food: 10, predators: 1, mutation: 15, speed: 4, seed: "" },
  { key: "paradise", food: 200, predators: 0, mutation: 15, speed: 4, seed: "" },
  { key: "mutation_chaos", food: 60, predators: 3, mutation: 50, speed: 4, seed: "" },
  { key: "reproducible", food: 80, predators: 3, mutation: 15, speed: 4, seed: "experiment-1" },
];

const scenarioSelect = document.getElementById("scenario-select");
let scenarioLocked = false;

function populateScenarios() {
  scenarioSelect.innerHTML = "";
  for (const s of SCENARIOS) {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = t("scenario." + s.key);
    scenarioSelect.appendChild(opt);
  }
}
populateScenarios();

function syncSlidersToParams() {
  document.getElementById("sim-speed").value = params.simSpeed;
  document.getElementById("lbl-speed").textContent = params.simSpeed;
  document.getElementById("food-count").value = params.foodCount;
  document.getElementById("lbl-food").textContent = params.foodCount;
  document.getElementById("predator-count").value = params.predatorCount;
  document.getElementById("lbl-predators").textContent = params.predatorCount;
  document.getElementById("mutation-rate").value = Math.round(params.mutationRate * 100);
  document.getElementById("lbl-mutation").textContent = Math.round(params.mutationRate * 100);
}

scenarioSelect.addEventListener("change", () => {
  const s = SCENARIOS.find(sc => sc.key === scenarioSelect.value);
  if (!s || s.key === "free") return;
  scenarioLocked = true;
  params.foodCount = s.food;
  params.predatorCount = s.predators;
  params.mutationRate = s.mutation / 100;
  params.simSpeed = s.speed;
  if (s.seed !== null) document.getElementById("seed-input").value = s.seed;
  syncSlidersToParams();
  initState();
  resetUserLog();
  logUserChange(t("scenario.changed", { name: t("scenario." + s.key) }), 0);
  scenarioLocked = false;
});

// Reset scenario to free mode when user manually changes a slider
const origBindSliderInput = (id) => {
  document.getElementById(id).addEventListener("input", () => {
    if (!scenarioLocked && scenarioSelect.value !== "free") {
      scenarioSelect.value = "free";
    }
  });
};
origBindSliderInput("sim-speed");
origBindSliderInput("food-count");
origBindSliderInput("predator-count");
origBindSliderInput("mutation-rate");

document.getElementById("btn-toggle").addEventListener("click", (e) => {
  running = !running;
  e.target.textContent = running ? t("btn.pause") : t("btn.resume");
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
  alert(t("alert.export_top10"));
});

document.getElementById("btn-export-run").addEventListener("click", () => {
  exportFullRun(params, history, getUserLog(), getObservations());
});

document.getElementById("btn-export-csv").addEventListener("click", () => {
  exportCsv(history, GENE_NAMES);
});

document.getElementById("btn-export-img").addEventListener("click", () => {
  exportCanvasImage(canvas);
});

document.getElementById("btn-new-window").addEventListener("click", () => {
  window.open(window.location.href, "_blank");
});

document.getElementById("btn-help").addEventListener("click", () => {
  let overlay = document.getElementById("help-overlay");
  if (overlay) { overlay.remove(); return; }
  overlay = document.createElement("div");
  overlay.id = "help-overlay";
  overlay.className = "help-overlay";
  overlay.innerHTML = `
    <div class="help-modal">
      <h2>${t("help.title")}</h2>
      <h3>${t("help.controls_title")}</h3>
      <p>${t("help.controls.sim_speed")}</p>
      <p>${t("help.controls.food")}</p>
      <p>${t("help.controls.predators")}</p>
      <p>${t("help.controls.mutation")}</p>
      <p>${t("help.controls.seed")}</p>
      <h3>${t("help.genes_title")}</h3>
      <p>${t("help.gene.speed")}</p>
      <p>${t("help.gene.perception")}</p>
      <p>${t("help.gene.cohesion")}</p>
      <p>${t("help.gene.alignment")}</p>
      <p>${t("help.gene.separation")}</p>
      <p>${t("help.gene.fleeStrength")}</p>
      <p>${t("help.gene.size")}</p>
      <h3>${t("help.energy_title")}</h3>
      <p>${t("help.energy_text")}</p>
      <h3>${t("help.shortcuts_title")}</h3>
      <p>${t("cheatsheet.space")}</p>
      <p>${t("cheatsheet.r")}</p>
      <p>${t("cheatsheet.c")}</p>
      <p>${t("cheatsheet.e")}</p>
      <p>${t("cheatsheet.numbers")}</p>
      <p>${t("cheatsheet.question")}</p>
      <h3>${t("help.exports_title")}</h3>
      <p>${t("help.export.top10")}</p>
      <p>${t("help.export.full_run")}</p>
      <p>${t("help.export.csv")}</p>
      <p>${t("help.export.image")}</p>
      <h3>${t("help.tips_title")}</h3>
      <p>${t("help.tip1")}</p>
      <p>${t("help.tip2")}</p>
      <p>${t("help.tip3")}</p>
      <p>${t("help.tip4")}</p>
      <div class="help-close">
        <button id="btn-help-close">${t("help.close")}</button>
      </div>
    </div>
  `;
  function dismiss() { overlay.remove(); }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });
  document.body.appendChild(overlay);
  document.getElementById("btn-help-close").addEventListener("click", dismiss);
});

document.getElementById("btn-claude").addEventListener("click", async () => {
  if (isInFlight()) return;
  const btn = document.getElementById("btn-claude");
  const body = document.getElementById("claude-body");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>${t("loading.claude")}`;
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
    body.textContent = t("error.claude", { msg: e.message });
  } finally {
    btn.disabled = false;
    btn.textContent = t("btn.ask_claude");
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
      <div class="cheatsheet-title">${t("cheatsheet.title")}</div>
      <div>${t("cheatsheet.space")}</div>
      <div>${t("cheatsheet.r")}</div>
      <div>${t("cheatsheet.c")}</div>
      <div>${t("cheatsheet.e")}</div>
      <div>${t("cheatsheet.numbers")}</div>
      <div>${t("cheatsheet.question")}</div>
      <div class="cheatsheet-close">${t("cheatsheet.close")}</div>
    </div>
  `;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

  switch (e.key) {
    case " ":
      e.preventDefault();
      document.getElementById("btn-toggle").click();
      break;
    case "r":
    case "R":
      if (confirm(t("confirm.reset"))) {
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
      const cs = document.getElementById("cheatsheet-overlay");
      if (cs) cs.remove();
      break;
  }
});

// ============ AUTO-SAVE ============
startAutoSave(() => ({
  params, history, userLog: getUserLog(), observations: getObservations(),
}));

// ============ ONBOARDING ============
function showOnboarding() {
  if (localStorage.getItem("onboarding-dismissed")) return;
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";
  overlay.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-title">${t("onboarding.title")}</div>
      <div class="onboarding-section">${t("onboarding.intro")}</div>
      <div class="onboarding-section">
        <span class="onboarding-label user">${t("onboarding.panel1")}</span>
      </div>
      <div class="onboarding-section">
        <span class="onboarding-label dyn">${t("onboarding.panel2")}</span>
      </div>
      <div class="onboarding-section">
        <span class="onboarding-label claude">${t("onboarding.panel3")}</span>
      </div>
      <div class="onboarding-close">
        <button id="btn-onboarding-close">${t("btn.understood")}</button>
      </div>
    </div>
  `;
  function dismiss() {
    localStorage.setItem("onboarding-dismissed", "1");
    overlay.remove();
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });
  document.body.appendChild(overlay);
  document.getElementById("btn-onboarding-close").addEventListener("click", dismiss);
}

// ============ RESTORE OR START ============
async function boot() {
  const saved = await loadState();
  if (saved) {
    showRestoreBanner(
      () => {
        Object.assign(params, saved.params);
        history = saved.history;
        if (saved.userLog) setUserLog(saved.userLog);
        if (saved.observations) setObservations(saved.observations);
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
        initState();
      }
    );
  } else {
    initState();
    showOnboarding();
  }
  renderUserLog();
  renderObservations();
  loop();
}

boot();
