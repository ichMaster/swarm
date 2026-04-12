const fs = require("fs");
const path = require("path");

const CLIENT_ROOT = path.resolve(__dirname, "..", "client");

const MIME_TYPES = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".ico":  "image/x-icon",
};

function handleStatic(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
    return;
  }

  const urlPath = req.url.split("?")[0];
  const relPath = urlPath === "/" ? "/index.html" : urlPath;

  // Block directory traversal
  const resolved = path.resolve(CLIENT_ROOT, "." + relPath);
  if (!resolved.startsWith(CLIENT_ROOT + path.sep) && resolved !== CLIENT_ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(resolved);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

module.exports = handleStatic;
