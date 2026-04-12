import { GENE_NAMES, GENE_UA } from "./simulation.js";

let inflight = false;
let abortController = null;

window.addEventListener("beforeunload", () => {
  if (abortController) abortController.abort();
});

function isInFlight() { return inflight; }

async function askClaude(context) {
  if (inflight) return null;
  inflight = true;
  abortController = new AbortController();

  const prompt = `Ти -- експерт з роєвого iнтелекту i еволюцiйних алгоритмiв. Аналiзуєш симуляцiю boids з генетичним вiдбором. Вiдповiдай коротко i конкретно українською (3-5 речень максимум).

Поточнi параметри:
- Їжа: ${context.params.foodCount}
- Хижаки: ${context.params.predatorCount}
- Мутацiя: ${(context.params.mutationRate * 100).toFixed(0)}%

Поточний стан популяцiї:
- Розмiр: ${context.metrics.population}
- Середнiй вiк: ${context.metrics.avgAge}
- Народжень: ${context.metrics.births}, смертей: ${context.metrics.deaths}

Середнi значення генiв:
${GENE_NAMES.map(g => `- ${GENE_UA[g]}: ${(context.metrics.geneAvg[g] || 0).toFixed(2)}`).join("\n")}

Недавнi дiї користувача:
${context.userLog.slice(-5).map(e => `- ${e.text}`).join("\n") || "немає"}

Спостереженi тренди:
${context.observations.map(o => `- ${o}`).join("\n") || "стабiльнiсть"}

Твоє завдання:
1. Коротко оцiни, до якого типу екологiчної нiшi сходиться популяцiя
2. Передбач, що станеться за наступнi 1-2 хвилини
3. Дай одну конкретну рекомендацiю -- що змiнити, щоб побачити цiкавий ефект

ВАЖЛИВО: роздiляй кожен пункт ПОРОЖНIМ РЯДКОМ (подвiйний перенос). Без заголовкiв i маркерiв, просто три короткi абзаци через порожнiй рядок.`;

  try {
    const response = await fetch("/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: abortController.signal,
    });
    if (!response.ok) throw new Error(`proxy ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.text || "(порожня вiдповiдь)";
  } finally {
    inflight = false;
    abortController = null;
  }
}

export { askClaude, isInFlight };
