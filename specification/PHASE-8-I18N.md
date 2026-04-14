# Phase 8 -- Internationalization, Help Panel, Scenario Presets

Adds bilingual support (Ukrainian / English), a help panel explaining all controls and parameters, and a dropdown with predefined simulation scenarios.

## Summary

| #  | Issue | Depends on | Priority |
|----|-------|------------|----------|
| 33 | Create i18n translation module | -- | P0 |
| 34 | Language selector UI + persistence | 33 | P0 |
| 35 | Translate all static UI strings | 33, 34 | P0 |
| 36 | Translate dynamic/generated strings | 33, 35 | P0 |
| 37 | Switch Claude prompt language | 33, 34 | P0 |
| 38 | Help button with controls/parameters reference | 33 | P1 |
| 39 | Simulation scenario presets dropdown | 33 | P1 |

---

## ISSUE-33: Create i18n translation module -- `src/client/js/i18n.js`

**Description:** Create a lightweight internationalization module that stores all UI strings in two languages (uk, en) and provides a translation function. No npm dependencies.

**What should be done:**
- Create `src/client/js/i18n.js` exporting:
  - `t(key)` -- returns the translated string for the current language
  - `setLang(lang)` -- switches language ("uk" or "en")
  - `getLang()` -- returns current language
  - `LANGS` -- available languages: `{ uk: "Українська", en: "English" }`
