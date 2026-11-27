// Turkey: physics, state, squash & stretch, code-drawn art.
import { CONFIG } from './config.js';

const C = CONFIG;

export function createTurkey() {
  return {
    x: C.turkey.startX, // world x (px)
    y: C.groundY, // feet y in world coords (ground line)
    vy: 0,
    grounded: true,
    sliding: false,
    flapping: false,
    wingPhase: 0,
    runPhase: 0,
    lives: C.turkey.lives,
    invuln: 0, // seconds remaining
    coyoteTick: -1000000,
    jumpCutUsed: false,
    squash: 1, // 1 = rest; <1 squashed, >1 stretched
    squashVel: 0,
    facing: 1,
    dead: false,
  };
}

// Current hitbox in world coords (slide halves height).
export function turkeyBox(t) {
  const h = t.sliding ? C.turkey.slideH : C.turkey.h;
  return {
    x: t.x - C.turkey.w / 2,
    y: t.y - h,
    w: C.turkey.w,
    h,
  };
}

export function updateTurkey(t, input, dt, tick, events) {
  // events: { onJump, onLand } callbacks supplied by main.js.
  if (t.dead) return;

  const wasGrounded = t.grounded;

  // Sliding: held ArrowDown/S while grounded.
  t.sliding = input.slideHeld && t.grounded;

  // Coyote stamp when leaving ground.
  if (t.grounded) t.coyoteTick = tick;

  // Jump: buffered press + (grounded or coyote) and not sliding.
  const buffered = input.tick - input.bufferTick <= C.bufferTicks;
  const coyoteOk = tick - t.coyoteTick <= C.coyoteTicks;
  if (buffered && (t.grounded || coyoteOk) && !t.sliding) {
    t.vy = C.jumpVel;
    t.grounded = false;
    t.jumpCutUsed = false;
    t.sliding = false;
    input.bufferTick = -1000000; // consume buffer
    t.squash = 1.25; // stretch on takeoff
    if (events && events.onJump) events.onJump();
  }

  // Variable jump: release while rising cuts vy once.
  if (input.jumpReleased && !t.grounded && t.vy < 0 && !t.jumpCutUsed) {
    t.vy *= C.jumpCutMul;
    t.jumpCutUsed = true;
  }

  // Gravity: up vs down (1.8x), apex hang while jump held and |vy| small.
  let g = t.vy < 0 ? C.gravUp : C.gravUp * C.gravDownMul;
  if (input.jumpHeld && Math.abs(t.vy) < C.apexHangVy) g *= C.apexHangMul;
  t.vy += g * dt;

  // Panic flap: jump held while falling caps descent at 130 px/s.
  t.flapping = false;
  if (!t.grounded && input.jumpHeld && t.vy > 0) {
    if (t.vy > C.flapMaxFall) t.vy = C.flapMaxFall;
    t.flapping = true;
  }

  if (t.vy > C.terminalFall) t.vy = C.terminalFall;

  t.y += t.vy * dt;

  // Land.
  if (t.y >= C.groundY) {
    t.y = C.groundY;
    if (!wasGrounded && t.vy > 200) {
      t.squash = 0.72; // squash on landing
      if (events && events.onLand) events.onLand();
    }
    t.vy = 0;
    t.grounded = true;
  }

  // Squash & stretch spring back to rest (overshoot then snap).
  const k = 180;
  const damp = 14;
  t.squashVel += (-(t.squash - 1) * k - t.squashVel * damp) * dt;
  t.squash += t.squashVel * dt;
  if (Math.abs(t.squash - 1) < 0.005 && Math.abs(t.squashVel) < 0.05) {
    t.squash = 1;
    t.squashVel = 0;
  }

  // Timers / animation phases.
  if (t.invuln > 0) t.invuln -= dt;
  t.runPhase += dt * 14;
  t.wingPhase += dt * (t.flapping ? 26 : 10);
}

export function drawTurkey(ctx, t, screenX, time) {
  const blink = t.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;

  const wob = Math.sin(t.runPhase) * (t.grounded ? 2.5 : 0);
  const sq = t.squash;
  const sx = screenX;
  const feetY = t.y;

  ctx.save();
  ctx.translate(sx, feetY + wob * 0.3);
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Slide pose (P1 fix): the old code drew the upright turkey even while
  // sliding, so the player had no visual feedback for a core mechanic.
  // Flattened low duck that fits inside the slide hitbox (38 px tall).
  if (t.sliding) {
    // Tail flattened back.
    ctx.fillStyle = '#8a4b1f';
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.rotate((i * 0.3) - Math.PI / 2 + 0.5);
      ctx.beginPath();
      ctx.ellipse(-18, -14, 8, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body: wide flat ellipse.
    ctx.fillStyle = '#7a4a21';
    ctx.beginPath();
    ctx.ellipse(4, -16, 42, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly cream.
    ctx.fillStyle = '#f7ead1';
    ctx.beginPath();
    ctx.ellipse(6, -13, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing flat along the body.
    ctx.fillStyle = '#5d3413';
    ctx.beginPath();
    ctx.ellipse(-4, -18, 20, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Head low, forward.
    ctx.fillStyle = '#7a4a21';
    ctx.beginPath();
    ctx.arc(38, -22, 10, 0, Math.PI * 2);
    ctx.fill();
    // Beak (orange).
    ctx.fillStyle = '#e8710a';
    ctx.beginPath();
    ctx.moveTo(46, -24);
    ctx.lineTo(58, -20);
    ctx.lineTo(46, -16);
    ctx.closePath();
    ctx.fill();
    // Wattle (red).
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(44, -13, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(41, -25, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(42, -25, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs tucked (short stubs).
    ctx.strokeStyle = '#e8710a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-2, 0);
    ctx.moveTo(10, -4);
    ctx.lineTo(16, 0);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  // Fanned tail (behind body).
  ctx.fillStyle = '#8a4b1f';
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.rotate((i * 0.42) - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -34, 9, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i % 2 === 0 ? '#c97a2e' : '#8a4b1f';
    ctx.beginPath();
    ctx.ellipse(0, -52, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a4b1f';
    ctx.restore();
  }

  // Body: big round brown.
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.ellipse(0, -34, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly cream.
  ctx.fillStyle = '#f7ead1';
  ctx.beginPath();
  ctx.ellipse(2, -26, 18, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing: small, flaps (bigger swing when panic flapping).
  const flapAmp = t.flapping ? 1.1 : 0.35;
  const wingA = Math.sin(t.wingPhase) * flapAmp;
  ctx.save();
  ctx.translate(-6, -38);
  ctx.rotate(-0.5 + wingA);
  ctx.fillStyle = '#5d3413';
  ctx.beginPath();
  ctx.ellipse(-14, 0, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head.
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.arc(16, -66, 15, 0, Math.PI * 2);
  ctx.fill();
  // Beak (orange).
  ctx.fillStyle = '#e8710a';
  ctx.beginPath();
  ctx.moveTo(28, -68);
  ctx.lineTo(42, -63);
  ctx.lineTo(28, -58);
  ctx.closePath();
  ctx.fill();
  // Wattle (red).
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.ellipse(30, -54, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(20, -70, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(21, -70, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Legs (running scissor when grounded).
  ctx.strokeStyle = '#e8710a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const legSwing = t.grounded ? Math.sin(t.runPhase) * 10 : 6;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-6 + legSwing, 0);
  ctx.moveTo(8, -6);
  ctx.lineTo(8 - legSwing, 0);
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}
