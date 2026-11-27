// Farmer FSM — distance-based, no raycast. States: CHASE / SURGE / LAG.
// gap = px behind the turkey (farmerX = turkeyX - gap). Never teleports.
import { CONFIG } from './config.js';

const F = CONFIG.farmer;

export function createFarmer() {
  return {
    gap: 320,
    state: 'CHASE',
    stateTime: 0, // seconds in current state
    surgeBelowTime: 0, // seconds gap has stayed < 150
    reaction: 0, // 0.3 s delay before a new state's behaviour applies
    pendingState: null,
    windup: 0,
    lunge: 0,
    stumble: 0,
    catchUp: false, // after LAG exit: run 1.15x until gap < catchUpExitGap
    hatFly: 0, // hat-fly animation timer
    hatX: 0,
    hatY: 0,
    hatVy: 0,
    runPhase: 0,
    telegraph: false, // "!" shown when gap < 150
    lookAround: 0,
  };
}

function requestState(f, next) {
  if (f.state === next || f.pendingState === next) return;
  if (f.stateTime < F.minStateSecs) return; // min 0.5 s per state
  f.pendingState = next;
  f.reaction = F.reactionSecs;
}

function applyState(f, next) {
  const prev = f.state;
  f.state = next;
  f.stateTime = 0;
  f.pendingState = null;
  if (next === 'SURGE') {
    f.windup = F.windupSecs;
    f.lunge = 0;
    f.catchUp = false;
  }
  // Leaving LAG for CHASE arms the catch-up run (1.15x until gap < 250).
  if (next === 'CHASE' && prev === 'LAG') f.catchUp = true;
  if (next === 'LAG') f.lookAround = 0;
}

export function farmerStumble(f) {
  f.stumble = F.stumbleSecs;
  f.hatFly = 0.9;
  f.hatX = 0;
  f.hatY = -70;
  f.hatVy = -260;
  f.state = 'CHASE';
  f.stateTime = 0;
  f.pendingState = null;
  f.catchUp = false;
}

// turkeySpeed = the turkey's ACTUAL speed this tick (slowed after an
// obstacle hit); baseSpeed = the farmer's own pace (stage speed x boost).
// The farmer never slows with the turkey — that is what closes the gap.
export function updateFarmer(f, turkeySpeed, baseSpeed, dt, events) {
  f.stateTime += dt;
  f.runPhase += dt * 12;

  // Reaction delay: pending state applies only after 0.3 s.
  if (f.pendingState) {
    f.reaction -= dt;
    if (f.reaction <= 0) applyState(f, f.pendingState);
  }

  // Entry conditions (different enter/exit thresholds = anti-flicker).
  if (f.stumble <= 0) {
    if (f.gap < F.surgeEnterGap) {
      f.surgeBelowTime += dt;
    } else {
      f.surgeBelowTime = 0;
    }
    if (f.state === 'CHASE' && f.surgeBelowTime >= F.surgeHoldSecs) {
      requestState(f, 'SURGE');
    }
    // No LAG re-entry while catching up after a LAG exit.
    if (f.state !== 'LAG' && f.gap > F.lagEnterGap && !f.catchUp) requestState(f, 'LAG');
    // LAG exits by gap OR by timer (max 2.5 s) — the timer is the escape
    // from the old permanent trap (gap only grew inside LAG).
    if (f.state === 'LAG' && (f.gap < F.lagExitGap || f.stateTime >= F.lagMaxSecs)) {
      requestState(f, 'CHASE');
    }
  }

  f.telegraph = f.gap < 150;

  // Behaviour per state (speeds are the farmer's own world speed).
  let speed = baseSpeed;
  if (f.stumble > 0) {
    f.stumble -= dt;
    speed = 0;
    if (f.stumble <= 0 && events && events.onStumbleEnd) events.onStumbleEnd();
  } else if (f.state === 'SURGE') {
    if (f.windup > 0) {
      f.windup -= dt;
      speed = 0; // crouched windup, visible
      if (f.windup <= 0) f.lunge = F.lungeSecs;
    } else if (f.lunge > 0) {
      f.lunge -= dt;
      speed = baseSpeed + F.lungeBonus;
      if (f.lunge <= 0) {
        // Lunge missed: stumble.
        f.stumble = F.stumbleSecs;
        f.hatFly = 0.9;
        f.hatX = 0;
        f.hatY = -70;
        f.hatVy = -260;
        if (events && events.onStumble) events.onStumble();
      }
    } else {
      requestState(f, 'CHASE');
      speed = baseSpeed;
    }
  } else if (f.state === 'LAG') {
    speed = baseSpeed * F.lagSpeedMul;
    f.lookAround += dt;
  } else {
    // CHASE: after a LAG exit, run 1.15x until the gap is back under 250.
    if (f.catchUp) {
      speed = baseSpeed * F.catchUpMul;
      if (f.gap < F.catchUpExitGap) f.catchUp = false;
    } else {
      // speed = baseSpeed + clamp((gap-185)*0.9, -40, 90).
      const adj = Math.max(F.chaseClamp.min, Math.min(F.chaseClamp.max, (f.gap - F.chaseTargetGap) * F.chaseGain));
      speed = baseSpeed + adj;
    }
  }

  // Gap dynamics: gap shrinks when the farmer is faster than the turkey.
  f.gap += (turkeySpeed - speed) * dt;
  if (f.gap < 0) f.gap = 0;
  if (f.gap > 900) f.gap = 900;

  // Hat-fly physics.
  if (f.hatFly > 0) {
    f.hatFly -= dt;
    f.hatVy += 900 * dt;
    f.hatX += 60 * dt;
    f.hatY += f.hatVy * dt;
    if (f.hatY > -30) {
      f.hatY = -30;
      f.hatVy = 0;
    }
  }
}

