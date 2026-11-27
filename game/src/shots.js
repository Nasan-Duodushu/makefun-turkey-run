// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by an
// autopilot (flee the farmer, dodge knives, chase nearby corn, head for the exit),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 5; // A chase is usually on by 5 s and the autopilot is
// caught three times inside 19 s now that the farmer really patrols —
// a 26 s window only ever framed the CAUGHT screen. 5 s catches live play.
const KITCHEN_SECONDS = 20;
const END_LIMIT_SECONDS = 600;

/** Steer the turkey: flee danger first, then the exit, then nearby corn. */
function autopilot(world, horizon) {
  const p = world.player;
  const f = world.farmer;
  let dx = 0;
  let dy = 0;
  const dFarmer = Math.hypot(p.x - f.x, p.y - f.y);
  if (f.mode === 'chase' && dFarmer < 260) {
    // Run away from the farmer, hard.
    const w = (260 - dFarmer) / 60;
    dx += ((p.x - f.x) / Math.max(dFarmer, 1)) * w;
    dy += ((p.y - f.y) / Math.max(dFarmer, 1)) * w;
  }
  // Dodge the nearest live knife.
  for (const k of world.knives) {
    if (!k.active) continue;
    const d = Math.hypot(p.x - k.x, p.y - k.y);
    if (d < 110) {
      dx += ((p.y - k.y) / Math.max(d, 1)) * 1.6; // sidestep, mostly vertical
      dy += ((p.x - k.x) / Math.max(d, 1)) * -1.6;
    }
  }
  // The exit, always pulling.
  const ex = world.stage.exit;
  const ecx = ex.x + ex.w / 2;
  const ecy = ex.y + ex.h / 2;
  const de = Math.hypot(ecx - p.x, ecy - p.y);
  dx += ((ecx - p.x) / Math.max(de, 1)) * 0.8;
  dy += ((ecy - p.y) / Math.max(de, 1)) * 0.8;
  // Nearby corn, when the farmer is not on top of us.
  if (f.mode !== 'chase') {
    let best = null;
    let bestD = 130;
    for (const item of world.pickups) {
      if (!item.active || item.kind !== 'corn') continue;
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < bestD) { best = item; bestD = d; }
    }
    if (best) {
      dx += ((best.x - p.x) / Math.max(bestD, 1)) * 0.7;
      dy += ((best.y - p.y) / Math.max(bestD, 1)) * 0.7;
    }
  }
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return { left: false, right: false, up: false, down: false, target: null };
  return {
    left: false, right: false, up: false, down: false,
    target: { x: p.x + (dx / len) * 120, y: p.y + (dy / len) * 120 },
  };
}

/** A myopic pilot for the end scene: it only reacts when danger is close. */
function myopicPilot(world) {
  const p = world.player;
  const f = world.farmer;
  const dFarmer = Math.hypot(p.x - f.x, p.y - f.y);
  if (f.mode === 'chase' && dFarmer < 90) {
    return {
      left: false, right: false, up: false, down: false,
      target: { x: p.x + ((p.x - f.x) / Math.max(dFarmer, 1)) * 120, y: p.y + ((p.y - f.y) / Math.max(dFarmer, 1)) * 120 },
    };
  }
  const ex = world.stage.exit;
  return {
    left: false, right: false, up: false, down: false,
    target: { x: ex.x + ex.w / 2, y: ex.y + ex.h / 2 },
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Names: start | play | kitchen | end (anything else is start).
 */
export function stageShot(name, world) {
  world.reset();
  world.status = 'play';
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { left: false, right: false, up: false, down: false, target: null });
    }
    world.status = 'title';
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'kitchen') {
    world.stageIndex = 2;
    world.loadStage(2);
    world.status = 'play';
    for (let i = 0; i < KITCHEN_SECONDS / STEP; i += 1) {
      if (world.step(STEP, autopilot(world, 0.7)) & EVENT_OVER) break;
      if (world.status !== 'play') break;
    }
    return { screen: world.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, myopicPilot(world)) & EVENT_OVER) break;
      if (world.status !== 'play') break;
    }
    return { screen: world.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
    if (world.step(STEP, autopilot(world, 0.7)) & EVENT_OVER) break;
    if (world.status !== 'play') break;
  }
  return { screen: world.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
}
