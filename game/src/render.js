// Render loop canvas: parallax background, ground, world objects, turkey,
// farmer, particles, stage-3 night vignette.
import { CONFIG } from './config.js';
import { drawBackground, drawGround, drawGate } from './world.js';
import { drawObstacles } from './obstacles.js';
import { drawTurkey } from './turkey.js';
import { drawFarmer } from './farmer.js';
import { drawParticles } from './fx.js';

export function render(ctx, s) {
  const W = CONFIG.canvas.w;
  const H = CONFIG.canvas.h;
  ctx.clearRect(0, 0, W, H);

  const camX = s.camX + s.shake.x;
  const camY = s.shake.y;

  ctx.save();
  ctx.translate(0, camY);

  drawBackground(ctx, camX, s.world.stage, s.time);
  drawGround(ctx, camX, s.world.stage);
  drawGate(ctx, camX, s.world.gateX, s.mode === 'escaped');

  // Collectibles.
  for (const c of s.world.collectibles) {
    if (c.taken) continue;
    const sx = c.x - camX;
    if (sx < -60 || sx > W + 60) continue;
    const bob = Math.sin(s.time * 3 + c.x * 0.01) * 4;
    ctx.save();
    if (c.type === 'corn') {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.ellipse(sx, c.y + bob, 10, 14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0a83c';
      ctx.beginPath();
      ctx.ellipse(sx - 3, c.y + bob, 4, 9, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.type === 'feather') {
      ctx.translate(sx, c.y + bob);
      ctx.rotate(Math.sin(s.time * 2) * 0.3);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b9822a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 18);
      ctx.stroke();
    } else if (c.type === 'pie') {
      ctx.fillStyle = '#c96f3b';
      ctx.beginPath();
      ctx.moveTo(sx - 16, c.y + bob + 10);
      ctx.lineTo(sx + 16, c.y + bob + 10);
      ctx.lineTo(sx, c.y + bob - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7ead1';
      ctx.beginPath();
      ctx.arc(sx, c.y + bob - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawObstacles(ctx, s.world.obstacles, camX);
  drawParticles(ctx, s.fx, camX);

  // Farmer (behind turkey, at the left edge when the gap is small).
  const farmerScreenX = s.turkey.x - s.farmer.gap - camX;
  drawFarmer(ctx, s.farmer, farmerScreenX, s.time);

  // Turkey.
  const turkeyScreenX = s.turkey.x - camX;
  drawTurkey(ctx, s.turkey, turkeyScreenX, s.time);

  ctx.restore();

  // Night vignette for stage 3 (KITCHEN).
  if (s.world.stage === 2) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,6,20,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    // Warm kitchen glow around the turkey.
    const glow = ctx.createRadialGradient(turkeyScreenX, s.turkey.y - 40, 20, turkeyScreenX, s.turkey.y - 40, 260);
    glow.addColorStop(0, 'rgba(255,170,60,0.18)');
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
}
