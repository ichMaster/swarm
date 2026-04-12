const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const https = require("https");

// We need to mock the upstream Anthropic API. We'll intercept https.request.
const handleClaudeProxy = require("../../src/server/claude-proxy");

function mockReq(method, body) {
  const { EventEmitter } = require("events");
  const req = new EventEmitter();
  req.method = method;
  req.url = "/claude";
  if (body !== undefined) {
    process.nextTick(() => {
      req.emit("data", typeof body === "string" ? body : JSON.stringify(body));
      req.emit("end");
    });
  }
  return req;
}

function mockRes() {
  const r = { statusCode: null, headers: {}, body: "" };
  r.writeHead = (code, hdrs) => { r.statusCode = code; Object.assign(r.headers, hdrs || {}); };
  r.end = (data) => { r.body = data || ""; };
  return r;
}

describe("claude-proxy", () => {
  const origApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    if (origApiKey) process.env.ANTHROPIC_API_KEY = origApiKey;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  it("rejects non-POST methods", () => {
    const req = mockReq("GET");
    const res = mockRes();
    handleClaudeProxy(req, res);
    assert.equal(res.statusCode, 405);
  });

  it("rejects invalid JSON body", (_, done) => {
    const req = mockReq("POST", undefined);
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.includes("invalid JSON"));
      done();
    };
    process.nextTick(() => {
      req.emit("data", "not json{{{");
      req.emit("end");
    });
    handleClaudeProxy(req, res);
  });

  it("rejects missing prompt field", (_, done) => {
    const req = mockReq("POST", { notPrompt: "hello" });
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.includes("missing prompt"));
      done();
    };
    handleClaudeProxy(req, res);
  });

  it("returns 500 when API key not configured", (_, done) => {
    delete process.env.ANTHROPIC_API_KEY;
    const req = mockReq("POST", { prompt: "hello" });
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 500);
      const parsed = JSON.parse(res.body);
      assert.ok(parsed.error.includes("ANTHROPIC_API_KEY"));
      done();
    };
    handleClaudeProxy(req, res);
  });

  it("forwards prompt and returns extracted text (mocked upstream)", (_, done) => {
    // Mock https.request
    const origRequest = https.request;
    const { EventEmitter } = require("events");

    https.request = (opts, callback) => {
      const apiRes = new EventEmitter();
      apiRes.statusCode = 200;
      process.nextTick(() => {
        callback(apiRes);
        const response = JSON.stringify({
          content: [{ type: "text", text: "mocked response" }],
        });
        apiRes.emit("data", response);
        apiRes.emit("end");
      });
      const fakeReq = new EventEmitter();
      fakeReq.write = () => {};
      fakeReq.end = () => {};
      return fakeReq;
    };

    const req = mockReq("POST", { prompt: "test prompt" });
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      https.request = origRequest;
      assert.equal(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.text, "mocked response");
      done();
    };
    handleClaudeProxy(req, res);
  });

  it("handles API error responses gracefully", (_, done) => {
    const origRequest = https.request;
    const { EventEmitter } = require("events");

    https.request = (opts, callback) => {
      const apiRes = new EventEmitter();
      process.nextTick(() => {
        callback(apiRes);
        apiRes.emit("data", JSON.stringify({ error: { message: "rate limited" } }));
        apiRes.emit("end");
      });
      const fakeReq = new EventEmitter();
      fakeReq.write = () => {};
      fakeReq.end = () => {};
      return fakeReq;
    };

    const req = mockReq("POST", { prompt: "test" });
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      https.request = origRequest;
      assert.equal(res.statusCode, 500);
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.error, "rate limited");
      done();
    };
    handleClaudeProxy(req, res);
  });
});
