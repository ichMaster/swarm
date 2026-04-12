const http = require("http");
const handleClaudeProxy = require("./claude-proxy");
const handleStatic = require("./static");

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
