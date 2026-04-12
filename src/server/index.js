const http = require("http");
const handleClaudeProxy = require("./claude-proxy");

const PORT = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  if (req.url === "/claude") {
    handleClaudeProxy(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = server;
