const https = require("https");

const API_KEY = () => process.env.ANTHROPIC_API_KEY;
const MODEL = () => process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

function handleClaudeProxy(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
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

    const apiKey = API_KEY();
    if (!apiKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }));
      return;
    }

    const payload = JSON.stringify({
      model: MODEL(),
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const apiReq = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
}

module.exports = handleClaudeProxy;
