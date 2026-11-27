// Particle system (feathers, dust, corn sparkle, hat-fly) + trauma shake.
// Shake offsets ONLY the camera, never world/physics.
import { CONFIG } from './config.js';

export function createFX() {
  return {
    particles: [],
    trauma: 0,
  };
}

export function addTrauma(fx, amount) {
  fx.trauma = Math.min(1, fx.trauma + amount);
}

export function spawnDust(fx, x, y, n) {
  for (let i = 0; i < (n || 8); i++) {
    fx.particles.push({
      kind: 'dust', x: x + (Math.random() - 0.5) * 40, y: y - Math.random() * 6,
      vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60,
      life: 0.5, maxLife: 0.5, size: 4 + Math.random() * 5,
    });
  }
}

export function spawnFeathers(fx, x, y, n) {
  for (let i = 0; i < (n || 10); i++) {
    fx.particles.push({
      kind: 'feather', x, y,
      vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120,
      life: 0.9, maxLife: 0.9, size: 5 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 10,
    });
  }
}

export function spawnSparkle(fx, x, y, n) {
  for (let i = 0; i < (n || 8); i++) {
    fx.particles.push({
      kind: 'spark', x, y,
      vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
      life: 0.4, maxLife: 0.4, size: 3 + Math.random() * 3,
    });
  }
}

export function updateFX(fx, dt) {
  if (fx.trauma > 0) {
    fx.trauma -= CONFIG.traumaDecay * dt;
    if (fx.trauma < 0) fx.trauma = 0;
  }
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'feather') {
      p.vy += 160 * dt; // light fall
      p.vx *= 0.98;
      p.rot += p.vr * dt;
    } else {
      p.vy += 200 * dt;
    }
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
}

export function shakeOffset(fx) {
  if (fx.trauma <= 0) return { x: 0, y: 0 };
  const m = fx.trauma * fx.trauma * CONFIG.traumaMaxOffset;
  return {
    x: (Math.random() * 2 - 1) * m,
    y: (Math.random() * 2 - 1) * m,
  };
}

export function drawParticles(ctx, fx, camX) {
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    const sx = p.x - camX;
    ctx.save();
    ctx.globalAlpha = a;
    if (p.kind === 'dust') {
      ctx.fillStyle = '#cbb28a';
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'feather') {
      ctx.translate(sx, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = '#f7ead1';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
