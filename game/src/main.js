// Turkey Run — bootstrap, fixed-step 60 Hz loop, state machine, camera,
// collisions, scoring, hit-stop, debug API.
import { CONFIG, stageForDistanceM, runSpeedForStage } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createTurkey, updateTurkey, turkeyBox } from './turkey.js';
import { createFarmer, updateFarmer, farmerStumble } from './farmer.js';
import { createWorld, updateWorld } from './world.js';
import { updateObstacles, obstacleBox, aabbHit } from './obstacles.js';
import { createFX, updateFX, addTrauma, spawnDust, spawnFeathers, spawnSparkle, shakeOffset } from './fx.js';
import { render } from './render.js';
import { drawHUD, drawTitle, drawPause, drawCaught, drawEscaped } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvas.w;
canvas.height = CONFIG.canvas.h;

const input = createInput(canvas);
const audio = createAudio();
input.onFirstGesture = () => audio.ensure();

const s = {
  mode: 'title', // title | playing | paused | caught | escaped
  time: 0,
  tick: 0,
  score: 0,
  speed: 0, // current run speed (px/s, with boost)
  boost: 0, // pie boost seconds remaining
  pieInvuln: 0,
  camX: 0,
  shake: { x: 0, y: 0 },
  hitStop: 0,
  alarmCooldown: 0,
  hissCooldown: 0,
  fps: 60,
  shotMode: false,
  turkey: createTurkey(),
  farmer: createFarmer(),
  world: createWorld(20261127),
  fx: createFX(),
};

function resetRun() {
  s.turkey = createTurkey();
  s.farmer = createFarmer();
  s.world = createWorld(20261127 + Math.floor(Math.random() * 100000));
  s.fx = createFX();
  s.score = 0;
  s.boost = 0;
  s.pieInvuln = 0;
  s.camX = 0;
  s.hitStop = 0;
  s.mode = 'playing';
}

function startGame() {
  audio.ensure();
  audio.gobble();
  resetRun();
}

function onHit() {
  const t = s.turkey;
  t.lives -= 1;
  addTrauma(s.fx, 0.6);
  spawnFeathers(s.fx, t.x, t.y - 40, 12);
  if (t.lives <= 0) {
    t.dead = true;
    s.hitStop = CONFIG.hitStopCaught;
    audio.caught();
    s.mode = 'caught';
    return;
  }
  // Knock forward: gap jumps to 320, farmer stumbles, turkey invulnerable.
  s.farmer.gap = CONFIG.farmer.knockGap;
  farmerStumble(s.farmer);
  t.invuln = CONFIG.farmer.invulnSecs;
  s.hitStop = CONFIG.hitStopHit;
  audio.stumble();
}

function collect(c) {
  const t = s.turkey;
  if (c.type === 'corn') {
    s.score += CONFIG.cornScore;
    audio.corn();
    spawnSparkle(s.fx, c.x, c.y, 6);
  } else if (c.type === 'feather') {
    if (t.lives < 3) t.lives += 1;
    s.score += 50;
    audio.feather();
    spawnFeathers(s.fx, c.x, c.y, 10);
  } else if (c.type === 'pie') {
    s.boost = CONFIG.pieBoostSecs;
    s.pieInvuln = CONFIG.pieBoostSecs;
    s.score += 25;
    audio.boost();
    spawnSparkle(s.fx, c.x, c.y, 12);
  }
  c.taken = true;
}

