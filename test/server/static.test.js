const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const handleStatic = require("../../src/server/static");

function mockReq(url, method = "GET") {
  return { url, method };
}

function mockRes() {
  const r = { statusCode: null, headers: {}, body: null };
  r.writeHead = (code, hdrs) => { r.statusCode = code; Object.assign(r.headers, hdrs || {}); };
  r.end = (data) => { r.body = data; };
  return r;
}

describe("static file server", () => {
  it("serves index.html for GET /", (_, done) => {
    const req = mockReq("/");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["Content-Type"], "text/html");
      assert.ok(data.toString().includes("<!DOCTYPE html"));
      done();
    };
    handleStatic(req, res);
  });

  it("serves .js with application/javascript", (_, done) => {
    const req = mockReq("/js/main.js");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["Content-Type"], "application/javascript");
      done();
    };
    handleStatic(req, res);
  });

  it("serves .css with text/css", (_, done) => {
    const req = mockReq("/css/style.css");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["Content-Type"], "text/css");
      done();
    };
    handleStatic(req, res);
  });

  it("returns 404 for missing file", (_, done) => {
    const req = mockReq("/nonexistent.xyz");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 404);
      done();
    };
    handleStatic(req, res);
  });

  it("blocks directory traversal with 403", () => {
    // Simulate raw path with ../ (not resolved by HTTP client)
    const req = mockReq("/../../../etc/passwd");
    const res = mockRes();
    handleStatic(req, res);
    assert.ok(res.statusCode === 403 || res.statusCode === 404);
  });

  it("returns GET / as index.html", (_, done) => {
    const req = mockReq("/");
    const res = mockRes();
    const origEnd = res.end;
    res.end = (data) => {
      origEnd(data);
      assert.equal(res.statusCode, 200);
      assert.ok(data.toString().includes("<html"));
      done();
    };
    handleStatic(req, res);
  });
});
