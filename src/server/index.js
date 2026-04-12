const http = require("http");
const { execFile } = require("child_process");
const loadEnv = require("./env");
const handleClaudeProxy = require("./claude-proxy");
const handleState = require("./state");
const handleStatic = require("./static");
const { rateLimit } = require("./rate-limiter");

loadEnv();

const PORT = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  if (req.url === "/claude") {
    if (!rateLimit(req, res)) return;
    handleClaudeProxy(req, res);
    return;
  }

  if (req.url.startsWith("/save") || req.url.startsWith("/state")) {
    handleState(req, res);
    return;
  }

  handleStatic(req, res);
});

function openBrowser(url) {
  const cmds = { darwin: "open", linux: "xdg-open", win32: "start" };
  const cmd = cmds[process.platform];
  if (!cmd) return;
  execFile(cmd, [url], err => {
    if (err) console.log(`Open browser manually: ${url}`);
  });
}

server.listen(PORT, () => {
  const actualPort = server.address().port;
  const url = `http://localhost:${actualPort}`;
  console.log(`Server running at ${url}`);
  if (String(PORT) !== "0") openBrowser(url);
});

module.exports = server;
