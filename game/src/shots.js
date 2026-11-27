// ?shot=title|farmyard|kitchen|escaped&seed=N — deterministic single static
// frame, no audio, no gameplay. Exported applyShot(state) is called by main.js
// before the loop starts.
import { CONFIG } from './config.js';
import { makeObstacle } from './obstacles.js';
import { RNG } from './random.js';

const GROUND = CONFIG.groundY;

function seedWorld(s, seed) {
  s.world.rng = new RNG(seed);
  s.world.obstacles = [];
  s.world.collectibles = [];
  s.world.nextSpawnX = 10 ** 9; // spawner parked for the shot
}

export function applyShot(s) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  if (!shot) return false;

  seedWorld(s, seed);
  s.shotMode = true;

  if (shot === 'title') {
    s.mode = 'title';
    s.turkey.x = 200;
    s.turkey.y = GROUND;
    s.farmer.gap = 120; // was 320: farmer stood off-frame; 120 keeps him visible
    s.world.stage = 0;
    s.camX = 0;
    s.world.obstacles.push(makeObstacle('fence', 700));
    s.world.obstacles.push(makeObstacle('hay', 950));
    s.world.collectibles.push({ type: 'corn', x: 500, y: GROUND - 60, taken: false });
    s.world.collectibles.push({ type: 'corn', x: 544, y: GROUND - 60, taken: false });
    s.world.collectibles.push({ type: 'corn', x: 588, y: GROUND - 60, taken: false });
    return true;
  }

  if (shot === 'farmyard') {
    s.mode = 'playing';
    s.world.stage = 0;
    s.turkey.x = 6000;
    s.turkey.y = GROUND - 130; // mid-jump
    s.turkey.vy = -220;
    s.turkey.grounded = false;
    s.farmer.gap = 120; // farmer visible at the left edge
    s.camX = s.turkey.x - 520;
    s.world.obstacles.push(makeObstacle('fence', 6120));
    s.world.obstacles.push(makeObstacle('hay', 6600));
    s.world.obstacles.push(makeObstacle('pumpkin', 6900));
    for (let i = 0; i < 4; i++) {
      s.world.collectibles.push({ type: 'corn', x: 6160 + i * 44, y: GROUND - 190 + Math.sin((i / 3) * Math.PI) * 30, taken: false });
    }
    return true;
  }

  if (shot === 'kitchen') {
    s.mode = 'playing';
    s.world.stage = 2;
    s.turkey.x = 46000; // ~1150 m, deep in stage 3 (night)
    s.turkey.y = GROUND;
    s.turkey.grounded = true;
    s.farmer.gap = 60; // farmer right behind: red proximity bar (closeness 0.875)
    // camX = turkey.x - 300 (was -520): pot/knife were at the far right edge
    // (screen 1220/1170, barely visible). Now: firejet 700, knife 950, pot 1000.
    s.camX = s.turkey.x - 300;
    const jet = makeObstacle('firejet', 46400, { cycle: 1.5 }); // bursting
    jet.burst = true;
    s.world.obstacles.push(jet);
    // Knife 'stuck' (was 'warn'): warn shows only a floor shadow + "!",
    // the blade itself is invisible. A stuck blade reads as a knife.
    const knife = makeObstacle('knifeFall', 46650, {});
    knife.state = 'stuck';
    s.world.obstacles.push(knife);
    s.world.obstacles.push(makeObstacle('pot', 46700));
    s.world.collectibles.push({ type: 'feather', x: 46520, y: GROUND - 200, taken: false });
    return true;
  }

  if (shot === 'escaped') {
    s.mode = 'escaped';
    // Realistic final score for a 1400 m run (1400 distance + ~340 corn).
    // Was 15420: implausible, looked faked.
    s.score = 1740;
    s.turkey.x = CONFIG.gateM * CONFIG.pxPerM;
    s.turkey.y = GROUND;
    s.farmer.gap = 700;
    s.world.stage = 2;
    s.camX = s.turkey.x - 700;
    return true;
  }

  s.shotMode = false;
  return false;
}
