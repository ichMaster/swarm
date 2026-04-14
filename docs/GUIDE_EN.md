# Swarm Evolution -- Detailed Guide

A complete description of the swarm intelligence simulator with evolutionary selection: how it works, what can be changed, and 10 educational scenarios for exploring emergent behavior.

---

## Table of Contents

1. [What is Swarm Evolution](#1-what-is-swarm-evolution)
2. [Core Concepts](#2-core-concepts)
3. [How the Simulation Works](#3-how-the-simulation-works)
4. [Genome and Genes](#4-genome-and-genes)
5. [Evolutionary Cycle](#5-evolutionary-cycle)
6. [Environment](#6-environment)
7. [User Interface](#7-user-interface)
8. [Adjustable Parameters](#8-adjustable-parameters)
9. [Commentary System](#9-commentary-system)
10. [Export and Saving](#10-export-and-saving)
11. [10 Educational Scenarios](#11-10-educational-scenarios)
12. [Glossary](#12-glossary)

---

## 1. What is Swarm Evolution

Swarm Evolution is an interactive simulator that models the behavior of a swarm of autonomous agents (boids) in a two-dimensional space. Each agent has its own set of genes that determine its behavior: how fast it moves, how closely it sticks to the group, and how it reacts to predators and food.

The key feature is **evolutionary selection**: agents that efficiently gather food and avoid predators survive longer, accumulate energy, and reproduce. Their offspring inherit the parent's genes with small mutations. Agents that spend too much energy or fall prey to predators die. Over time, the population adapts to environmental conditions -- this is natural selection in action.

The simulator is built on the classic **boids** model (Craig Reynolds, 1986), extended with evolutionary mechanics, an energy model, and AI commentary from Claude.

### Who is this simulator for

- **Biology students** -- observing natural selection in real time
- **Computer science students** -- studying emergent behavior and multi-agent systems
- **AI researchers** -- building intuition about swarm intelligence before moving to more complex platforms
- **Educators** -- visual demonstration of evolutionary concepts

---

## 2. Core Concepts

### Boid

An autonomous agent in the simulation. The term comes from "bird-oid" (bird-like). Each boid is a point on the canvas with a position, velocity, energy, age, and a genome of 7 genes.

On screen, boids are displayed as triangles of various colors. The color is determined by the genome: hue depends on cohesion and alignment, saturation on speed, brightness on perception. When the population converges (genes become similar), all boids take on a similar color -- this is a visual indicator of evolution.

### Predator

A red circle that hunts boids. A predator moves toward the nearest boid within its perception radius (120 px) at a speed of 1.8 units. If no prey is nearby, the predator wanders randomly. On contact (distance < 10 px) the boid dies instantly.

### Food

A green dot on the canvas. When a boid approaches food within 10 px, it eats it and receives +35 energy units. The food immediately respawns at a random location.

### Energy

Each boid starts with 50 energy units. Every tick it spends energy according to the formula:

```
drain = 0.15 * (0.5 + speed * 0.5 + size * 0.3)
```

This means fast and large agents spend more energy -- creating evolutionary pressure against "super-agents" that are simultaneously fast and large.

### Tick

One simulation step. In a single tick, each boid computes forces, updates position, spends energy, and checks for reproduction. At speed 1x, one tick executes per frame; at 8x -- 8 ticks per frame.

---

## 3. How the Simulation Works

### Simulation Step (step by step)

Each tick performs the following actions for every boid:

**1. Neighbor search.** The boid looks for other boids within its perception radius. The radius depends on the `perception` gene:

```
radius = 30 + perception * 80 pixels
```

Minimum radius (at perception = 0.3) is 54 px, maximum (at 1.0) is 110 px.

For optimization, a **spatial hash grid** is used: the canvas is divided into 110x110 px cells, and neighbor searches check only 9 adjacent cells instead of all boids.

**2. Computing Reynolds forces.** Three classic forces are calculated for found neighbors:

- **Separation:** if a neighbor is closer than 20 px, the boid is pushed away. Force is scaled by the `separation` gene with a coefficient of 1.5.
- **Alignment:** the boid tries to move in the same direction as its neighbors. Force is scaled by the `alignment` gene with a coefficient of 0.4.
- **Cohesion:** the boid moves toward the center of mass of its neighbors. Force is scaled by the `cohesion` gene with a coefficient of 0.003.

**3. Fleeing from predators.** If a predator is within the perception radius, the boid is pushed away from it. Force is scaled by the `fleeStrength` gene with a coefficient of 3 -- this is the strongest of all forces, because death from a predator is instant.

**4. Food seeking.** The boid moves toward the nearest food within its perception radius with a fixed force of 0.5.

**5. Velocity update.** All forces are added to the current velocity. Maximum speed is capped:

```
max speed = 1.5 + speed * 2.5 units/tick
```

If current speed exceeds the maximum, the velocity vector is normalized.

**6. Position update.** The boid moves according to its velocity. Canvas edges wrap around (toroidal topology): if a boid exits the right edge, it appears on the left.

**7. Food consumption.** If the nearest food is within 10 px, the boid eats it (+35 energy), and the food respawns.

**8. Energy drain.** Formula: `0.15 * (0.5 + speed * 0.5 + size * 0.3)`.

**9. Aging.** The boid's age increases by 1.

**10. Reproduction.** If energy > 70 and the population hasn't exceeded the maximum (240), the boid reproduces:
- The parent loses half its energy
- An offspring is born near the parent
- The offspring's genome is a mutated copy of the parent's genome

**11. Death.** If energy <= 0, the boid dies and is removed from the simulation.

### Predator Behavior

After processing all boids, predators are processed:
- A predator searches for the nearest boid within 120 px
- If found -- moves toward it
- If not -- wanders randomly
- On contact (< 10 px) the boid dies
- Each predator can kill only one boid per tick

### Population Maintenance

After processing all agents:
- If the population drops below 40, new random boids are created (emergency respawn)
- The number of predators and food is synchronized with current slider parameters

---

## 4. Genome and Genes

Each boid has a genome of 7 genes. Each gene is a number from minimum to maximum:

| Gene | Range | What it determines |
|------|-------|-------------------|
| `speed` | 0.3 -- 1.0 | Maximum movement speed. Higher values allow faster food finding and predator evasion, but consume more energy. |
| `perception` | 0.3 -- 1.0 | Sight radius (54-110 px). Larger radius allows seeing more neighbors, food, and predators from afar. |
| `cohesion` | 0.0 -- 1.0 | How strongly the boid is pulled toward the group center. High values create tight flocks. |
| `alignment` | 0.0 -- 1.0 | How strongly the boid aligns its direction with neighbors. High values create streams. |
| `separation` | 0.3 -- 1.0 | How strongly the boid avoids collisions with others. Prevents agents from merging into one point. |
| `fleeStrength` | 0.2 -- 1.0 | How strongly the boid flees from predators. Low values mean a "brave" (or foolish) agent. |
| `size` | 0.4 -- 1.0 | Visual triangle size. Larger size consumes more energy. |

### Mutation

During reproduction, each gene of the offspring has a chance to mutate (determined by the "mutation rate" parameter). If mutation occurs, the gene value changes by a random amount within -0.15...+0.15, but stays within the gene's range.

Example: parent has `speed = 0.7`, mutation = +0.08. Offspring gets `speed = 0.78`.

### Color Encoding

A boid's color is determined by its genome:
- **Hue** depends on `cohesion` and `alignment` -- changes from greenish to blue-violet
- **Saturation** depends on `speed` -- faster agents are more vivid
- **Brightness** depends on `perception` -- agents with larger sight radius are lighter

When the population converges (all genes become similar), all boids take on the same color. This is a visual signal that evolution has found a stable strategy.

---

## 5. Evolutionary Cycle

### Selection Pressure

Evolution occurs through two mechanisms of natural selection:

**Positive selection (reproduction):** agents that efficiently gather food and avoid predators accumulate energy above 70 units and reproduce. Their genes are passed to offspring.

**Negative selection (death):** agents that spend too much energy or fall prey to predators die. Their genes disappear from the gene pool.

### Trade-offs

The simulation is built on several key trade-offs:

1. **Speed vs. Energy:** faster agents find food better and escape predators, but spend more energy. In food-scarce conditions, slow agents may survive longer.

2. **Size vs. Energy:** larger agents spend more energy with no advantages. Evolution typically selects for small agents -- unless larger size provides incidental advantages through random correlations.

3. **Cohesion vs. Independence:** flocks help detect predators (more "eyes"), but in food-scarce conditions, agents in flocks compete for the same resources.

4. **Fleeing vs. Feeding:** if predators are few, agents with high `fleeStrength` waste energy on unnecessary maneuvers. But if predators are many, low `fleeStrength` is a death sentence.

### Evolutionary Dynamics

A typical evolution cycle:

1. **Start (ticks 0-200):** random population with diverse genomes. High mortality.
2. **Early adaptation (ticks 200-500):** agents with better genes begin to dominate. Genetic diversity decreases.
3. **Convergence (ticks 500-1000):** population stabilizes. Most genes converge to optimal values for current conditions.
4. **Equilibrium (ticks 1000+):** stable state. Mutations create slight variation, but strong deviations are quickly eliminated.

If conditions change (e.g., the user adds predators), the cycle restarts -- the population re-adapts.

---

## 6. Environment

### Canvas

The environment is a rectangular space of 1800 x 900 pixels with **toroidal topology**: an agent that exits the right edge appears on the left; one that exits the bottom appears at the top. This eliminates the "wall effect" -- agents don't cluster along edges.

### Grid

A dark grid with 60 px spacing is visible on the canvas background. It doesn't affect the simulation -- it only helps visually estimate distances and positions.

### Spatial Optimization

A uniform spatial grid with 110 px cells (maximum perception radius) is used for neighbor searches. The canvas is divided into 17 columns and 9 rows = 153 cells. When searching for neighbors, only 9 adjacent cells are checked (including the boid's own). This allows simulating 1000+ boids at 60 frames per second.

---

## 7. User Interface

### Layout

The interface consists of three zones:

**Left side (canvas):**
- Header "Swarm Evolution -- Iteration 1"
- Simulation canvas (1800x900)
- Button row: Pause, Reset, Seed, Export top 10, Export full run, Export CSV, Export image, New window, Help
- Two commentary panels (yellow and green)
- Claude panel (purple, full width)

**Right side (sidebar):**
- Control sliders (speed, food, predators, mutation)
- Population metrics (count, age, births, deaths, eaten, tick)
- Population sparkline (graph of the last 200 ticks)
- Gene averages with sparklines

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / resume simulation |
| `R` | Reset simulation (with confirmation dialog) |
| `C` | Ask Claude |
| `E` | Export top 10 genomes to console |
| `1`...`8` | Set simulation speed |
| `?` | Show/hide keyboard shortcut cheatsheet |

Shortcuts don't work when an input field (e.g., Seed) has focus.

### Responsive Layout

At window widths below 1100 px, the interface rearranges: the canvas stretches to full width (maintaining 2:1 aspect ratio), the sidebar moves below the canvas, and commentary panels stack vertically.

---

## 8. Adjustable Parameters

### Sliders (changed in real time)

| Parameter | Slider | Range | Default | Effect |
|-----------|--------|-------|---------|--------|
| **Simulation speed** | Sim speed | 1-8x | 1x | Ticks per frame. At 8x evolution happens 8 times faster, but animation becomes less smooth. |
| **Food count** | Food | 5-200 | 80 | More food means more energy for the population, faster growth, less selection pressure. |
| **Predator count** | Predators | 0-6 | 2 | More predators means higher selection pressure on flee and cohesion genes. |
| **Mutation rate** | Mutation rate | 0-50% | 15% | Probability of mutating each gene during reproduction. High mutation = more diversity but less stability. |

### Seed Field

A text field next to the Reset button. If a value is entered, the simulation uses a deterministic random number generator (Mulberry32). This means the same seed always produces identical results -- useful for reproducing experiments.

If the field is empty, standard `Math.random()` is used (non-reproducible).

### Control Buttons

| Button | Action |
|--------|--------|
| **Pause / Resume** | Stops or continues the simulation |
| **Reset** | Resets the simulation: new random population, clears history |
| **Export top 10** | Outputs the 10 oldest boids to the browser console (F12) |
| **Export full run** | Downloads a JSON file with complete history |
| **Export CSV** | Downloads CSV with ticks, population, and gene averages |
| **Export image** | Saves the current canvas frame as PNG |
| **New window** | Opens a new tab with an independent simulation |
| **Ask Claude** | Sends current context to Claude for analysis |
| **Help** | Opens a detailed reference modal with controls, genes, and tips |

---

## 9. Commentary System

The simulator has three commentary panels that work independently:

### Panel 1 -- User Actions (yellow)

Automatically logs all parameter changes with tick timestamps:

```
[t=342] Predators: 2 -> 5
[t=510] Food: 40 -> 20
[t=680] Mutation: 15% -> 30%
```

Keeps the last 20 entries. This lets you track when which changes were made.

### Panel 2 -- Population Dynamics (green)

An automatic trend detector that runs every 30 ticks. Compares two 60-tick windows (current and previous) and generates observations:

**Population trends:**
- "Population grew by 15" -- if difference > 8
- "Population stabilized at ~65" -- if difference < 3

**Gene trends:**
- "speed increased by 0.08 (now 0.72)" -- if change > 0.05
- "cohesion decreased by 0.12 (now 0.45)"

**Causal links (yellow-green):** After a slider change, the system waits 60 ticks, then checks if genes changed. If so, it generates a reaction:

```
[reaction] After changing predators to 5, flee strength increased by 0.12 over 60 ticks
```

This makes the cause-and-effect relationship between user actions and evolutionary response explicit.

### Panel 3 -- Claude Commentary (purple)

Pressing "Ask Claude" sends the current context (parameters, metrics, gene averages, action log, trends) to Claude via a local proxy server. Claude analyzes the situation and responds with three short paragraphs:

1. **Assessment** -- what type of ecological niche the population is converging toward
2. **Prediction** -- what will happen in the next 1-2 minutes
3. **Recommendation** -- what to change to see an interesting effect

During the request, the button shows an animated spinner, and moving dots appear in the panel. The response appears with a smooth animation.

Limit: 10 requests per minute per IP address. Repeated clicks during processing are ignored.

---

## 10. Export and Saving

### Auto-save

The simulation automatically saves state every 30 seconds and on tab close. Saved: slider parameters, population and gene history, action log, observations. Boid positions are NOT saved -- on restore, a new population is created with the same parameters.

On reload, if the saved state is less than 24 hours old, a banner appears with "Restore" and "Start new" buttons.

### Multi-window Mode

The "New window" button opens a new tab with an independent simulation. Each tab receives a unique identifier and saves state in a separate slot. This allows running two experiments in parallel with different parameters.

### Export Formats

| Format | Button | Contents |
|--------|--------|----------|
| **JSON** | Export full run | Complete state: parameters, seed, population history, gene history, action log, observations |
| **CSV** | Export CSV | Tabular data: tick, population, average values of 7 genes. Opens in Excel, Google Sheets, pandas. |
| **PNG** | Export image | Snapshot of the current canvas frame |
| **Console** | Export top 10 | 10 oldest boids with genomes (output to browser console) |

---

## 11. 10 Educational Scenarios

### Scenario 1: Baseline Evolution -- Observing Convergence

**Goal:** understand how natural selection leads to gene convergence without any intervention.

**Setup:**
- Food: 40, Predators: 2, Mutation: 15%, Speed: 4x
- Seed: 42 (for reproducibility)

**What to do:**
1. Run the simulation and observe for 3-5 minutes
2. Watch the gene sparklines in the sidebar
3. Pay attention to the changing boid colors

**What to observe:**
- Initially, boids are various colors -- this is a visual reflection of genetic diversity
- After 1-2 minutes, colors begin to converge -- the population is converging
- Gene sparklines stabilize at certain values
- Panel 2 reports: "Population stabilized at ~N"

**Discussion questions:**
- Why don't all genes converge at the same rate?
- Which gene converges first and why?
- What happens if you run with a different seed?

---

### Scenario 2: Predator Pressure -- Evolution of Defensive Strategies

**Goal:** explore how increased predator threat changes the population's evolutionary strategy.

**Setup:**
- Start with: Food: 40, Predators: 0, Mutation: 15%, Speed: 4x

**What to do:**
1. Run with 0 predators for 2 minutes -- this is the baseline
2. Record the average values of `cohesion`, `fleeStrength`, `speed`
3. Increase predators to 4
4. Observe for 3 minutes
5. Increase predators to 6
6. Observe for another 3 minutes

**What to observe:**
- At 0 predators: low `cohesion` and `fleeStrength` (no need for them)
- At 4 predators: rapid increase in `fleeStrength` and `cohesion`
- At 6 predators: possible population crash, then recovery with even higher defensive genes
- Causal links in panel 2 will clearly show the reaction to changes

**Discussion questions:**
- Why does `cohesion` increase when predators appear? (hint: flocking is protection)
- Is there a maximum predator level at which the population cannot survive?
- How does `speed` change -- does it increase or decrease?

---

### Scenario 3: Resource Scarcity -- Struggle for Survival

**Goal:** explore how resource limitation affects evolutionary strategies.

**Setup:**
- Food: 5, Predators: 1, Mutation: 15%, Speed: 4x

**What to do:**
1. Run with minimum food and observe for 3 minutes
2. Pay attention to population fluctuations
3. Press "Ask Claude" for situation analysis
4. Gradually increase food to 20, then 60, then 100
5. At each stage, wait 2 minutes and record gene values

**What to observe:**
- With food scarcity, the population fluctuates near the minimum (40)
- Evolution selects agents with low `speed` and `size` (energy-efficient)
- With food abundance (100) -- `cohesion` may drop (no need for flocks to search)
- Different resource levels select for different strategies

**Discussion questions:**
- Why do slow agents survive better than fast ones in food scarcity?
- How does `perception` change at different resource levels?
- Compare with real ecosystems: why do plants grow slowly in poor soil?

---

### Scenario 4: Mutation Stress Test

**Goal:** understand the role of mutation rate in evolution.

**Setup:**
- Food: 30, Predators: 2, Speed: 4x

**What to do:**
1. Run with mutation at 0% for 2 minutes -- record gene state
2. Set mutation to 5% -- wait 3 minutes
3. Set mutation to 15% -- wait 3 minutes
4. Set mutation to 50% -- wait 3 minutes
5. Compare gene stability at each stage

**What to observe:**
- At 0%: zero evolution -- the initial random genes remain forever
- At 5%: slow, stable adaptation -- sparklines move smoothly toward optimum
- At 15%: healthy evolution -- fast adaptation with stable results
- At 50%: chaos -- sparklines jump, population is unstable, evolution can't "lock in" good genes

**Discussion questions:**
- Why is excessively high mutation harmful? (hint: "mutational load")
- Why is excessively low mutation also a problem? (hint: inability to adapt)
- What is the optimal mutation rate and does it depend on conditions?

---

### Scenario 5: Reproducibility -- Science Requires Repetition

**Goal:** understand the importance of determinism and reproducibility in scientific experiments.

**Setup:**
- Food: 40, Predators: 3, Mutation: 15%, Speed: 4x, Seed: "experiment-1"

**What to do:**
1. Enter seed "experiment-1" and press Reset
2. Run the simulation for 2 minutes, record final gene values
3. Press Reset (seed remains)
4. Run again for 2 minutes -- compare results
5. Change seed to "experiment-2" -- compare with the previous

**What to observe:**
- Both runs with seed "experiment-1" produce absolutely identical results -- same positions, same genetic trends
- Seed "experiment-2" gives a different but also reproducible result
- Without a seed, every run is different

**Discussion questions:**
- Why is reproducibility important in science?
- If two different seeds give different results, how do you determine which result is "correct"?
- How many runs are needed for statistically significant conclusions?

---

### Scenario 6: Comparative Analysis -- Two Windows, Two Strategies

**Goal:** directly compare two different evolutionary strategies.

**Setup:**
- Window 1: Food: 60, Predators: 0, Mutation: 15%, Seed: "compare-1"
- Window 2: Food: 60, Predators: 6, Mutation: 15%, Seed: "compare-1"

**What to do:**
1. Configure the first tab as specified
2. Press "New window" -- a new tab opens
3. In the new tab, set 6 predators (leave the rest)
4. Run both for 5 minutes
5. Do Export CSV in both tabs
6. Compare the data

**What to observe:**
- Same seed but different environments -- different evolutionary paths
- Without predators: "relaxed" genes -- low `fleeStrength`, low `cohesion`
- With predators: "military" genes -- high `fleeStrength`, high `cohesion`
- `speed` may be similar in both -- speed is always useful

**Discussion questions:**
- How does environmental pressure shape genotype?
- Compare with real examples: island animals vs. mainland animals
- Why do some genes converge similarly in both scenarios?

---

### Scenario 7: Catastrophe and Recovery

**Goal:** explore how a population recovers after a sudden catastrophe.

**Setup:**
- Start with: Food: 50, Predators: 2, Mutation: 15%, Speed: 4x

**What to do:**
1. Run and wait for stabilization (3-4 minutes)
2. Record stable gene values and population count
3. CATASTROPHE: simultaneously set Food = 5, Predators = 6
4. Observe the population crash
5. After 1 minute, restore normal conditions: Food = 50, Predators = 2
6. Observe recovery

**What to observe:**
- Population crash to minimum (20, emergency respawn)
- After restoring conditions -- rapid growth
- BUT: after the "bottleneck," genetic diversity is reduced
- Genes after the catastrophe may differ from the previously stable ones

**Discussion questions:**
- What is the "bottleneck effect"?
- Why might the population have different genes after a catastrophe than before?
- Compare with real examples: northern elephant seal, cheetah

---

### Scenario 8: Paradise Without Pressure -- Degradation or Stability?

**Goal:** explore what happens to evolution when selection pressure is absent.

**Setup:**
- Food: 100, Predators: 0, Mutation: 15%, Speed: 4x

**What to do:**
1. Run "paradise" conditions for 5 minutes
2. Record gene values
3. Press "Ask Claude" for analysis
4. Compare with results from scenario 2 (high predator pressure)

**What to observe:**
- Population quickly reaches maximum (240)
- `cohesion` and `fleeStrength` decrease -- no need for them
- `speed` may decrease -- less need to search for food
- `size` -- an interesting case: is small size selected for (less energy drain)?

**Discussion questions:**
- Why does evolution still occur in "paradise"?
- What is "genetic drift"?
- Compare with real examples: cave animals that lose their sight

---

### Scenario 9: Evolutionary Arms Race

**Goal:** model gradual pressure escalation and observe adaptation.

**Setup:**
- Start with: Food: 40, Predators: 0, Mutation: 15%, Speed: 4x

**What to do:**
1. Run with 0 predators -- wait 2 minutes
2. Add 1 predator -- wait 2 minutes
3. Add another 1 (now 2) -- wait 2 minutes
4. Continue adding 1 every 2 minutes up to 6
5. After each step, press "Ask Claude"

**What to observe:**
- Gradual increase in `fleeStrength` with each predator addition
- `cohesion` increases -- flocking as defense
- Population may remain stable with gradual addition, but crash with sudden increase
- Claude will comment on each stage and make predictions

**Discussion questions:**
- Why does gradual escalation allow adaptation, but sudden escalation doesn't?
- Compare with the "boiled frog" concept in ecology
- What is the "evolutionary arms race" (Red Queen hypothesis)?

---

### Scenario 10: Data Collection and Analysis -- A Quantitative Approach

**Goal:** learn to collect data, analyze it, and draw conclusions based on quantitative metrics.

**Setup:**
- 4 separate runs with seeds "data-1", "data-2", "data-3", "data-4"
- For each: Food: 40, Predators: 3, Mutation: 15%, Speed: 8x

**What to do:**
1. For each seed:
   a. Set the seed, press Reset
   b. Run for 3 minutes (at 8x this is ~1440 ticks)
   c. Press "Export CSV"
2. Open all 4 CSV files in Excel or Google Sheets
3. Build charts: average value of each gene over ticks for all 4 runs
4. Calculate mean and standard deviation of final gene values

**What to observe:**
- All 4 runs converge to similar but not identical values
- Some genes have small variation (strong selection pressure), others have large variation (weak pressure)
- You can calculate the "stability" of each gene as 1/standard_deviation

**What to analyze:**
- Which gene is most stable (smallest variation between runs)?
- Which gene is least stable and why?
- Can you predict final gene values knowing the environmental parameters?

**Discussion questions:**
- How many runs are needed for reliable conclusions?
- How do you determine if the difference between two conditions is statistically significant?
- How does this approach differ from "looked once and drew a conclusion"?

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Boid** | An autonomous agent in the simulation that moves according to Reynolds rules and has an evolutionary genome |
| **Genome** | A set of 7 genes that determine a boid's behavior |
| **Gene** | A numerical value in the range [min, max] that controls one aspect of behavior |
| **Mutation** | A random change in a gene value during reproduction |
| **Tick** | One simulation step |
| **Convergence** | The process of gene values in the population approaching optimal values |
| **Drift** | Random changes in gene frequency unrelated to selection pressure |
| **Bottleneck** | A sharp population decrease that reduces genetic diversity |
| **Selection pressure** | Environmental factors that determine which genes provide an advantage |
| **Emergent behavior** | Complex collective behavior that arises from simple individual rules |
| **Reynolds rules** | Three rules of boid movement: separation, alignment, cohesion |
| **Toroidal topology** | A space where opposite edges are connected (exit right = enter left) |
| **Spatial grid** | A data structure for fast neighbor lookups in space |
| **Deterministic PRNG** | A pseudo-random number generator that produces an identical sequence for the same seed |
| **Sparkline** | A miniature chart showing the trend of a value over the last 200 ticks |
| **Causal link** | A cause-and-effect relationship between a user action and a population reaction |
| **Trade-off** | A situation where improving one parameter worsens another |
| **Fitness** | An agent's ability to survive and reproduce under current conditions |