- Store all translations as a flat object with dot-notation keys:
  ```js
  const STRINGS = {
    uk: {
      "header.title": "Swarm Evolution -- Iтерацiя 1",
      "header.subtitle": "боїди + еволюцiя + коментарi",
      "btn.pause": "Пауза",
      "btn.resume": "Продовження",
      "btn.reset": "Скидання",
      "btn.export_top10": "Експорт топ-10",
      "btn.export_run": "Експорт повного запуску",
      "btn.export_csv": "Експорт CSV",
      "btn.export_image": "Експорт зображення",
      "btn.new_window": "Нове вiкно",
      "btn.ask_claude": "Запитати Claude",
      "btn.understood": "Зрозумiло",
      "btn.restore": "Вiдновити",
      "btn.start_new": "Почати нову",
      "panel.user_actions": "1 -- Дiї користувача",
      "panel.dynamics": "2 -- Динамiка популяцiї",
      "panel.claude": "3 -- Коментар вiд Claude -- прогноз i рекомендацiї",
      "panel.controls": "Управлiння",
      "panel.population": "Популяцiя",
      "panel.genes": "Середнi значення генiв",
      "label.sim_speed": "Швидкiсть",
      "label.food": "Їжа",
      "label.predators": "Хижаки",
      "label.mutation": "Мутацiя",
      "label.current": "Зараз",
      "label.avg_age": "Сер. вiк",
      "label.births": "Народження",
      "label.deaths": "Смертi",
      "label.eaten": "З'їдено",
      "label.tick": "Тiк",
      "label.pop_over_time": "Популяцiя за часом",
      "label.seed_placeholder": "Seed",
      "gene.speed": "швидкiсть",
      "gene.perception": "сприйняття",
      "gene.cohesion": "згуртованiсть",
      "gene.alignment": "вирiвнювання",
      "gene.separation": "вiдштовхування",
      "gene.fleeStrength": "втеча",
      "gene.size": "розмiр",
      "slider.food": "їжi",
      "slider.predators": "хижакiв",
      "slider.mutation": "мутацiї",
      "slider.speed": "швидкостi",
      "log.food": "Їжа",
      "log.predators": "Хижаки",
      "log.mutation": "Мутацiя",
      "log.speed": "Швидкiсть",
      "placeholder.user_log": "змiни параметрiв з'являться тут",
      "placeholder.obs_log": "трендiв поки немає (треба ~{n} тiкiв)",
      "placeholder.claude_body": "натисни \"Запитати Claude\" щоб отримати аналiз поточного стану, прогноз на найближчi 1-2 хвилини, i конкретну рекомендацiю що змiнити. Для роботи потрiбен локальний proxy-сервер (див. README).",
      "loading.claude": "Claude думає...",
      "error.claude": "Помилка: {msg}\n\nДля роботи LLM-панелi потрiбен локальний proxy-сервер. Запусти:\n  node src/server/index.js\n(див. README.md)",
      "alert.export_top10": "Топ-10 геномiв експортовано в консоль браузера (F12).",
      "confirm.reset": "Скинути симуляцiю?",
      "banner.found_state": "Знайдено збережений стан.",
      "trend.pop_grew": "Популяцiя зросла на {n} особин",
      "trend.pop_fell": "Популяцiя впала на {n} особин",
      "trend.pop_stable": "Популяцiя стабiлiзувалася на ~{n}",
      "trend.gene_up": "{gene} зросла на {delta} (зараз {val})",
      "trend.gene_down": "{gene} знизилась на {delta} (зараз {val})",
      "trend.reaction": "[реакцiя] Пiсля змiни {slider} до {val}, {gene} {arrow} на {delta} за {ticks} тiкiв",
      "cheatsheet.title": "Клавiшi",
      "cheatsheet.space": "Space -- пауза / продовження",
      "cheatsheet.r": "R -- скидання (з пiдтвердженням)",
      "cheatsheet.c": "C -- запитати Claude",
      "cheatsheet.e": "E -- експорт топ-10",
      "cheatsheet.numbers": "1..8 -- швидкiсть симуляцiї",
      "cheatsheet.question": "? -- показати/сховати цю пiдказку",
      "cheatsheet.close": "натисни будь-яку клавiшу або клiкни щоб закрити",
      "onboarding.title": "Ласкаво просимо до Swarm Evolution",
      "onboarding.intro": "Це симулятор роїв з еволюцiйним вiдбором. Нижче канвасу розташованi три панелi коментарiв:",
      "onboarding.panel1": "1 -- Дiї користувача -- тут з'являються вашi змiни параметрiв (їжа, хижаки, мутацiя).",
      "onboarding.panel2": "2 -- Динамiка популяцiї -- автоматичнi спостереження за трендами генiв та популяцiї.",
      "onboarding.panel3": "3 -- Коментар вiд Claude -- натиснiть \"Запитати Claude\" щоб отримати AI-аналiз, прогноз i рекомендацiю.",
    },
    en: {
      "header.title": "Swarm Evolution -- Iteration 1",
      "header.subtitle": "boids + evolution + commentary",
      "btn.pause": "Pause",
      "btn.resume": "Resume",
      "btn.reset": "Reset",
      "btn.export_top10": "Export top 10",
      "btn.export_run": "Export full run",
      "btn.export_csv": "Export CSV",
      "btn.export_image": "Export image",
      "btn.new_window": "New window",
      "btn.ask_claude": "Ask Claude",
      "btn.understood": "Got it",
      "btn.restore": "Restore",
      "btn.start_new": "Start new",
      "panel.user_actions": "1 -- User actions",
      "panel.dynamics": "2 -- Population dynamics",
      "panel.claude": "3 -- Claude commentary -- predictions & recommendations",
      "panel.controls": "Controls",
      "panel.population": "Population",
      "panel.genes": "Gene averages",
      "label.sim_speed": "Sim speed",
      "label.food": "Food",
      "label.predators": "Predators",
      "label.mutation": "Mutation rate",
      "label.current": "Current",
      "label.avg_age": "Avg age",
      "label.births": "Births",
      "label.deaths": "Deaths",
      "label.eaten": "Eaten",
      "label.tick": "Tick",
      "label.pop_over_time": "Population over time",
      "label.seed_placeholder": "Seed",
      "gene.speed": "speed",
      "gene.perception": "perception",
      "gene.cohesion": "cohesion",
      "gene.alignment": "alignment",
      "gene.separation": "separation",
      "gene.fleeStrength": "flee strength",
      "gene.size": "size",
      ... (same pattern for all keys)
    }
  }
  ```
- Support `{variable}` placeholders in strings, replaced by `t(key, { variable: value })`
- Default language: "uk"
- Module must be importable in Node.js without DOM (for future testing)
- No npm dependencies

