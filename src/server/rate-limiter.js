const MAX_TOKENS = 10;
const REFILL_RATE = MAX_TOKENS / 60; // tokens per second
const CLEANUP_INTERVAL = 30000;

const buckets = new Map();

function getClientIp(req) {
  return req.socket.remoteAddress || "unknown";
}

function getBucket(ip) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(ip, bucket);
    return bucket;
  }
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE);
  bucket.lastRefill = now;
  return bucket;
}

function rateLimit(req, res) {
  const ip = getClientIp(req);
  const bucket = getBucket(ip);
  if (bucket.tokens < 1) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Rate limit exceeded. Max 10 requests per minute." }));
    return false;
  }
  bucket.tokens -= 1;
  return true;
}

// Cleanup stale entries every 30s
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(ip);
  }
}, CLEANUP_INTERVAL);
cleanupTimer.unref();

module.exports = { rateLimit, getBucket, buckets, MAX_TOKENS };
