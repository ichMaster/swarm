const fs = require("fs");
const path = require("path");

const STATE_PATH = path.resolve(process.cwd(), "state.json");

function handleState(req, res) {
  if (req.method === "GET" && req.url === "/state") {
    fs.readFile(STATE_PATH, "utf8", (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    });
    return;
  }

  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        JSON.parse(body); // validate
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("invalid JSON");
        return;
      }
      fs.writeFile(STATE_PATH, body, err => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("write error");
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method not allowed");
}

module.exports = handleState;
