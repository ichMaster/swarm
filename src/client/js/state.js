const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getTabId() {
  if (typeof sessionStorage === "undefined") return "default";
  if (!sessionStorage.tabId) {
    sessionStorage.tabId = "tab-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }
  return sessionStorage.tabId;
}

function collectState(params, history, userLog, observations) {
  const seedEl = typeof document !== "undefined" ? document.getElementById("seed-input") : null;
  return {
    savedAt: Date.now(),
    seed: seedEl ? seedEl.value.trim() : "",
    params: { ...params },
    history: {
      population: [...history.population],
      genes: Object.fromEntries(
        Object.entries(history.genes).map(([k, v]) => [k, [...v]])
      ),
    },
    userLog: [...userLog],
    observations: [...observations],
  };
}

function validateState(s) {
  return s && typeof s === "object"
    && typeof s.savedAt === "number"
    && s.params && typeof s.params === "object"
    && s.history && Array.isArray(s.history.population);
}

async function saveState(params, history, userLog, observations) {
  const payload = collectState(params, history, userLog, observations);
  const tab = getTabId();
  try {
    await fetch(`/save?tab=${encodeURIComponent(tab)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* ignore save errors */ }
}

async function loadState() {
  const tab = getTabId();
  try {
    const res = await fetch(`/state?tab=${encodeURIComponent(tab)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!validateState(data)) return null;
    if (Date.now() - data.savedAt > MAX_AGE_MS) return null;
    return data;
  } catch { return null; }
}

function startAutoSave(getArgs) {
  const save = () => {
    const { params, history, userLog, observations } = getArgs();
    saveState(params, history, userLog, observations);
  };
  const intervalId = setInterval(save, 30000);
  window.addEventListener("beforeunload", save);
  return intervalId;
}

function exportFullRun(params, history, userLog, observations) {
  const payload = collectState(params, history, userLog, observations);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swarm-run-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showRestoreBanner(onRestore, onNew) {
  const banner = document.createElement("div");
  banner.className = "restore-banner";
  banner.innerHTML = `
    <span>Знайдено збережений стан. </span>
    <button id="btn-restore" class="btn-restore">Вiдновити</button>
    <button id="btn-new" class="btn-new">Почати нову</button>
  `;
  document.body.prepend(banner);
  document.getElementById("btn-restore").addEventListener("click", () => {
    banner.remove();
    onRestore();
  });
  document.getElementById("btn-new").addEventListener("click", () => {
    banner.remove();
    onNew();
  });
}

function exportCsv(history, geneNames) {
  const headers = ["tick", "population", ...geneNames];
  const rows = [headers.join(",")];
  const len = history.population.length;
  for (let i = 0; i < len; i++) {
    const cols = [i, history.population[i]];
    for (const g of geneNames) {
      cols.push((history.genes[g][i] || 0).toFixed(4));
    }
    rows.push(cols.join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swarm-data-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCanvasImage(canvas) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarm-snapshot-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export {
  getTabId,
  collectState, validateState,
  saveState, loadState, startAutoSave,
  exportFullRun, showRestoreBanner,
  exportCsv, exportCanvasImage,
};
