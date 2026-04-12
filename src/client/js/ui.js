import {
  GENE_NAMES, GENE_COLORS, GENE_UA, MAX_POP,
  TREND_WINDOW, detectTrends,
} from "./simulation.js";
import { renderSparkline } from "./renderer.js";

let observations = [];
let userLog = [];

function renderObservations() {
  const el = document.getElementById("obs-log");
  if (observations.length === 0) {
    el.innerHTML = `<span class="muted">трендiв поки немає (треба ~${TREND_WINDOW * 2} тiкiв)</span>`;
  } else {
    el.innerHTML = observations.map(o => `<div>• ${o}</div>`).join("");
  }
}

function renderUserLog() {
  const el = document.getElementById("user-log");
  if (userLog.length === 0) {
    el.innerHTML = `<span class="muted">змiни параметрiв з'являться тут</span>`;
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
        <span>${g}</span>
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
    renderObservations();
  }

  return { population: pop, tick: state.stats.tick, births: state.stats.births, deaths: state.stats.deaths, eaten: state.stats.eaten, avgAge: Math.round(avgAge), geneAvg };
}

function labelFor(key, oldVal, newVal) {
  if (key === "foodCount") return `Їжа: ${oldVal} \u2192 ${newVal}`;
  if (key === "predatorCount") return `Хижаки: ${oldVal} \u2192 ${newVal}`;
  if (key === "mutationRate") return `Мутацiя: ${(oldVal * 100).toFixed(0)}% \u2192 ${(newVal * 100).toFixed(0)}%`;
  if (key === "simSpeed") return `Швидкiсть: ${oldVal}x \u2192 ${newVal}x`;
  return `${key}: ${oldVal} \u2192 ${newVal}`;
}

function bindSlider(id, lblId, key, params, transform, formatLbl, getTick) {
  const input = document.getElementById(id);
  const lbl = document.getElementById(lblId);
  input.addEventListener("input", () => {
    const oldVal = params[key];
    const newVal = transform(+input.value);
    params[key] = newVal;
    lbl.textContent = formatLbl ? formatLbl(+input.value) : input.value;
    if (oldVal !== newVal) {
      logUserChange(labelFor(key, oldVal, newVal), getTick());
    }
  });
}

function getObservations() { return observations; }
function getUserLog() { return userLog; }
function resetUserLog() { userLog = []; renderUserLog(); }
function resetObservations() { observations = []; renderObservations(); }

export {
  renderMetrics, renderObservations, renderUserLog,
  logUserChange, bindSlider,
  getObservations, getUserLog, resetUserLog, resetObservations,
};
