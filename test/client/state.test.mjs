import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectState, validateState } from "../../src/client/js/state.js";

describe("client state serialization", () => {
  it("serialization round-trip preserves all fields", () => {
    const params = { foodCount: 40, predatorCount: 2, mutationRate: 0.15, simSpeed: 1 };
    const history = {
      population: [50, 55, 60],
      genes: { speed: [0.5, 0.6], perception: [0.4, 0.45] },
    };
    const userLog = [{ tick: 10, text: "test change" }];
    const observations = ["population stable"];

    const state = collectState(params, history, userLog, observations);

    // Verify all fields round-trip
    assert.deepEqual(state.params, params);
    assert.deepEqual(state.history.population, history.population);
    assert.deepEqual(state.history.genes, history.genes);
    assert.deepEqual(state.userLog, userLog);
    assert.deepEqual(state.observations, observations);
    assert.equal(typeof state.savedAt, "number");
    assert.equal(typeof state.seed, "string"); // no DOM, seed = ""
  });

  it("collectState creates independent copies (no shared references)", () => {
    const params = { foodCount: 40 };
    const history = { population: [10, 20], genes: { speed: [0.5] } };
    const userLog = [{ tick: 1, text: "a" }];
    const observations = ["obs1"];

    const state = collectState(params, history, userLog, observations);

    // Mutate originals — state should be unaffected
    params.foodCount = 999;
    history.population.push(999);
    history.genes.speed.push(999);
    userLog.push({ tick: 999, text: "new" });
    observations.push("new");

    assert.equal(state.params.foodCount, 40);
    assert.equal(state.history.population.length, 2);
    assert.equal(state.history.genes.speed.length, 1);
    assert.equal(state.userLog.length, 1);
    assert.equal(state.observations.length, 1);
  });

  it("validateState accepts valid state", () => {
    const valid = {
      savedAt: Date.now(),
      params: { foodCount: 40 },
      history: { population: [50] },
    };
    assert.equal(validateState(valid), true);
  });

  it("validateState rejects null/undefined", () => {
    assert.ok(!validateState(null));
    assert.ok(!validateState(undefined));
  });

  it("validateState rejects missing savedAt", () => {
    assert.ok(!validateState({ params: {}, history: { population: [] } }));
  });

  it("validateState rejects missing params", () => {
    assert.ok(!validateState({ savedAt: 1, history: { population: [] } }));
  });

  it("validateState rejects missing history.population", () => {
    assert.ok(!validateState({ savedAt: 1, params: {}, history: {} }));
  });

  it("handles missing fields gracefully (no crash)", () => {
    // collectState with empty data
    assert.doesNotThrow(() => {
      collectState({}, { population: [], genes: {} }, [], []);
    });

    // validateState with partial data
    assert.doesNotThrow(() => {
      validateState({});
      validateState({ savedAt: "not a number" });
      validateState(42);
      validateState("string");
    });
  });
});
