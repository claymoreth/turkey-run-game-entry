// Hazards: definitions, update, draw, AABB collision vs the turkey.
// Slide halves the turkey hitbox height (handled in turkey.js).
import { CONFIG } from './config.js';

const GROUND = CONFIG.groundY;

// type -> { w, h, y (top), kind } ; y computed from ground at spawn.
export function makeObstacle(type, x, opts) {
  const o = Object.assign({ type, x, passed: false, seed: Math.random() }, opts || {});
  switch (type) {
    case 'fence':
      o.w = 46; o.h = 62; break;
    case 'hay':
      o.w = 84; o.h = 70; break;
    case 'pumpkin':
      o.w = 56; o.h = 56; o.vx = 40; break; // rolls toward player (+40 px/s)
    case 'knifeSwing':
      o.w = 30; o.h = 120; o.pivotY = GROUND - 190; o.phase = o.phase || 0; break;
    case 'beam':
      o.w = 110; o.h = 44; o.topY = GROUND - 92; break; // low beam: slide under
    case 'crates':
      o.w = 88; o.h = 118; break;
    case 'firejet':
      o.w = 70; o.h = 90; o.cycle = o.cycle || 0; o.burst = false; o.telegraph = false; break;
    case 'knifeFall':
      o.w = 26; o.h = 90; o.state = 'warn'; o.timer = 0.7; o.stuck = 0; break;
    case 'pot':
      o.w = 64; o.h = 52; break;
    default:
      o.w = 50; o.h = 50;
  }
  return o;
}

export function obstacleBox(o) {
  switch (o.type) {
    case 'beam':
      return { x: o.x, y: o.topY, w: o.w, h: o.h };
    case 'knifeSwing': {
      // Blade tip swings; approximate with a box that follows the swing angle.
      const ang = Math.sin(o.phase) * 0.9;
      const tipX = o.x + Math.sin(ang) * 110;
      const tipY = o.pivotY + Math.cos(ang) * 110;
      return { x: Math.min(o.x, tipX) - 12, y: Math.min(o.pivotY, tipY), w: 26, h: Math.abs(tipY - o.pivotY) + 30 };
    }
    case 'firejet':
      // Only solid while bursting.
      if (!o.burst) return null;
      return { x: o.x, y: GROUND - o.h, w: o.w, h: o.h };
    case 'knifeFall':
      if (o.state === 'warn') return null;
      if (o.state === 'falling') return { x: o.x, y: o.y, w: o.w, h: o.h };
      return { x: o.x, y: GROUND - 46, w: o.w, h: 46 }; // stuck blade, low stub
    default:
      return { x: o.x, y: GROUND - o.h, w: o.w, h: o.h };
  }
}

export function updateObstacles(list, dt, time) {
  for (const o of list) {
    if (o.type === 'pumpkin') {
      o.x -= o.vx * dt; // rolls toward the player
      o.roll = (o.roll || 0) + dt * 6;
    }
    if (o.type === 'knifeSwing') o.phase += dt * 2.2;
    if (o.type === 'firejet') {
      // Cycle: 1.2 s off (first 0.6 s telegraph glow + hiss) / 0.8 s burst.
      o.cycle += dt;
      const c = o.cycle % 2.0;
      o.telegraph = c < 0.6;
      o.burst = c >= 1.2;
    }
    if (o.type === 'knifeFall') {
      if (o.state === 'warn') {
        o.timer -= dt;
        if (o.timer <= 0) {
          o.state = 'falling';
          o.y = GROUND - 320;
          o.vy = 0;
        }
      } else if (o.state === 'falling') {
        o.vy = (o.vy || 0) + 2400 * dt;
        o.y += o.vy * dt;
        if (o.y >= GROUND - 90) {
          o.y = GROUND - 90;
          o.state = 'stuck';
          o.stuck = 1.4;
        }
      } else if (o.state === 'stuck') {
        o.stuck -= dt;
        if (o.stuck <= 0) o.state = 'gone';
      }
    }
  }
  return list.filter((o) => o.type !== 'knifeFall' || o.state !== 'gone');
}

