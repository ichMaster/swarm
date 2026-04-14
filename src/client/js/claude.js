import { GENE_NAMES } from "./simulation.js";
import { t, getLang } from "./i18n.js";

let inflight = false;
let abortController = null;

window.addEventListener("beforeunload", () => {
  if (abortController) abortController.abort();
});

function isInFlight() { return inflight; }

function buildPromptUk(context) {
  return `Ти -- експерт з роєвого iнтелекту i еволюцiйних алгоритмiв. Аналiзуєш симуляцiю boids з генетичним вiдбором. Вiдповiдай коротко i конкретно українською (3-5 речень максимум).

Поточнi параметри:
- Їжа: ${context.params.foodCount}
- Хижаки: ${context.params.predatorCount}
- Мутацiя: ${(context.params.mutationRate * 100).toFixed(0)}%

Поточний стан популяцiї:
- Розмiр: ${context.metrics.population}
- Середнiй вiк: ${context.metrics.avgAge}
- Народжень: ${context.metrics.births}, смертей: ${context.metrics.deaths}

Середнi значення генiв:
${GENE_NAMES.map(g => `- ${t("gene." + g)}: ${(context.metrics.geneAvg[g] || 0).toFixed(2)}`).join("\n")}

Недавнi дiї користувача:
${context.userLog.slice(-5).map(e => `- ${e.text}`).join("\n") || "немає"}

Спостереженi тренди:
${context.observations.map(o => `- ${o}`).join("\n") || "стабiльнiсть"}

Твоє завдання:
1. Коротко оцiни, до якого типу екологiчної нiшi сходиться популяцiя
2. Передбач, що станеться за наступнi 1-2 хвилини
3. Дай одну конкретну рекомендацiю -- що змiнити, щоб побачити цiкавий ефект

ВАЖЛИВО: роздiляй кожен пункт ПОРОЖНIМ РЯДКОМ (подвiйний перенос). Без заголовкiв i маркерiв, просто три короткi абзаци через порожнiй рядок. Кожен абзац -- максимум 2-3 речення, загальна довжина вiдповiдi не бiльше 500 символiв. Рядки мають бути короткими -- не бiльше 80 символiв на рядок.`;
}

function buildPromptEn(context) {
  return `You are an expert in swarm intelligence and evolutionary algorithms. You are analyzing a boids simulation with genetic selection. Respond briefly and concretely in English (3-5 sentences max).

Current parameters:
- Food: ${context.params.foodCount}
- Predators: ${context.params.predatorCount}
- Mutation: ${(context.params.mutationRate * 100).toFixed(0)}%

Current population state:
- Size: ${context.metrics.population}
- Average age: ${context.metrics.avgAge}
- Births: ${context.metrics.births}, deaths: ${context.metrics.deaths}

Average gene values:
${GENE_NAMES.map(g => `- ${t("gene." + g)}: ${(context.metrics.geneAvg[g] || 0).toFixed(2)}`).join("\n")}

Recent user actions:
${context.userLog.slice(-5).map(e => `- ${e.text}`).join("\n") || "none"}

Observed trends:
${context.observations.map(o => `- ${o}`).join("\n") || "stable"}

Your task:
1. Briefly assess what type of ecological niche the population is converging toward
2. Predict what will happen in the next 1-2 minutes
3. Give one specific recommendation -- what to change to see an interesting effect

IMPORTANT: separate each point with a BLANK LINE (double newline). No headers or bullet points, just three short paragraphs separated by blank lines. Each paragraph -- max 2-3 sentences, total response under 500 characters. Keep lines short -- max 80 characters per line.`;
}

async function askClaude(context) {
  if (inflight) return null;
  inflight = true;
  abortController = new AbortController();

  const prompt = getLang() === "en" ? buildPromptEn(context) : buildPromptUk(context);

  try {
    const response = await fetch("/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: abortController.signal,
    });
    if (!response.ok) throw new Error(`proxy ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.text || t("empty_response");
  } finally {
    inflight = false;
    abortController = null;
  }
}

export { askClaude, isInFlight };
