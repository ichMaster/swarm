const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");

const STATE_PATH = path.resolve(process.cwd(), "state.json");
const handleState = require("../../src/server/state");

let backupState = null;

function backup() {
  try { backupState = fs.readFileSync(STATE_PATH, "utf8"); } catch { backupState = null; }
}

function restore() {
  if (backupState !== null) fs.writeFileSync(STATE_PATH, backupState);
  else try { fs.unlinkSync(STATE_PATH); } catch {}
}

function mockReq(method, url, body) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
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

describe("state persistence", () => {
  beforeEach(() => backup());
  afterEach(() => restore());

  it("POST /save writes state to disk", (_, done) => {
    const payload = { test: "data", savedAt: Date.now() };
    const req = mockReq("POST", "/save", payload);
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      const written = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      assert.equal(written.test, "data");
      done();
    };
    handleState(req, res);
  });

  it("GET /state reads state from disk", (_, done) => {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ hello: "world" }));
    const req = mockReq("GET", "/state");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["Content-Type"], "application/json");
      const parsed = JSON.parse(res.body);
      assert.equal(parsed.hello, "world");
      done();
    };
    handleState(req, res);
  });

  it("returns 404 when no state.json exists", (_, done) => {
    try { fs.unlinkSync(STATE_PATH); } catch {}
    const req = mockReq("GET", "/state");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 404);
      done();
    };
    handleState(req, res);
  });

  it("handles corrupt/invalid JSON on POST /save", (_, done) => {
    const req = mockReq("POST", "/save", undefined);
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 400);
      done();
    };
    process.nextTick(() => {
      req.emit("data", "{corrupt json!!!");
      req.emit("end");
    });
    handleState(req, res);
  });
});
