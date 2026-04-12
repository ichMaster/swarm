import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mulberry32, createRng, hashString } from "../../src/client/js/prng.js";

describe("PRNG (Mulberry32)", () => {
  it("same seed produces identical sequence", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    assert.deepEqual(seq1, seq2);
  });

  it("different seeds produce different sequences", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(99);
    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());
    assert.notDeepEqual(seq1, seq2);
  });

  it("output distribution is roughly uniform", () => {
    const rng = mulberry32(12345);
    const N = 10000;
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      const v = rng();
      assert.ok(v >= 0 && v < 1, `value ${v} out of [0,1) range`);
      buckets[Math.floor(v * 10)]++;
    }
    // Each bucket should have ~1000 values. Allow 30% deviation.
    const expected = N / 10;
    for (let i = 0; i < 10; i++) {
      assert.ok(
        buckets[i] > expected * 0.7 && buckets[i] < expected * 1.3,
        `bucket ${i} has ${buckets[i]}, expected ~${expected}`
      );
    }
  });

  it("createRng returns Math.random for null/empty seed", () => {
    assert.equal(createRng(null), Math.random);
    assert.equal(createRng(""), Math.random);
    assert.equal(createRng(undefined), Math.random);
  });

  it("createRng returns deterministic function for number seed", () => {
    const rng = createRng(42);
    assert.notEqual(rng, Math.random);
    assert.equal(typeof rng, "function");
    // Should be deterministic
    const rng2 = createRng(42);
    assert.equal(rng(), rng2());
  });

  it("createRng handles string seeds via hashString", () => {
    const rng1 = createRng("test");
    const rng2 = createRng("test");
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    assert.deepEqual(seq1, seq2);
  });
});