function step(dt) {
  s.tick += 1;
  input.tick = s.tick;
  s.time += dt;

  // Global keys.
  if (input.mutePressed) {
    audio.setMuted(!audio.muted);
  }
  if (input.restartPressed && s.mode !== 'title') {
    startGame();
    input.consumeEdges();
    return;
  }
  if (input.pausePressed && (s.mode === 'playing' || s.mode === 'paused')) {
    s.mode = s.mode === 'playing' ? 'paused' : 'playing';
  }

  if (s.mode === 'title') {
    if (input.jumpPressed) startGame();
    input.consumeEdges();
    return;
  }
  if (s.mode === 'paused') {
    input.consumeEdges();
    return;
  }
  if (s.mode === 'caught' || s.mode === 'escaped') {
    if (input.jumpPressed || input.restartPressed) startGame();
    input.consumeEdges();
    return;
  }

  // Hit-stop freezes the world briefly.
  if (s.hitStop > 0) {
    s.hitStop -= dt;
    input.consumeEdges();
    return;
  }

  // --- playing ---
  const stage = stageForDistanceM(s.turkey.x / CONFIG.pxPerM);
  const baseSpeed = runSpeedForStage(stage);
  if (s.boost > 0) s.boost -= dt;
  if (s.pieInvuln > 0) s.pieInvuln -= dt;
  const runSpeed = baseSpeed * (s.boost > 0 ? CONFIG.pieBoostMul : 1);
  s.speed = runSpeed;

  s.turkey.x += runSpeed * dt;
  s.score += Math.floor(runSpeed * dt / CONFIG.pxPerM); // +1 per metre travelled

  updateTurkey(s.turkey, input, dt, s.tick, {
    onJump: () => audio.jump(),
    onLand: () => {
      audio.thud();
      spawnDust(s.fx, s.turkey.x, CONFIG.groundY, 8);
    },
  });

  updateFarmer(s.farmer, runSpeed, dt, {
    onStumble: () => audio.stumble(),
  });

  updateWorld(s.world, s.turkey.x, dt);
  s.world.obstacles = updateObstacles(s.world.obstacles, dt, s.time);
  updateFX(s.fx, dt);

  // Farmer proximity alarm.
  if (s.farmer.gap < 150) {
    s.alarmCooldown -= dt;
    if (s.alarmCooldown <= 0) {
      audio.alarm();
      s.alarmCooldown = 1.0;
    }
  }

  // Oven hiss telegraph (edge: any fire jet entering telegraph).
  const anyTele = s.world.obstacles.some((o) => o.type === 'firejet' && o.telegraph);
  if (anyTele) {
    s.hissCooldown -= dt;
    if (s.hissCooldown <= 0) {
      audio.hiss();
      s.hissCooldown = 1.9;
    }
  }

  // Obstacle collisions.
  const tb = turkeyBox(s.turkey);
  const vulnerable = s.turkey.invuln <= 0 && s.pieInvuln <= 0;
  if (vulnerable) {
    for (const o of s.world.obstacles) {
      const ob = obstacleBox(o);
      if (ob && aabbHit(tb, ob)) {
        onHit();
        break;
      }
    }
  }

  // Farmer touch (gap <= 24) — same hit path.
  if (s.mode === 'playing' && vulnerable && s.farmer.gap <= CONFIG.farmer.touchGap) {
    onHit();
  }

  // Collectibles (generous pickup radius around the turkey centre).
  const cx = s.turkey.x;
  const cy = s.turkey.y - (s.turkey.sliding ? 20 : 40);
  for (const c of s.world.collectibles) {
    if (c.taken) continue;
    const dx = c.x - cx;
    const dy = c.y - cy;
    if (dx * dx + dy * dy < 48 * 48) collect(c);
  }

  // Forest gate: escaped!
  if (s.world.reachedGate && s.mode === 'playing') {
    s.mode = 'escaped';
    audio.win();
  }

  // Camera: exponential smoothing (rate 8), deadzone 40, look-ahead 120,
  // applied AFTER physics; shake added last at render time.
  const target = s.turkey.x - 400 + CONFIG.camera.lookAhead;
  const diff = target - s.camX;
  if (Math.abs(diff) > CONFIG.camera.deadzone) {
    const k = 1 - Math.exp(-CONFIG.camera.rate * dt);
    s.camX += diff * k;
  }
  if (s.camX < 0) s.camX = 0;
  const maxCam = Math.max(0, s.world.gateX - 400);
  if (s.camX > maxCam) s.camX = maxCam;

  s.shake = shakeOffset(s.fx);
  input.consumeEdges();
}

function drawFrame() {
  render(ctx, s);
  if (s.mode === 'title') drawTitle(ctx, s);
  else if (s.mode === 'paused') {
    drawHUD(ctx, s);
    drawPause(ctx);
  } else if (s.mode === 'caught') drawCaught(ctx, s);
  else if (s.mode === 'escaped') drawEscaped(ctx, s);
  else drawHUD(ctx, s);
}

// Read-only debug snapshot.
Object.defineProperty(window, '__turkeyrun', {
  value: {
    get snapshot() {
      return {
        score: s.score,
        distance: Math.floor(s.turkey.x / CONFIG.pxPerM),
        lives: s.turkey.lives,
        stage: s.world.stage,
        gap: Math.round(s.farmer.gap),
        farmerState: s.farmer.state,
        turkeyX: Math.round(s.turkey.x),
        turkeyY: Math.round(s.turkey.y),
        turkeyVy: Math.round(s.turkey.vy),
        fps: Math.round(s.fps),
        mode: s.mode,
      };
    },
  },
  writable: false,
});

// Shot mode: render exactly one static frame, no audio, no gameplay loop.
if (applyShot(s)) {
  s.shake = { x: 0, y: 0 };
  drawFrame();
} else {
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fpsTime = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    acc += elapsed;
    const dt = CONFIG.fixedDt;
    let steps = 0;
    while (acc >= dt && steps < CONFIG.maxSteps) {
      step(dt);
      acc -= dt;
      steps += 1;
    }
    if (steps === CONFIG.maxSteps) acc = 0;
    drawFrame();
    frames += 1;
    fpsTime += elapsed;
    if (fpsTime >= 1) {
      s.fps = frames / fpsTime;
      frames = 0;
      fpsTime = 0;
    }
  }
  requestAnimationFrame(frame);
}
