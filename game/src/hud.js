// HUD (canvas-drawn): score, distance, hearts, stage name, farmer proximity
// bar (green -> red + label), speed. Title / pause / CAUGHT / ESCAPED screens.
import { CONFIG, STAGE_NAMES, runSpeedForStage } from './config.js';

const W = CONFIG.canvas.w;
const H = CONFIG.canvas.h;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

export function drawHUD(ctx, s) {
  const t = s.turkey;
  // Distance run from the start line (turkey starts at startX = 200 px = 5 m).
  const distM = Math.floor((t.x - CONFIG.turkey.startX) / CONFIG.pxPerM);

  panel(ctx, 16, 14, 300, 92);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7ead1';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('SCORE ' + s.score, 30, 44);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(distM + ' m  •  ' + STAGE_NAMES[s.world.stage], 30, 72);
  // Hearts.
  ctx.font = '24px system-ui, sans-serif';
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < t.lives ? '♥ ' : '♡ ';
  ctx.fillStyle = '#ff5a5a';
  ctx.fillText(hearts, 30, 98);

  // Farmer proximity bar (top-right): green -> red as the gap closes.
  const gap = s.farmer.gap;
  const closeness = Math.max(0, Math.min(1, 1 - gap / 480));
  const barW = 260;
  const bx = W - barW - 20;
  panel(ctx, bx - 10, 14, barW + 20, 92);
  ctx.fillStyle = '#f7ead1';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const label = closeness > 0.75 ? 'RIGHT BEHIND YOU!' : closeness > 0.4 ? 'FARMER CLOSING IN' : 'FARMER FAR BEHIND';
  // Longest label was 'FARMER RIGHT BEHIND YOU!' (33 chars incl. prefix,
  // ~300 px) — it overflowed the 260 px bar panel and clipped at the right
  // edge of the 1280 canvas (seen in 3-kitchen.jpg). 'RIGHT BEHIND YOU!'
  // keeps the total at 27 chars, same as the other two labels.
  ctx.fillText('FARMER  •  ' + label, bx, 38);
  ctx.fillStyle = '#222';
  ctx.fillRect(bx, 50, barW, 16);
  const r = Math.floor(80 + closeness * 175);
  const g = Math.floor(200 - closeness * 160);
  ctx.fillStyle = 'rgb(' + r + ',' + g + ',40)';
  ctx.fillRect(bx, 50, barW * closeness, 16);
  ctx.fillStyle = '#f7ead1';
  ctx.font = '16px system-ui, sans-serif';
  // In shot mode the game never ticks, so s.speed stays 0 — show the
  // stage's run speed instead (live play is unaffected: speed is non-zero).
  const speed = s.shotMode ? runSpeedForStage(s.world.stage) : s.speed;
  ctx.fillText('Speed ' + Math.round(speed) + ' px/s' + (s.boost > 0 ? '  •  PIE BOOST!' : ''), bx, 88);

  // Controls hint (bottom).
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(247,234,209,0.75)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('SPACE jump  •  hold SPACE in air = panic flap  •  ↓ slide  •  P pause  •  M mute  •  R restart', W / 2, H - 14);
}

function bigTitle(ctx, text, sub, color) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color || '#f7ead1';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 10;
  ctx.strokeText(text, W / 2, H / 2 - 40);
  ctx.fillText(text, W / 2, H / 2 - 40);
  if (sub) {
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(sub, W / 2, H / 2 + 10);
  }
}

export function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(20,12,6,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 12;
  ctx.strokeText('TURKEY RUN', W / 2, 190);
  ctx.fillText('TURKEY RUN', W / 2, 190);
  ctx.fillStyle = '#f7ead1';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('One turkey. One very angry farmer. Thanksgiving dinner is NOT on the menu.', W / 2, 240);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('SPACE / tap to jump  •  hold SPACE in air to flap  •  ↓ / S to slide under beams', W / 2, 300);
  ctx.fillText('Collect corn (+10), golden feathers (+1 life), pie (speed boost).', W / 2, 334);
  ctx.fillText('Reach the forest gate at 1400 m — through the farmyard, the barn, and the kitchen.', W / 2, 368);
  const pulse = 0.7 + 0.3 * Math.sin(s.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('PRESS SPACE OR TAP TO START', W / 2, 470);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(247,234,209,0.8)';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('P pause  •  M mute  •  R restart', W / 2, 520);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,6,4,0.6)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, 'PAUSED', 'Press P to keep running', '#ffd98a');
}

export function drawCaught(ctx, s) {
  ctx.fillStyle = 'rgba(40,4,4,0.72)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, 'DINNER IS SERVED...', 'The farmer caught you at ' + Math.floor((s.turkey.x - CONFIG.turkey.startX) / CONFIG.pxPerM) + ' m', '#ff7b6b');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7ead1';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('Final score: ' + s.score, W / 2, H / 2 + 70);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Press R or tap to try again', W / 2, H / 2 + 110);
}

export function drawEscaped(ctx, s) {
  ctx.fillStyle = 'rgba(6,30,10,0.55)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, 'YOU ESCAPED', 'THE STUFFING!', '#8dff9a');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7ead1';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('1400 m to freedom  •  Final score: ' + s.score, W / 2, H / 2 + 70);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Press R or tap to run again', W / 2, H / 2 + 110);
}
