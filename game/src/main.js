// Featherweight Fugitive — the loop: screens, input, sound, the world step and
// the draw. ?shot=start|play|kitchen|end&seed=N renders one staged scene instead
// of the interactive game (used for the screenshots).
import { FIELD, STEP } from './config.js';
import { World, EVENT_PICKUP, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_STAGE, EVENT_OVER, EVENT_ESCAPED } from './world.js';
import { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { stageShot } from './shots.js';
import { mulberry32 } from './random.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1);

const world = new World(seed);
const input = new Input(canvas);
const sound = new Sound();

let screen = SCREEN_TITLE;
let best = 0;
let last = performance.now();
let acc = 0;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame() {
  world.reset();
  world.status = 'play';
  screen = SCREEN_PLAY;
  sound.gobble();
  announce('The escape is on. Dodge the farmer and reach the green exit.');
}

if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  world.best = best;
  resize();
  draw(ctx, world, screen);
  announce(`Screenshot scene: ${shot}.`);
} else {
  resize();
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const presses = input.consumePresses();
  if (presses.mute) {
    const muted = sound.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (screen === SCREEN_TITLE) {
    if (presses.enter || presses.clicked) startGame();
    draw(ctx, world, SCREEN_TITLE);
    return;
  }
  if (screen === SCREEN_OVER) {
    if (presses.restart || presses.enter || presses.clicked) startGame();
    draw(ctx, world, SCREEN_OVER);
    return;
  }
  acc += dt;
  let events = 0;
  while (acc >= STEP) {
    acc -= STEP;
    events |= world.step(STEP, input.read());
  }
  if (events & EVENT_PICKUP) sound.pickup();
  if (events & EVENT_SPOTTED) {
    sound.alarm();
    announce('Spotted! The farmer is chasing you!');
  }
  if (events & EVENT_CAUGHT) {
    sound.thud();
    announce(`Caught! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`);
  }
  if (events & EVENT_STAGE) {
    sound.gobble();
    announce(`Stage clear! ${world.stage.name} — keep running.`);
  }
  if (events & EVENT_OVER) {
    sound.lose();
    screen = SCREEN_OVER;
    best = Math.max(best, world.score);
    announce(`Caught! Final score ${world.score}.`);
  }
  if (events & EVENT_ESCAPED) {
    sound.win();
    screen = SCREEN_OVER;
    best = Math.max(best, world.score);
    announce(`Escaped! Final score ${world.score}.`);
  }
  draw(ctx, world, SCREEN_PLAY);
}
