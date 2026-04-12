# Swarm Evolution — v1 (Iteration 1)

Iнтерактивна симуляцiя роєвого iнтелекту з генетичним вiдбором i AI-коментатором. Це стартовий прототип iтерацiї 1 з 5-крокового roadmap побудови платформи для дослiдження роєвих систем.

**Статус:** часткова реалiзацiя, потребує доробки через Claude Code. Див. `specification/SPECIFICATION.md`.

---

## Структура проєкту

```
swarm-evolution-v1/
├── index.html           Повний симулятор (vanilla JS + Canvas 2D, inline)
├── proxy.js             Node.js HTTP proxy для виклику Claude API
├── package.json         Скрипти запуску, без npm-залежностей
├── .env.example         Шаблон для API ключа
├── .gitignore
├── README.md            Цей файл — iнструкцiя для користувача
└── specification/SPECIFICATION.md     Iнженерна специфiкацiя англiйською для Claude Code
```

---

## Швидкий старт у поточному (частковому) станi

### Варiант A: тiльки симулятор (без AI)

Панелi 1 (дiї користувача) i 2 (динамiка популяцiї) працюють без будь-яких залежностей.

1. Вiдкрий `index.html` у браузерi подвiйним клiком
2. Все iнше працює одразу

Панель 3 (Claude) показуватиме помилку пiдключення — це нормально для варiанту A.

### Варiант B: повна версiя з AI-коментатором

1. Скопiюй шаблон env:
   ```bash
   cp .env.example .env
   ```

2. Встав свiй API ключ у `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Ключ беремо на https://console.anthropic.com/settings/keys

3. Запусти proxy сервер:
   ```bash
   export $(cat .env | xargs)
   node proxy.js
   ```

4. Вiдкрий `index.html` у браузерi

5. Натисни "Запитати Claude" у панелi 3

---

## Як довести проєкт до повноцiнного solution

Поточна версiя працює, але має ряд обмежень: окремий запуск proxy i HTML, немає `.env` auto-loading, немає persistence, немає unified server. Повна специфiкацiя того, що треба доробити — у файлi `specification/SPECIFICATION.md` (англiйською, бо призначена для Claude Code).

### Запуск через Claude Code

```bash
cd swarm-evolution-v1
claude
```

У Claude Code:
> Read specification/SPECIFICATION.md and complete all P0 items. After each change, verify the project still runs with `npm start`.

Claude Code пройдеться по всiх P0 (must-have) пунктах, потiм P1 (should-have), i опцiонально P2 (nice-to-have). Пiсля виконання у тебе буде робочий solution з однокомандним запуском.

---

## Що в симуляторi

### Механiка

- **Агенти:** 60-120 боїдiв, кожен з 7-параметричним геномом (`speed`, `perception`, `cohesion`, `alignment`, `separation`, `fleeStrength`, `size`)
- **Правила руху:** класичнi три правила Рейнольдса + втеча вiд хижакiв + пошук їжi
- **Еволюцiя:** асинхронна, роздвоєння при енергiї > 70 з мутацiєю, смерть при енергiї ≤ 0 або вiд хижака
- **Середовище:** 900×600 canvas з wraparound краями, їжа спавниться з постiйною частотою, хижаки полюють на найближчого боїда

### Три панелi коментарiв

- **Панель 1 (жовта) — Дiї користувача.** Автоматичний лог змiн параметрiв.
- **Панель 2 (зелена) — Динамiка популяцiї.** Rule-based детектор трендiв, який порiвнює 60-тiковi вiкна i ловить значнi змiни.
- **Панель 3 (фiолетова) — Коментар вiд Claude.** Виклик Claude API за натисканням кнопки з поточним контекстом i проханням дати прогноз + рекомендацiю.

### Контроли

| Контрол | Дiапазон | Ефект |
|---|---|---|
| Sim speed | 1-8× | Кiлькiсть step'iв на кадр |
| Food | 5-100 | Щiльнiсть ресурсiв |
| Predators | 0-6 | Тиск хижакiв |
| Mutation rate | 0-50% | Швидкiсть еволюцiї |

---

## Експерименти для початку

1. **Baseline.** Запусти як є. Через 1-2 хвилини подивися якi гени конвергують.
2. **Предаторський тиск.** Predators = 6, food = 40. Cohesion i fleeStrength мають зрости.
3. **Достаток.** Predators = 0, food = 100. Cohesion впаде, агенти стануть самiтниками.
4. **Стрес-тест мутацiї.** Mutation rate = 50%, food = 20, predators = 3. Популяцiя або адаптується, або вимре.

Кнопка **Export top 10** виводить у консоль браузера (F12) геноми 10 найстарiших боїдiв — знадобиться в iтерацiї 2 як starting seed.

---

## Наступнi кроки (iтерацiї 2-5)

Це тiльки iтерацiя 1. Повний roadmap:

- **Iт. 1** (цей проєкт) — HTML прототип для iнтуїцiї
- **Iт. 2** — Python/pygame з просторовим iндексом, перешкодами, headless-режимом
- **Iт. 3** — StarCraft/SMAC як зовнiшнiй полiгон для перевiрки архiтектури
- **Iт. 4** — NEAT-еволюцiя нейромереж-контролерiв
- **Iт. 5** — ARGoS з фiзикою i sim2real на реальних UGV

Див. основний документ `swarm-simulator-roadmap.md` у Notion.