**Acceptance criteria:**
- [ ] `src/client/js/i18n.js` exists and exports `t`, `setLang`, `getLang`, `LANGS`
- [ ] `t("btn.pause")` returns "Пауза" when lang is "uk"
- [ ] `t("btn.pause")` returns "Pause" when lang is "en"
- [ ] `t("trend.pop_grew", { n: 15 })` returns string with "15" substituted
- [ ] All ~90 UI strings have both "uk" and "en" translations
- [ ] Gene names have translations in both languages
- [ ] Module importable in Node.js without DOM
- [ ] No npm dependencies

**Dependencies:** none

---

## ISSUE-34: Language selector UI + persistence

**Description:** Add a language selector dropdown to the UI that switches all text between Ukrainian and English. Persist the choice in localStorage.

**What should be done:**
- Add a `<select>` dropdown in the header area with options: "Українська", "English"
- On change, call `setLang()` from i18n module and re-render all UI text
- Persist selected language in `localStorage.lang`
- On page load, restore language from `localStorage.lang` (default: "uk")
- Style the dropdown to match the dark theme
- The `<html lang="">` attribute should update to "uk" or "en"

**Acceptance criteria:**
- [ ] Language dropdown visible in the header area
- [ ] Selecting "English" switches all UI text to English
- [ ] Selecting "Українська" switches all UI text to Ukrainian
- [ ] Language choice persisted in `localStorage.lang`
- [ ] Language restored on page reload
- [ ] Default language is "uk"
- [ ] `<html lang="">` attribute updates on switch
- [ ] Dropdown styled to match dark theme

**Dependencies:** ISSUE-33

---

## ISSUE-35: Translate all static UI strings

**Description:** Replace all hardcoded strings in `index.html`, `main.js`, and `state.js` with calls to `t()` from the i18n module. Eliminate the current mix of English and Ukrainian.

**What should be done:**

**index.html -- add `data-i18n` attributes or `id`s for dynamic text update:**
- Header title and subtitle
- All button labels: Pause, Reset, Export top 10, Експорт повного запуску, Export CSV, Export image, Нове вiкно
- Panel titles: "Controls", "Population", "Gene averages", panel 1/2/3 titles
- Metric labels: Current, Avg age, Births, Deaths, Eaten, Tick
- Slider labels: Sim speed, Food, Predators, Mutation rate
- Chart label: "Population over time"
- Claude body placeholder text
- User log and obs log placeholder text

**main.js -- replace hardcoded strings:**
- `"Pause"` / `"Resume"` toggle (line 60)
- Alert text in export handler (line 75)
- Confirm dialog `"Скинути симуляцiю?"` (line 153)
- Claude loading text `"Claude думає..."` (line 99)
- Error message template (line 110)
- `"Запитати Claude"` button reset text (line 113)
- Full cheatsheet overlay content (lines 129-136)
- Full onboarding overlay content (lines 193-207)

**state.js -- replace hardcoded strings:**
- Restore banner: `"Знайдено збережений стан."`, `"Вiдновити"`, `"Почати нову"` (lines 84-86)

**Create a `renderUI()` function** that updates all static text elements from i18n. Call it on language switch and on page load.

**Acceptance criteria:**
- [ ] No hardcoded Ukrainian or English strings remain in index.html (only `data-i18n` attributes or ids)
- [ ] No hardcoded user-facing strings in main.js (all use `t()`)
- [ ] No hardcoded user-facing strings in state.js (all use `t()`)
- [ ] `renderUI()` function exists and updates all static text
- [ ] Switching language re-renders all visible text instantly
- [ ] No visual regression -- UI looks identical in both languages
- [ ] All buttons show correct labels in both languages

**Dependencies:** ISSUE-33, ISSUE-34

---

## ISSUE-36: Translate dynamic/generated strings

**Description:** Replace hardcoded Ukrainian strings in `ui.js` and `simulation.js` trend detection with i18n calls, so that dynamically generated observations, log entries, and gene labels display in the selected language.

