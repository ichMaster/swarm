#!/usr/bin/env node
// Minimal CORS proxy for Claude API.
// Run: ANTHROPIC_API_KEY=sk-ant-... node proxy.js
// Then open swarm-evolution.html in your browser.

const http = require("http");
const https = require("https");

const PORT = 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

if (!API_KEY) {
  console.error("ERROR: set ANTHROPIC_API_KEY environment variable");
  console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
  console.error("  node proxy.js");
  process.exit(1);
}

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer((req, res) => {
  setCORS(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/claude") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. POST /claude with { prompt }");
    return;
  }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(body); }
    catch { res.writeHead(400); res.end("invalid JSON"); return; }

    const prompt = parsed.prompt;
    if (!prompt) { res.writeHead(400); res.end("missing prompt"); return; }

    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const apiReq = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, apiRes => {
      let data = "";
      apiRes.on("data", chunk => data += chunk);
      apiRes.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: json.error.message || "api error" }));
            return;
          }
          const text = (json.content || [])
            .filter(b => b.type === "text")
            .map(b => b.text)
            .join("\n");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ text }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "parse error: " + e.message }));
        }
      });
    });

    apiReq.on("error", e => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });

    apiReq.write(payload);
    apiReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`Claude proxy running at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Open swarm-evolution.html in your browser.`);
});
