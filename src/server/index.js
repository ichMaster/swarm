const http = require("http");
const loadEnv = require("./env");
const handleClaudeProxy = require("./claude-proxy");
const handleStatic = require("./static");

loadEnv();

const PORT = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  if (req.url === "/claude") {
    handleClaudeProxy(req, res);
    return;
  }

  handleStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = server;
