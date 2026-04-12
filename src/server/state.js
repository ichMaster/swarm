const fs = require("fs");
const path = require("path");

const STATE_PATH = path.resolve(process.cwd(), "state.json");

function readSlots(cb) {
  fs.readFile(STATE_PATH, "utf8", (err, raw) => {
    if (err) return cb(null, {});
    try { cb(null, JSON.parse(raw)); } catch { cb(null, {}); }
  });
}

function writeSlots(slots, cb) {
  fs.writeFile(STATE_PATH, JSON.stringify(slots, null, 2), cb);
}

function getTabId(reqUrl) {
  const u = new URL(reqUrl, "http://localhost");
  return u.searchParams.get("tab") || "default";
}

function handleState(req, res) {
  if (req.method === "GET" && req.url.startsWith("/state")) {
    const tab = getTabId(req.url);
    readSlots((err, slots) => {
      const data = slots[tab];
      if (!data) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/save")) {
    const tab = getTabId(req.url);
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("invalid JSON");
        return;
      }
      readSlots((err, slots) => {
        slots[tab] = parsed;
        writeSlots(slots, (writeErr) => {
          if (writeErr) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("write error");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        });
      });
    });
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method not allowed");
}

module.exports = handleState;