export function aabbHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function drawObstacles(ctx, list, camX) {
  for (const o of list) {
    const sx = o.x - camX;
    if (sx < -200 || sx > 1500) continue;
    ctx.save();
    switch (o.type) {
      case 'fence': {
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(sx, GROUND - 62, 8, 62);
        ctx.fillRect(sx + 38, GROUND - 62, 8, 62);
        ctx.fillRect(sx - 4, GROUND - 56, 54, 8);
        ctx.fillRect(sx - 4, GROUND - 30, 54, 8);
        break;
      }
      case 'hay': {
        ctx.fillStyle = '#e0a83c';
        ctx.beginPath();
        ctx.arc(sx + 42, GROUND - 30, 40, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(sx + 2, GROUND - 32, 80, 32);
        ctx.strokeStyle = '#b9822a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx + 42, GROUND - 30, 28, Math.PI, 0);
        ctx.stroke();
        break;
      }
      case 'pumpkin': {
        ctx.save();
        ctx.translate(sx + 28, GROUND - 28);
        ctx.rotate(o.roll || 0);
        ctx.fillStyle = '#e8710a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b95506';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#2f6b33';
        ctx.fillRect(-3, -32, 6, 10);
        ctx.restore();
        break;
      }
      case 'knifeSwing': {
        const ang = Math.sin(o.phase) * 0.9;
        ctx.strokeStyle = '#5d3413';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx + 15, o.pivotY - 30);
        ctx.lineTo(sx + 15, o.pivotY);
        ctx.stroke();
        ctx.save();
        ctx.translate(sx + 15, o.pivotY);
        ctx.rotate(ang);
        ctx.fillStyle = '#d7dde3';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 118);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a2c17';
        ctx.fillRect(-8, -14, 16, 16);
        ctx.restore();
        break;
      }
      case 'beam': {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx, o.topY, o.w, o.h);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(sx, o.topY, o.w, 8);
        ctx.fillStyle = '#f7ead1';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DUCK!', sx + o.w / 2, o.topY - 8);
        break;
      }
      case 'crates': {
        ctx.fillStyle = '#a8763e';
        ctx.fillRect(sx, GROUND - 118, 88, 58);
        ctx.fillRect(sx + 6, GROUND - 58, 76, 58);
        ctx.strokeStyle = '#7a5222';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, GROUND - 118, 88, 58);
        ctx.strokeRect(sx + 6, GROUND - 58, 76, 58);
        break;
      }
      case 'firejet': {
        // Floor hole.
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx, GROUND - 8, o.w, 10);
        ctx.fillStyle = '#3d2a1a';
        ctx.fillRect(sx - 6, GROUND - 4, o.w + 12, 8);
        if (o.telegraph) {
          const pulse = 0.4 + 0.6 * Math.abs(Math.sin(o.cycle * 12));
          ctx.fillStyle = 'rgba(255,120,0,' + pulse.toFixed(2) + ')';
          ctx.beginPath();
          ctx.ellipse(sx + o.w / 2, GROUND - 10, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (o.burst) {
          const fl = Math.sin(o.cycle * 30) * 8;
          ctx.fillStyle = '#ff7b00';
          ctx.beginPath();
          ctx.moveTo(sx + 4, GROUND - 6);
          ctx.quadraticCurveTo(sx + 14, GROUND - 100 + fl, sx + o.w / 2, GROUND - 92);
          ctx.quadraticCurveTo(sx + o.w - 14, GROUND - 100 - fl, sx + o.w - 4, GROUND - 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffd23e';
          ctx.beginPath();
          ctx.moveTo(sx + 16, GROUND - 6);
          ctx.quadraticCurveTo(sx + 24, GROUND - 60, sx + o.w / 2, GROUND - 56);
          ctx.quadraticCurveTo(sx + o.w - 24, GROUND - 60, sx + o.w - 16, GROUND - 6);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'knifeFall': {
        if (o.state === 'warn') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(sx + 13, GROUND - 4, 30, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,60,40,0.85)';
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', sx + 13, GROUND - 18);
        } else if (o.state === 'falling' || o.state === 'stuck') {
          const topY = o.state === 'stuck' ? GROUND - 46 : o.y;
          ctx.fillStyle = '#d7dde3';
          ctx.beginPath();
          ctx.moveTo(topY === GROUND - 46 ? sx + 2 : sx + 2, topY);
          ctx.lineTo(sx + 24, topY);
          ctx.lineTo(sx + 13, topY + (o.state === 'stuck' ? 46 : 90));
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#4a2c17';
          ctx.fillRect(sx + 2, topY - 14, 22, 14);
        }
        break;
      }
      case 'pot': {
        ctx.fillStyle = '#3a3f46';
        ctx.beginPath();
        ctx.ellipse(sx + 32, GROUND - 26, 32, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22252a';
        ctx.beginPath();
        ctx.ellipse(sx + 32, GROUND - 40, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(sx - 6, GROUND - 44, 12, 8);
        ctx.fillRect(sx + 58, GROUND - 44, 12, 8);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }
}
