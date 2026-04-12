const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { rateLimit, getBucket, buckets, MAX_TOKENS } = require("../../src/server/rate-limiter");

function mockReq(ip = "127.0.0.1") {
  return { socket: { remoteAddress: ip } };
}

function mockRes() {
  const r = { statusCode: null, headers: {}, body: "" };
  r.writeHead = (code, hdrs) => { r.statusCode = code; Object.assign(r.headers, hdrs || {}); };
  r.end = (data) => { r.body = data || ""; };
  return r;
}

describe("rate limiter", () => {
  beforeEach(() => buckets.clear());

  it("allows requests under the 10/min limit", () => {
    for (let i = 0; i < MAX_TOKENS; i++) {
      const res = mockRes();
      assert.equal(rateLimit(mockReq(), res), true);
    }
  });

  it("returns 429 when limit exceeded", () => {
    for (let i = 0; i < MAX_TOKENS; i++) {
      rateLimit(mockReq(), mockRes());
    }
    const res = mockRes();
    assert.equal(rateLimit(mockReq(), res), false);
    assert.equal(res.statusCode, 429);
  });

  it("tokens refill over time", () => {
    const ip = "10.0.0.1";
    // Exhaust tokens
    for (let i = 0; i < MAX_TOKENS; i++) {
      rateLimit(mockReq(ip), mockRes());
    }
    // Simulate time passing by manipulating lastRefill
    const bucket = buckets.get(ip);
    bucket.lastRefill = Date.now() - 30000; // 30 seconds ago

    const res = mockRes();
    assert.equal(rateLimit(mockReq(ip), res), true);
  });

  it("tracks per-IP separately", () => {
    // Exhaust tokens for IP A
    for (let i = 0; i < MAX_TOKENS; i++) {
      rateLimit(mockReq("192.168.1.1"), mockRes());
    }
    const resA = mockRes();
    assert.equal(rateLimit(mockReq("192.168.1.1"), resA), false);

    // IP B should still pass
    const resB = mockRes();
    assert.equal(rateLimit(mockReq("192.168.1.2"), resB), true);
  });
});
