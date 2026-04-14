import {
  GENE_NAMES, GENE_COLORS, MAX_POP,
  TREND_WINDOW, detectTrends,
} from "./simulation.js";
import { t } from "./i18n.js";
import { renderSparkline } from "./renderer.js";

let observations = [];
let userLog = [];
let pendingActions = [];

const CAUSAL_DELAY = 60;
const CAUSAL_THRESHOLD = 0.05;

function renderObservations() {
  const el = document.getElementById("obs-log");
  if (observations.length === 0) {
    el.innerHTML = `<span class="muted">${t("placeholder.obs_log", { n: TREND_WINDOW * 2 })}</span>`;
  } else {
    el.innerHTML = observations.map(o => {
      const cls = o.startsWith("[") ? ' class="obs-reaction"' : "";
      return `<div${cls}>• ${o}</div>`;
    }).join("");
  }
}

function renderUserLog() {
  const el = document.getElementById("user-log");
  if (userLog.length === 0) {
    el.innerHTML = `<span class="muted">${t("placeholder.user_log")}</span>`;
  } else {
    el.innerHTML = userLog.slice().reverse().map(e =>
      `<div><span class="tick">[t=${e.tick}]</span> ${e.text}</div>`
    ).join("");
  }
}

function logUserChange(text, tick) {
  userLog.push({ tick, text });
  if (userLog.length > 20) userLog.shift();
  renderUserLog();
}

function renderMetrics(state, history) {
  const pop = state.boids.length;
  const geneAvg = {};
  for (const g of GENE_NAMES) {
    geneAvg[g] = pop > 0 ? state.boids.reduce((sum, b) => sum + b.genome[g], 0) / pop : 0;
  }
  const avgAge = pop > 0 ? state.boids.reduce((sum, b) => sum + b.age, 0) / pop : 0;

  document.getElementById("m-pop").textContent = pop;
  document.getElementById("m-age").textContent = Math.round(avgAge);
  document.getElementById("m-births").textContent = state.stats.births;
  document.getElementById("m-deaths").textContent = state.stats.deaths;
  document.getElementById("m-eaten").textContent = state.stats.eaten;
  document.getElementById("m-tick").textContent = state.stats.tick;

  history.population.push(pop);
  if (history.population.length > 200) history.population.shift();
  for (const g of GENE_NAMES) {
    history.genes[g].push(geneAvg[g]);
    if (history.genes[g].length > 200) history.genes[g].shift();
  }

  renderSparkline(document.getElementById("spark-pop"), history.population, "#60a5fa", MAX_POP);

  const container = document.getElementById("genes-container");
  container.innerHTML = GENE_NAMES.map(g => `
    <div class="gene-row">
      <div class="gene-header">
        <span>${t("gene." + g)}</span>
        <span class="val">${geneAvg[g].toFixed(2)}</span>
      </div>
      <svg id="spark-${g}" class="sparkline" width="140" height="24"></svg>
    </div>
  `).join("");
  for (const g of GENE_NAMES) {
    renderSparkline(document.getElementById(`spark-${g}`), history.genes[g], GENE_COLORS[g], 1);
  }

  if (state.stats.tick % 30 === 0) {
    observations = detectTrends(history);
    const tick = state.stats.tick;
    const remaining = [];
    for (const action of pendingActions) {
      if (tick - action.tick >= CAUSAL_DELAY) {
        let maxGene = null, maxDelta = 0;
        for (const g of GENE_NAMES) {
          const delta = geneAvg[g] - (action.geneSnapshot[g] || 0);
          if (Math.abs(delta) > CAUSAL_THRESHOLD && Math.abs(delta) > Math.abs(maxDelta)) {
            maxGene = g; maxDelta = delta;
          }
        }
        if (maxGene) {
          const sliderName = t("slider." + action.key);
          const arrow = maxDelta > 0 ? "\u2191" : "\u2193";
          const formatted = typeof action.newVal === "number" && action.newVal < 1
            ? `${(action.newVal * 100).toFixed(0)}%`
            : action.newVal;
          observations.push(
            t("trend.reaction", {
              slider: sliderName, val: formatted,
              gene: t("gene." + maxGene), arrow,
              delta: Math.abs(maxDelta).toFixed(2), ticks: CAUSAL_DELAY,
            })
          );
        }
      } else {
        remaining.push(action);
      }
    }
    pendingActions = remaining;
    renderObservations();
  }

  return { population: pop, tick: state.stats.tick, births: state.stats.births, deaths: state.stats.deaths, eaten: state.stats.eaten, avgAge: Math.round(avgAge), geneAvg };
}

function labelFor(key, oldVal, newVal) {
  const param = t("log." + key);
  if (key === "mutationRate") {
    return t("log.change.mutationRate", { param, old: (oldVal * 100).toFixed(0), new: (newVal * 100).toFixed(0) });
  }
  if (key === "simSpeed") {
    return t("log.change.simSpeed", { param, old: oldVal, new: newVal });
  }
  return t("log.change", { param, old: oldVal, new: newVal });
}

function bindSlider(id, lblId, key, params, transform, formatLbl, getTick, getGeneAvg) {
  const input = document.getElementById(id);
  const lbl = document.getElementById(lblId);
  input.addEventListener("input", () => {
    const oldVal = params[key];
    const newVal = transform(+input.value);
    params[key] = newVal;
    lbl.textContent = formatLbl ? formatLbl(+input.value) : input.value;
    if (oldVal !== newVal) {
      const tick = getTick();
      logUserChange(labelFor(key, oldVal, newVal), tick);
      if (key !== "simSpeed" && getGeneAvg) {
        const snapshot = getGeneAvg();
        if (snapshot) {
          pendingActions.push({ key, newVal, tick, geneSnapshot: { ...snapshot } });
        }
      }
    }
  });
}

function getObservations() { return observations; }
function getUserLog() { return userLog; }
function setUserLog(log) { userLog = log; renderUserLog(); }
function setObservations(obs) { observations = obs; renderObservations(); }
function resetUserLog() { userLog = []; renderUserLog(); }
function resetObservations() { observations = []; renderObservations(); }

export {
  renderMetrics, renderObservations, renderUserLog,
  logUserChange, bindSlider,
  getObservations, getUserLog, setUserLog, setObservations,
  resetUserLog, resetObservations,
};
