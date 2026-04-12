import { W, H, genomeColor } from "./simulation.js";

function draw(ctx, state) {
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#131a2e"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  for (const f of state.food) {
    ctx.fillStyle = "#4ade80";
    ctx.beginPath(); ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of state.boids) {
    const size = 3 + b.genome.size * 3;
    ctx.fillStyle = genomeColor(b.genome);
    const angle = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size * 1.5, 0);
    ctx.lineTo(-size, size * 0.7);
    ctx.lineTo(-size * 0.5, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const p of state.predators) {
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function renderSparkline(svgEl, data, color, max) {
  if (!data || data.length < 2) { svgEl.innerHTML = ""; return; }
  const m = max !== undefined ? max : Math.max(...data, 0.01);
  const w = 140, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / m) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  svgEl.innerHTML = `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" />`;
}

export { draw, renderSparkline };