**What should be done:**

**ui.js changes:**
- `SLIDER_UA` dictionary (line 14-18) -- replace with `t("slider.food")` etc.
- `renderObservations()` placeholder text (line 24) -- use `t("placeholder.obs_log", { n: TREND_WINDOW * 2 })`
- `renderUserLog()` placeholder text (line 36) -- use `t("placeholder.user_log")`
- `labelFor()` function (lines 124-129) -- use `t("log.food")` etc.
- Causal reaction string (line 109) -- use `t("trend.reaction", { ... })`
- Gene name display in sparkline container (line 78) -- show `t("gene." + g)` instead of raw English gene name `g`

**simulation.js changes:**
- `GENE_UA` dictionary (lines 17-20) -- keep as fallback but gene display should use `t("gene.xxx")`
- `detectTrends()` strings (lines 248-262):
  - "Популяцiя зросла/впала на N особин" -- use `t("trend.pop_grew/fell", { n })`
  - "Популяцiя стабiлiзувалася на ~N" -- use `t("trend.pop_stable", { n })`
  - Gene trend strings -- use `t("trend.gene_up/down", { gene, delta, val })`

**Acceptance criteria:**
- [ ] Gene names display in selected language in the sidebar sparklines
- [ ] Slider change log entries display in selected language in panel 1
- [ ] Trend observations display in selected language in panel 2
- [ ] Causal reaction observations display in selected language
- [ ] Switching language re-renders current observations and log entries
- [ ] No hardcoded Ukrainian remains in ui.js or simulation.js trend strings

**Dependencies:** ISSUE-33, ISSUE-35

---

## ISSUE-37: Switch Claude prompt language

**Description:** When the UI language changes, the Claude API prompt should also switch to the corresponding language, so Claude responds in the same language as the UI.

**What should be done:**
- In `claude.js`, create two prompt templates (one Ukrainian, one English)
- The system instruction and response language directive must match the selected language
- Use `getLang()` from i18n to determine which prompt template to use
- Ukrainian prompt: current text (keep as-is)
- English prompt: translate the full prompt to English:
  - "You are an expert in swarm intelligence and evolutionary algorithms..."
  - "Respond briefly and concretely in English (3-5 sentences max)..."
  - All parameter labels, gene names, section headers in English
  - Same 3-part response structure: assessment, prediction, recommendation
- The fallback text `"(порожня вiдповiдь)"` should also be translated

**Acceptance criteria:**
- [ ] Claude prompt is in Ukrainian when UI language is "uk"
- [ ] Claude prompt is in English when UI language is "en"
- [ ] Claude responds in Ukrainian when asked in Ukrainian
- [ ] Claude responds in English when asked in English
- [ ] Gene names in prompt match the current language
- [ ] Fallback/error text matches current language
- [ ] No change to API proxy or server code required

**Dependencies:** ISSUE-33, ISSUE-34

---

## ISSUE-38: Help button with controls/parameters reference

**Description:** Add a "Help" / "Довiдка" button that opens a modal overlay explaining all controls, parameters, gene meanings, and keyboard shortcuts. Content must be in both languages.

**What should be done:**
- Add a help button (using `t("btn.help")`) in the button row, styled with `?` or info icon (CSS only, no images)
- Clicking it opens a modal overlay (similar to cheatsheet but more detailed)
- Content sections:
  1. **Controls** -- what each slider does, with ranges and effects
  2. **Genes** -- table of all 7 genes with name, range, and what they control
  3. **Energy model** -- formula and explanation of trade-offs
  4. **Keyboard shortcuts** -- full list
  5. **Export options** -- what each export button does
  6. **Tips** -- 3-4 quick tips for interesting experiments
- Dismissable via close button or clicking outside
- All text uses `t()` -- renders in current language
- Add all help strings to the i18n module (both "uk" and "en")
- Scrollable if content exceeds viewport

