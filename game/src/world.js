// World: stages, obstacle/collectible spawner with per-stage minimum spacing,
// parallax background data, stage transitions, forest gate at 1400 m.
import { CONFIG, stageForDistanceM, minGapForStage } from './config.js';
import { makeObstacle } from './obstacles.js';
import { RNG } from './random.js';

const GROUND = CONFIG.groundY;
const GATE_X = CONFIG.gateM * CONFIG.pxPerM; // 56000 px

// Hazard pools per stage (new types appear alone first, with a wide gap).
const POOLS = {
  0: ['fence', 'hay', 'pumpkin'],
  1: ['fence', 'hay', 'pumpkin', 'knifeSwing', 'beam', 'crates'],
  2: ['fence', 'hay', 'pumpkin', 'knifeSwing', 'beam', 'crates', 'firejet', 'knifeFall', 'pot'],
};

export function createWorld(seed) {
  const rng = new RNG(seed || 12345);
  return {
    rng,
    seed: seed || 12345,
    obstacles: [],
    collectibles: [],
    nextSpawnX: 900, // first obstacle well ahead of the start
    lastType: null,
    introGiven: {}, // stage -> whether its new-type intro has been placed
    stage: 0,
    gateX: GATE_X,
    reachedGate: false,
    // Parallax scenery seeds (deterministic per seed).
    hills: Array.from({ length: 24 }, (_, i) => ({ x: i * 620 + rng.range(0, 200), h: rng.range(90, 220), w: rng.range(300, 520) })),
    trees: Array.from({ length: 60 }, (_, i) => ({ x: i * 260 + rng.range(0, 120), h: rng.range(70, 150), kind: rng.int(0, 2) })),
  };
}

function introTypeForStage(stage) {
  if (stage === 1) return 'knifeSwing';
  if (stage === 2) return 'firejet';
  return null;
}

function spawnPattern(world, x, stage) {
  const rng = world.rng;
  const minGap = minGapForStage(stage);
  const pool = POOLS[stage];
  let type = rng.pick(pool);

  // First appearance of a new stage's hazard: alone, extra-wide gap after it.
  const intro = introTypeForStage(stage);
  if (intro && !world.introGiven[stage]) {
    type = intro;
    world.introGiven[stage] = true;
  }

  const ob = makeObstacle(type, x, { phase: rng.range(0, Math.PI * 2), cycle: rng.range(0, 2) });
  world.obstacles.push(ob);
  let nextX = x + Math.max(minGap, ob.w + rng.range(60, 260));

  // Corn line or arc after some obstacles (collectible, never inside an obstacle).
  if (rng.chance(0.55)) {
    const arc = rng.chance(0.4);
    const cy = arc ? GROUND - 190 : GROUND - 60;
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const cx = x + ob.w + 40 + i * 44;
      const cyy = arc ? cy + Math.sin((i / (n - 1)) * Math.PI) * -40 + 40 : cy;
      world.collectibles.push({ type: 'corn', x: cx, y: cyy, taken: false });
    }
    nextX = Math.max(nextX, x + ob.w + 40 + n * 44 + 120);
  }

  // Golden feather / pie: once per stage, placed on a jump arc (risky spot).
  if (stage === 0 && !world.feather0 && x > 12000) {
    world.feather0 = true;
    world.collectibles.push({ type: 'feather', x: x + ob.w + 120, y: GROUND - 200, taken: false });
  }
  if (stage === 1 && !world.feather1 && x > 32000) {
    world.feather1 = true;
    world.collectibles.push({ type: 'pie', x: x + ob.w + 120, y: GROUND - 200, taken: false });
  }
  if (stage === 2 && !world.feather2 && x > 48000) {
    world.feather2 = true;
    world.collectibles.push({ type: 'feather', x: x + ob.w + 120, y: GROUND - 200, taken: false });
  }

  world.lastType = type;
  return nextX;
}

export function updateWorld(world, turkeyX, dt) {
  const distM = turkeyX / CONFIG.pxPerM;
  const stage = stageForDistanceM(distM);
  const stageChanged = stage !== world.stage;
  world.stage = stage;

  // Spawn ahead of the turkey until past the gate.
  const horizon = turkeyX + 1400;
  while (world.nextSpawnX < horizon && world.nextSpawnX < GATE_X - 300) {
    const s = stageForDistanceM(world.nextSpawnX / CONFIG.pxPerM);
    world.nextSpawnX = spawnPattern(world, world.nextSpawnX, s);
  }

  // Cull far-behind objects.
  const cullX = turkeyX - 800;
  world.obstacles = world.obstacles.filter((o) => o.x + o.w > cullX);
  world.collectibles = world.collectibles.filter((c) => c.x > cullX && !c.taken);

  if (turkeyX >= GATE_X) world.reachedGate = true;
  return { stageChanged, stage };
}

