// Featherweight Fugitive — everything the player sees: the farm, the barn, the
// kitchen, the turkey, the farmer, the HUD and the title/end screens. Vector art
// only, drawn from the world state, so a screenshot is always the real game.
import { FIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloor(ctx, world) {
  const stage = world.stage;
  if (stage.floor === 'grass') {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Mown stripes and dirt patches, deterministic from the stage seed.
    ctx.fillStyle = PALETTE.grassDark;
    for (let i = 0; i < 9; i += 1) {
      if (i % 2 === 0) ctx.fillRect(0, i * 80, FIELD.width, 40);
    }
    ctx.fillStyle = PALETTE.dirt;
    ellipse(ctx, 640, 360, 260, 90);
    ellipse(ctx, 180, 150, 150, 60);
    ellipse(ctx, 1080, 560, 170, 70);
  } else if (stage.floor === 'barn') {
    ctx.fillStyle = PALETTE.barnFloor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.barnWoodDark;
    for (let y = 0; y < FIELD.height; y += 72) ctx.fillRect(0, y, FIELD.width, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, FIELD.width, 90);
    ctx.fillRect(0, 630, FIELD.width, 90);
  } else {
    ctx.fillStyle = PALETTE.kitchenFloor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.kitchenTile;
    for (let y = 0; y < FIELD.height; y += 90) {
      for (let x = (y / 90) % 2 === 0 ? 0 : 45; x < FIELD.width; x += 90) {
        ctx.fillRect(x, y, 86, 86);
      }
    }
  }
}

function drawWalls(ctx, world) {
  const stage = world.stage;
  ctx.fillStyle = stage.floor === 'grass' ? PALETTE.fence : stage.floor === 'barn' ? PALETTE.barnWood : PALETTE.tableWood;
  for (const w of stage.walls) {
    rr(ctx, w.x, w.y, w.w, w.h, 6);
    ctx.fill();
  }
  if (stage.floor === 'grass') {
    // Fence posts along the top and bottom runs.
    ctx.fillStyle = PALETTE.fence;
    for (let x = 40; x < FIELD.width; x += 90) {
      ctx.fillRect(x, 4, 10, 18);
      ctx.fillRect(x, 698, 10, 18);
    }
  }
  ctx.fillStyle = stage.floor === 'barn' ? PALETTE.barnWoodDark : PALETTE.hayDark;
  for (const c of stage.crates) {
    rr(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
    ctx.beginPath();
    ctx.moveTo(c.x + 6, c.y + 6);
    ctx.lineTo(c.x + c.w - 6, c.y + c.h - 6);
    ctx.moveTo(c.x + c.w - 6, c.y + 6);
    ctx.lineTo(c.x + 6, c.y + c.h - 6);
    ctx.stroke();
  }
  for (const h of stage.hay) {
    ctx.fillStyle = PALETTE.hay;
    ellipse(ctx, h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2);
    ctx.strokeStyle = PALETTE.hayDark;
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2 - 8, (h.h / 2 - 8) * (1 - Math.abs(i) * 0.18), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawExit(ctx, world) {
  const ex = world.stage.exit;
  ctx.fillStyle = '#2f6b2f';
  ctx.fillRect(ex.x, ex.y - 6, ex.w, ex.h + 12);
  ctx.fillStyle = '#e8f5d8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(ex.x + ex.w / 2, ex.y + ex.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(world.stage.exitLabel, 0, 5);
  ctx.restore();
  ctx.fillStyle = '#f2c531';
  ctx.beginPath();
  ctx.moveTo(ex.x - 26, ex.y + ex.h / 2 - 14);
  ctx.lineTo(ex.x - 6, ex.y + ex.h / 2);
  ctx.lineTo(ex.x - 26, ex.y + ex.h / 2 + 14);
  ctx.closePath();
  ctx.fill();
}

function drawOven(ctx, world) {
  const o = world.stage.oven;
  if (!o) return;
  const glow = world.ovenState === 'burst' ? 0.55 : world.ovenState === 'warn' ? 0.3 : 0.12;
  ctx.fillStyle = `rgba(224, 106, 30, ${glow})`;
  ctx.fillRect(o.x - 34, o.y - 34, o.w + 68, o.h + 68);
  ctx.fillStyle = PALETTE.ovenBody;
  rr(ctx, o.x, o.y, o.w, o.h, 10);
  ctx.fill();
  ctx.fillStyle = world.ovenState === 'burst' ? '#ff9a3c' : '#3a3a42';
  rr(ctx, o.x + 16, o.y + 18, o.w - 32, o.h - 56, 6);
  ctx.fill();
  if (world.ovenState === 'warn') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', o.x + o.w / 2, o.y - 44);
  }
  ctx.fillStyle = '#dfe6ea';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OVEN', o.x + o.w / 2, o.y + o.h - 10);
}

function drawPickups(ctx, world) {
  for (const item of world.pickups) {
    if (!item.active) continue;
    if (item.kind === 'corn') {
      ctx.fillStyle = PALETTE.corn;
      ellipse(ctx, item.x, item.y, 11, 7);
      ctx.fillStyle = '#7a9b4e';
      ctx.fillRect(item.x - 2, item.y - 12, 4, 6);
    } else if (item.kind === 'feather') {
      ctx.fillStyle = PALETTE.feather;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(-0.6);
      ellipse(ctx, 0, 0, 12, 5);
      ctx.restore();
    } else {
      // Gravy boat: a little boat, a speed boost.
      ctx.fillStyle = '#b98a52';
      ctx.beginPath();
      ctx.moveTo(item.x - 12, item.y);
      ctx.quadraticCurveTo(item.x, item.y + 14, item.x + 12, item.y);
      ctx.lineTo(item.x + 8, item.y - 8);
      ctx.lineTo(item.x - 8, item.y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(item.x + 8, item.y - 6, 8, 3);
    }
  }
}

function drawKnives(ctx, world) {
  for (const k of world.knives) {
    if (!k.active) continue;
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.angle);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(-18, -3, 8, 6);
    ctx.restore();
  }
}

function drawTurkey(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 12, 18, 7);
  ctx.rotate(p.face);
  // Tail feathers.
  ctx.fillStyle = '#a86a35';
  for (let i = -1; i <= 1; i += 1) {
    ctx.save();
    ctx.rotate(Math.PI + i * 0.5);
    ellipse(ctx, -16, 0, 12, 5);
    ctx.restore();
  }
  // Body, wing, head, beak, wattle.
  ctx.fillStyle = PALETTE.turkeyBody;
  ellipse(ctx, 0, 0, 17, 14);
  ctx.fillStyle = PALETTE.turkeyWing;
  ellipse(ctx, -2, 2, 10, 7);
  ctx.fillStyle = PALETTE.turkeyHead;
  ellipse(ctx, 15, -6, 8, 7);
  ctx.fillStyle = PALETTE.turkeyBeak;
  ctx.beginPath();
  ctx.moveTo(22, -8);
  ctx.lineTo(30, -5);
  ctx.lineTo(22, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ellipse(ctx, 20, 0, 3, 5);
  ctx.fillStyle = '#1d1d1d';
  ellipse(ctx, 17, -8, 2, 2);
  ctx.restore();
  // Hidden in hay: a few straws poke out over the bird.
  if (p.hidden) {
    ctx.strokeStyle = PALETTE.hayDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(p.x - 10 + i * 10, p.y - 12);
      ctx.lineTo(p.x - 12 + i * 10, p.y - 24);
      ctx.stroke();
    }
  }
}

function drawFarmer(ctx, world) {
  const f = world.farmer;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, 0, 16, 20, 8);
  ctx.rotate(f.face);
  // Body: shirt + overalls, head, straw hat.
  ctx.fillStyle = PALETTE.farmerShirt;
  rr(ctx, -16, -12, 32, 26, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(-14, 2, 28, 12);
  ctx.fillStyle = PALETTE.farmerSkin;
  ellipse(ctx, 16, -4, 9, 8);
  ctx.fillStyle = PALETTE.farmerHat;
  ellipse(ctx, 15, -10, 12, 4);
  ctx.fillRect(9, -18, 12, 8);
  ctx.fillStyle = '#1d1d1d';
  ellipse(ctx, 19, -6, 2, 2);
  // Wind-up: he raises the knife before throwing.
  if (f.windup > 0) {
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.save();
    ctx.translate(-6, -20);
    ctx.rotate(-0.8);
    ctx.fillRect(0, -2, 22, 4);
    ctx.restore();
  }
  ctx.restore();
  // Mood mark: ! when chasing, ? when suspicious or searching.
  if (f.mode === 'chase') {
    ctx.fillStyle = PALETTE.alert;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', f.x, f.y - 34);
  } else if (f.mode === 'suspicious' || f.mode === 'search') {
    ctx.fillStyle = '#f2c531';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', f.x, f.y - 34);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hudBg;
  rr(ctx, 12, 12, 430, 44, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 26, 40);
  ctx.fillText(`${Math.round(world.distance)} / ${1500} m`, 170, 40);
  ctx.fillStyle = '#e0483c';
  let hearts = '';
  for (let i = 0; i < world.lives; i += 1) hearts += '♥ ';
  ctx.fillText(hearts.trim(), 330, 40);
  ctx.fillStyle = PALETTE.hudBg;
  rr(ctx, FIELD.width - 252, 12, 240, 44, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'right';
  ctx.fillText(world.stage.name, FIELD.width - 26, 40);
  if (world.alertT > 0 || world.farmer.mode === 'chase') {
    ctx.fillStyle = PALETTE.alert;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', FIELD.width / 2, 96);
  }
  if (world.player.boost > 0) {
    ctx.fillStyle = '#f2c531';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRAVY BOOST!', FIELD.width / 2, 122);
  }
  if (world.ovenState === 'warn') {
    ctx.fillStyle = '#ff9a3c';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE OVEN IS ABOUT TO BLAST — KEEP CLEAR', FIELD.width / 2, FIELD.height - 24);
  }
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#f7ead0';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('FEATHERWEIGHT FUGITIVE', FIELD.width / 2, 220);
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#f2c531';
  ctx.fillText('A turkey’s great escape from Thanksgiving dinner', FIELD.width / 2, 268);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#f7ead0';
  ctx.fillText('Move with WASD or the arrow keys — or click where to run.', FIELD.width / 2, 340);
  ctx.fillText('Dodge the farmer, his carving knives and the oven. Hide in the hay.', FIELD.width / 2, 372);
  ctx.fillText('Eat corn, grab feathers, reach the green exit. Three stages to freedom.', FIELD.width / 2, 404);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#f2c531';
  ctx.fillText('Press ENTER or click to start', FIELD.width / 2, 480);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#cbb894';
  ctx.fillText('M mutes the sound · R restarts after the end', FIELD.width / 2, 520);
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  if (world.status === 'escaped') {
    ctx.fillStyle = '#f2c531';
    ctx.font = 'bold 60px Georgia, serif';
    ctx.fillText('ESCAPED!', FIELD.width / 2, 260);
    ctx.fillStyle = '#f7ead0';
    ctx.font = '26px Georgia, serif';
    ctx.fillText('You made it to the forest. Thanksgiving is cancelled — for you, anyway.', FIELD.width / 2, 316);
  } else {
    ctx.fillStyle = '#e0483c';
    ctx.font = 'bold 60px Georgia, serif';
    ctx.fillText('CAUGHT!', FIELD.width / 2, 260);
    ctx.fillStyle = '#f7ead0';
    ctx.font = '26px Georgia, serif';
    ctx.fillText('The farmer got you. The oven was already warm.', FIELD.width / 2, 316);
  }
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#f7ead0';
  ctx.fillText(`Score ${world.score} · Distance ${Math.round(world.distance)} m`, FIELD.width / 2, 380);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#f2c531';
  ctx.fillText('Press R or click to run again', FIELD.width / 2, 450);
}

/** Draw one frame. `screen` is one of SCREEN_TITLE / SCREEN_PLAY / SCREEN_OVER. */
export function draw(ctx, world, screen) {
  drawFloor(ctx, world);
  drawWalls(ctx, world);
  drawExit(ctx, world);
  drawOven(ctx, world);
  drawPickups(ctx, world);
  drawKnives(ctx, world);
  drawTurkey(ctx, world);
  drawFarmer(ctx, world);
  if (screen === SCREEN_PLAY) drawHud(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (screen === SCREEN_OVER) drawOver(ctx, world);
}
