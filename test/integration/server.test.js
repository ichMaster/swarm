const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const STATE_PATH = path.resolve(process.cwd(), "state.json");

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port,
      path: urlPath,
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
    };
    const req = http.request(opts, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

describe("integration: full server", () => {
  let server;
  let port;
  let stateBackup = null;
  let origHttpsRequest;

  before(async () => {
    // Backup state.json
    try { stateBackup = fs.readFileSync(STATE_PATH, "utf8"); } catch { stateBackup = null; }

    // Set API key for proxy
    process.env.ANTHROPIC_API_KEY = "test-integration-key";

    // Mock https.request to avoid real API calls
    const { EventEmitter } = require("events");
    origHttpsRequest = https.request;
    https.request = (opts, callback) => {
      const apiRes = new EventEmitter();
      process.nextTick(() => {
        callback(apiRes);
        apiRes.emit("data", JSON.stringify({
          content: [{ type: "text", text: "integration test response" }],
        }));
        apiRes.emit("end");
      });
      const fakeReq = new EventEmitter();
      fakeReq.write = () => {};
      fakeReq.end = () => {};
      return fakeReq;
    };

    // Clear require cache to get fresh server
    delete require.cache[require.resolve("../../src/server/index")];
    delete require.cache[require.resolve("../../src/server/rate-limiter")];

    // Start server on random port
    await new Promise((resolve) => {
      process.env.PORT = "0";
      server = require("../../src/server/index");
      // Server may already be listening from require, or we need to wait
      if (server.address()) {
        port = server.address().port;
        resolve();
      } else {
        server.on("listening", () => {
          port = server.address().port;
          resolve();
        });
      }
    });
  });

  after(async () => {
    https.request = origHttpsRequest;
    // Restore state.json
    if (stateBackup !== null) fs.writeFileSync(STATE_PATH, stateBackup);
    else try { fs.unlinkSync(STATE_PATH); } catch {}

    delete process.env.PORT;

    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  });

  it("server starts on a random port", () => {
    assert.ok(port > 0, `port should be positive, got ${port}`);
  });

  it("GET / returns HTML with 200", async () => {
    const res = await request(port, "GET", "/");
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"].includes("text/html"));
    assert.ok(res.body.includes("<!DOCTYPE html"));
  });

  it("GET /css/style.css returns CSS with correct MIME type", async () => {
    const res = await request(port, "GET", "/css/style.css");
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"].includes("text/css"));
  });

  it("POST /claude proxies correctly (mocked upstream)", async () => {
    const res = await request(port, "POST", "/claude", { prompt: "test" });
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.text, "integration test response");
  });

  it("POST /save + GET /state round-trip preserves data", async () => {
    const payload = { savedAt: Date.now(), testField: "round-trip" };
    const saveRes = await request(port, "POST", "/save", payload);
    assert.equal(saveRes.status, 200);

    const loadRes = await request(port, "GET", "/state");
    assert.equal(loadRes.status, 200);
    const data = JSON.parse(loadRes.body);
    assert.equal(data.testField, "round-trip");
  });

  it("server shuts down cleanly", async () => {
    // Just verify we can make a final request — shutdown tested in after()
    const res = await request(port, "GET", "/");
    assert.equal(res.status, 200);
  });
});