export function drawBackground(ctx, camX, stage, time) {
  const W = CONFIG.canvas.w;
  const H = CONFIG.canvas.h;
  const skies = [CONFIG.palette.skyDay, CONFIG.palette.skyDusk, CONFIG.palette.skyNight];
  const sky = skies[stage];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, sky[0]);
  grad.addColorStop(1, sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Sun / moon.
  if (stage === 0) {
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(1050, 110, 52, 0, Math.PI * 2);
    ctx.fill();
  } else if (stage === 1) {
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(1050, 150, 46, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#f7ead1';
    ctx.beginPath();
    ctx.arc(1050, 100, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sky[0];
    ctx.beginPath();
    ctx.arc(1064, 92, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // Far hills (parallax 0.25).
  ctx.fillStyle = stage === 2 ? '#241d33' : stage === 1 ? '#7a4a5e' : '#7fae62';
  const hills = [
    [0, 130], [420, 190], [900, 150], [1400, 210],
  ];
  for (const [hx, hh] of hills) {
    const x = ((hx - camX * 0.25) % 1600 + 1600) % 1600 - 200;
    ctx.beginPath();
    ctx.ellipse(x, GROUND, 320, hh, 0, Math.PI, 0);
    ctx.fill();
  }

  // Tree / barn / kitchen silhouettes (parallax 0.5).
  for (let i = 0; i < 10; i++) {
    const baseX = i * 340;
    const x = ((baseX - camX * 0.5) % 3400 + 3400) % 3400 - 200;
    if (stage === 2) {
      // Kitchen silhouette: pots and shelves.
      ctx.fillStyle = '#2a2138';
      ctx.fillRect(x, GROUND - 120, 90, 120);
      ctx.fillRect(x + 110, GROUND - 80, 60, 80);
    } else if (stage === 1) {
      // Barn silhouette.
      ctx.fillStyle = '#5d2a22';
      ctx.fillRect(x, GROUND - 130, 130, 130);
      ctx.beginPath();
      ctx.moveTo(x - 8, GROUND - 130);
      ctx.lineTo(x + 65, GROUND - 180);
      ctx.lineTo(x + 138, GROUND - 130);
      ctx.closePath();
      ctx.fill();
    } else {
      // Tree.
      ctx.fillStyle = '#3c5a2e';
      ctx.beginPath();
      ctx.arc(x + 30, GROUND - 120, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a2c17';
      ctx.fillRect(x + 22, GROUND - 90, 16, 90);
    }
  }
}

export function drawGround(ctx, camX, stage) {
  const W = CONFIG.canvas.w;
  const grounds = [CONFIG.palette.groundDay, CONFIG.palette.groundDusk, CONFIG.palette.groundNight];
  ctx.fillStyle = grounds[stage];
  ctx.fillRect(0, GROUND, W, CONFIG.canvas.h - GROUND);
  // Dirt texture dashes scrolling with the world.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const off = -(camX % 90);
  for (let x = off; x < W; x += 90) {
    ctx.fillRect(x, GROUND + 26, 44, 6);
    ctx.fillRect(x + 30, GROUND + 70, 30, 5);
  }
  // Grass / floor top edge.
  ctx.fillStyle = stage === 2 ? '#5d4030' : '#4e7a2e';
  ctx.fillRect(0, GROUND - 4, W, 8);
}

export function drawGate(ctx, camX, gateX) {
  const sx = gateX - camX;
  if (sx < -300 || sx > 1600) return;
  // Forest gate: two tall trees + arch.
  ctx.fillStyle = '#2f6b33';
  ctx.fillRect(sx - 90, GROUND - 260, 26, 260);
  ctx.fillRect(sx + 64, GROUND - 260, 26, 260);
  ctx.beginPath();
  ctx.arc(sx - 77, GROUND - 270, 52, 0, Math.PI * 2);
  ctx.arc(sx + 77, GROUND - 270, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ead1';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOREST', sx, GROUND - 210);
  ctx.fillText('ESCAPE', sx, GROUND - 184);
}