**Acceptance criteria:**
- [ ] Help button visible in UI, labeled in current language
- [ ] Clicking opens a detailed modal overlay
- [ ] Modal contains: controls, genes, energy model, shortcuts, export, tips
- [ ] All text displays in current language
- [ ] Switching language while modal is open updates the text
- [ ] Modal is dismissable (close button or click outside)
- [ ] Modal is scrollable on small screens
- [ ] No emoji in any text

**Dependencies:** ISSUE-33

---

## ISSUE-39: Simulation scenario presets dropdown

**Description:** Add a dropdown selector with predefined simulation scenarios. Selecting a scenario sets all parameters (food, predators, mutation, speed, seed) to preset values and resets the simulation.

**What should be done:**
- Add a `<select>` dropdown labeled "Сценарiй" / "Scenario" (using `t()`) in the controls panel or button row
- First option: "-- Вiльний режим --" / "-- Free mode --" (no preset, current default)
- Predefined scenarios (names and descriptions in both languages):

  1. **Базовий** / **Baseline**
     - Food: 80, Predators: 2, Mutation: 15%, Speed: 4x, Seed: ""
     - Description: "Стандартнi умови для спостереження за природною конвергенцiєю" / "Standard conditions for observing natural convergence"

  2. **Тиск хижакiв** / **Predator pressure**
     - Food: 80, Predators: 6, Mutation: 15%, Speed: 4x, Seed: ""
     - Description: "Максимальний тиск хижакiв -- еволюцiя оборонних стратегiй" / "Maximum predator pressure -- evolution of defensive strategies"

  3. **Дефiцит ресурсiв** / **Resource scarcity**
     - Food: 10, Predators: 1, Mutation: 15%, Speed: 4x, Seed: ""
     - Description: "Мiнiмум їжi -- боротьба за виживання" / "Minimum food -- struggle for survival"

  4. **Рай** / **Paradise**
     - Food: 200, Predators: 0, Mutation: 15%, Speed: 4x, Seed: ""
     - Description: "Надлишок ресурсiв, немає загроз" / "Abundant resources, no threats"

  5. **Мутацiйний хаос** / **Mutation chaos**
     - Food: 60, Predators: 3, Mutation: 50%, Speed: 4x, Seed: ""
     - Description: "Максимальна мутацiя -- популяцiя мiж адаптацiєю i хаосом" / "Maximum mutation -- population between adaptation and chaos"

  6. **Вiдтворюваний експеримент** / **Reproducible experiment**
     - Food: 80, Predators: 3, Mutation: 15%, Speed: 4x, Seed: "experiment-1"
     - Description: "Фiксований seed для iдентичних запускiв" / "Fixed seed for identical runs"

- On select:
  - Apply all preset values to params
  - Update all slider positions and labels
  - Reset the simulation
  - Log the scenario change in panel 1
- Dropdown resets to "Free mode" if user manually changes any slider

**Acceptance criteria:**
- [ ] Scenario dropdown visible in UI
- [ ] 6 predefined scenarios + "Free mode" option
- [ ] Selecting a scenario applies all preset values
- [ ] Sliders update visually to match preset values
- [ ] Simulation resets on scenario selection
- [ ] Scenario change logged in panel 1
- [ ] Dropdown resets to "Free mode" on manual slider change
- [ ] Scenario names and descriptions in both languages (follow global language)
- [ ] No npm dependencies

**Dependencies:** ISSUE-33

---

## Dependency Graph

```
ISSUE-33 (i18n module)
  |
  +-- ISSUE-34 (language selector UI)
  |     |
  |     +-- ISSUE-35 (translate static strings)
  |     |     |
  |     |     +-- ISSUE-36 (translate dynamic strings)
  |     |
  |     +-- ISSUE-37 (Claude prompt language)
  |
  +-- ISSUE-38 (help button) -- independent of 34-37
  |
  +-- ISSUE-39 (scenario presets) -- independent of 34-37
```

**Execution order:**
1. ISSUE-33 (foundation)
2. ISSUE-34 + ISSUE-38 + ISSUE-39 (parallel, all depend only on 33)
3. ISSUE-35 + ISSUE-37 (parallel, depend on 33+34)
4. ISSUE-36 (depends on 33+35)
