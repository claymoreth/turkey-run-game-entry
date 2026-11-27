// Turkey Run — all constants in one place.
// Units: px, seconds, ticks (60 Hz fixed step).

export const CONFIG = {
  canvas: { w: 1280, h: 720 },
  groundY: 600,
  pxPerM: 40,

  // Stage lengths in metres; forest gate at 1400 m.
  stages: [
    { name: 'FARMYARD', lenM: 500, speed: 300, minGap: 360 },
    { name: 'BARN', lenM: 500, speed: 360, minGap: 400 },
    { name: 'KITCHEN', lenM: 400, speed: 420, minGap: 440 },
  ],
  gateM: 1400,
  pieBoostMul: 1.35,
  pieBoostSecs: 2,

  // Jump / gravity (px, px/s, px/s^2).
  jumpVel: -860,
  gravUp: 2600,
  gravDownMul: 1.8, // fall gravity = 2600 * 1.8 = 4680
  terminalFall: 1100,
  jumpCutMul: 0.5, // release cut, once per jump
  apexHangVy: 120, // |vy| below this while jump held -> gravity x0.5
  apexHangMul: 0.5,
  flapMaxFall: 130, // panic flap caps descent speed

  // Tick stamps (60 Hz): coyote 0.1 s = 6 ticks, jump buffer 0.12 s = 7 ticks.
  coyoteTicks: 6,
  bufferTicks: 7,

  // Farmer FSM thresholds (px gap behind turkey).
  farmer: {
    chaseTargetGap: 185, // clean-run equilibrium gap (was 260: SURGE unreachable)
    // min 0 (was -40): below the target the farmer holds his gap instead of
    // drifting back — a mistake is not forgiven for free, so repeated hits
    // ratchet the gap down until he touches. The clean-run equilibrium is
    // unchanged (the clamp only binds below the target).
    chaseClamp: { min: 0, max: 90 },
    chaseGain: 0.9,
    surgeEnterGap: 150,
    // 3.0 s (was 1.0): with a 1.0 s hold the SURGE cycle fired ~1.3 s after
    // a hit and its stumble reset the gap before the slow-ratchet could
    // finish — the touch was unreachable in every seed. 3.0 s delays the
    // SURGE until after the second-hit touch window, while SURGE stays a
    // live threat (it still fires ~3.3 s after a mistake).
    surgeHoldSecs: 3.0,
    windupSecs: 0.4,
    lungeSecs: 0.5,
    lungeBonus: 260,
    stumbleSecs: 0.8,
    lagEnterGap: 480,
    lagExitGap: 380,
    lagSpeedMul: 0.55,
    lagMaxSecs: 2.5, // LAG exits by timer at the latest (was: permanent trap)
    catchUpMul: 1.15, // after LAG, farmer runs 1.15x until gap < catchUpExitGap
    catchUpExitGap: 250,
    minStateSecs: 0.5,
    reactionSecs: 0.3,
    touchGap: 24,
    knockGap: 320,
    invulnSecs: 1.0,
  },

  // Obstacle-hit slowdown: turkey drops to 55% speed for 0.7 s; the farmer
  // keeps his own pace, so the gap closes (the main gap-closing mechanic).
  obstacleSlowMul: 0.55,
  obstacleSlowSecs: 0.7,

  // Feel.
  hitStopHit: 0.05,
  hitStopCaught: 0.12,
  traumaDecay: 1.2,
  traumaMaxOffset: 14,
  camera: { rate: 8, deadzone: 40, lookAhead: 120 },
  fixedDt: 1 / 60,
  maxSteps: 5,

  // Turkey.
  turkey: {
    w: 64,
    h: 76,
    slideH: 38,
    startX: 200,
    lives: 3,
  },

  // Scoring.
  cornScore: 10,

  // Autumn palette.
  palette: {
    pumpkin: '#e8710a',
    barnRed: '#a83226',
    hayGold: '#e0a83c',
    deepBrown: '#4a2c17',
    cream: '#f7ead1',
    forestGreen: '#2f6b33',
    skyDay: ['#ffd98a', '#ffeec2'],
    skyDusk: ['#c96f3b', '#5d3a5e'],
    skyNight: ['#1d2440', '#3a2a4d'],
    groundDay: '#8a5a2b',
    groundDusk: '#6b4423',
    groundNight: '#3d2a1a',
  },
};

export const STAGE_NAMES = CONFIG.stages.map((s) => s.name);

export function stageForDistanceM(m) {
  let acc = 0;
  for (let i = 0; i < CONFIG.stages.length; i++) {
    acc += CONFIG.stages[i].lenM;
    if (m < acc) return i;
  }
  return CONFIG.stages.length - 1;
}

export function stageStartM(i) {
  let acc = 0;
  for (let j = 0; j < i; j++) acc += CONFIG.stages[j].lenM;
  return acc;
}

export function runSpeedForStage(i) {
  return CONFIG.stages[i].speed;
}

export function minGapForStage(i) {
  return CONFIG.stages[i].minGap;
}