export function drawFarmer(ctx, f, screenX, time) {
  const feetY = 600;
  const crouch = f.state === 'SURGE' && f.windup > 0 ? 0.78 : 1;
  const stumbleWob = f.stumble > 0 ? Math.sin(time * 30) * 4 : 0;

  ctx.save();
  ctx.translate(screenX + stumbleWob, feetY);
  ctx.scale(1, crouch);

  // Legs (overalls, running).
  const swing = f.stumble > 0 ? 2 : Math.sin(f.runPhase) * 9;
  ctx.strokeStyle = '#2c4a7a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, -34);
  ctx.lineTo(-6 + swing, 0);
  ctx.moveTo(6, -34);
  ctx.lineTo(6 - swing, 0);
  ctx.stroke();

  // Body: red shirt.
  ctx.fillStyle = '#a83226';
  ctx.beginPath();
  ctx.ellipse(0, -52, 22, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Overalls straps.
  ctx.strokeStyle = '#2c4a7a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, -72);
  ctx.lineTo(-10, -40);
  ctx.moveTo(10, -72);
  ctx.lineTo(10, -40);
  ctx.stroke();

  // Arms pumping.
  ctx.strokeStyle = '#a83226';
  ctx.lineWidth = 6;
  const armSwing = Math.sin(f.runPhase) * 10;
  ctx.beginPath();
  ctx.moveTo(-18, -64);
  ctx.lineTo(-30, -44 + armSwing);
  ctx.moveTo(18, -64);
  ctx.lineTo(30, -44 - armSwing);
  ctx.stroke();

  // Head.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(0, -86, 14, 0, Math.PI * 2);
  ctx.fill();
  // Angry moustache.
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.ellipse(-5, -80, 6, 3, -0.3, 0, Math.PI * 2);
  ctx.ellipse(5, -80, 6, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Angry eyes.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-5, -90, 2, 0, Math.PI * 2);
  ctx.arc(5, -90, 2, 0, Math.PI * 2);
  ctx.fill();

  // Tall hat — unless it flew off during stumble.
  if (f.hatFly <= 0) {
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(-11, -112, 22, 16);
    ctx.fillRect(-16, -98, 32, 5);
  }
  ctx.restore();

  // Flying hat (separate, arcs through the air).
  if (f.hatFly > 0) {
    ctx.save();
    ctx.translate(screenX + f.hatX, feetY + f.hatY);
    ctx.rotate(f.hatFly * 6);
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillRect(-16, 6, 32, 5);
    ctx.restore();
  }

  // Telegraph "!" when close.
  if (f.telegraph && f.stumble <= 0) {
    const bob = Math.sin(time * 8) * 3;
    ctx.save();
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd00';
    ctx.strokeStyle = '#7a1f00';
    ctx.lineWidth = 5;
    ctx.strokeText('!', screenX, feetY - 128 + bob);
    ctx.fillText('!', screenX, feetY - 128 + bob);
    ctx.restore();
  }
}
