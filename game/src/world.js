// Featherweight Fugitive — the rules. Pure logic, no DOM: a seeded world that the
// game loop, the unit tests and the screenshot autopilot all drive the same way.
import {
  FIELD, STEP, PLAYER, FARMER, STAGES, SCORE, LIVES, GOAL_DISTANCE,
} from './config.js';
import { mulberry32 } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_STAGE = 8;
export const EVENT_OVER = 16;
export const EVENT_ESCAPED = 32;

export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';
export const KIND_GRAVY = 'gravy';
export const KIND_KNIFE = 'knife';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Circle (x, y, r) against rect: true when they overlap. */
export function circleHitsRect(x, y, r, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
}

/** Line of sight: sample the segment; a wall rect anywhere on it blocks the view. */
export function hasLineOfSight(ax, ay, bx, by, walls) {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    for (let w = 0; w < walls.length; w += 1) {
      const r = walls[w];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return false;
    }
  }
  return true;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.reset();
  }

  reset() {
    this.stageIndex = 0;
    this.score = 0;
    this.lives = LIVES;
    this.distance = 0;
    this.time = 0;
    this.status = 'title'; // title | play | over | escaped
    this.best = 0;
    this.loadStage(0);
  }

  loadStage(index) {
    const def = STAGES[index];
    this.stage = def;
    this.rng = mulberry32((this.seed + index * 7919) >>> 0);
    this.player = {
      x: def.playerStart.x, y: def.playerStart.y,
      vx: 0, vy: 0, face: 0, hidden: false, invuln: 0, boost: 0,
    };
    this.farmer = {
      x: def.farmerStart.x, y: def.farmerStart.y,
      face: Math.PI, mode: 'patrol', waypoint: 0,
      lastSeen: null, lastSeenT: 0, searchT: 0, lookT: 0,
      windup: 0, throwT: 1.5, wander: null,
    };
    this.knives = [];
    this.pickups = [];
    for (const c of def.corn) this.pickups.push({ kind: KIND_CORN, x: c.x, y: c.y, active: true });
    for (const f of def.feathers) this.pickups.push({ kind: KIND_FEATHER, x: f.x, y: f.y, active: true });
    for (const g of def.gravy) this.pickups.push({ kind: KIND_GRAVY, x: g.x, y: g.y, active: true });
    this.laneT = def.knifeLanes.map(() => 1.2);
    this.ovenT = 0;
    this.ovenState = 'idle'; // idle | warn | burst
    this.ovenHitDone = false;
    this.stageTime = 0;
    this.alertT = 0;
    this.spotted = false;
  }

  solids() {
    // Walls + crates block movement; the oven body does too.
    const list = this.stage.walls.concat(this.stage.crates);
    if (this.stage.oven) list.push(this.stage.oven);
    return list;
  }

  playerInHay() {
    const p = this.player;
    for (const h of this.stage.hay) {
      if (p.x > h.x && p.x < h.x + h.w && p.y > h.y && p.y < h.y + h.h) return true;
    }
    return false;
  }

  moveCircle(body, dx, dy, radius) {
    const solids = this.solids();
    let nx = body.x + dx;
    let blocked = false;
    for (const s of solids) {
      if (circleHitsRect(nx, body.y, radius, s)) { blocked = true; break; }
    }
    if (!blocked) body.x = clamp(nx, radius, FIELD.width - radius);
    let ny = body.y + dy;
    blocked = false;
    for (const s of solids) {
      if (circleHitsRect(body.x, ny, radius, s)) { blocked = true; break; }
    }
    if (!blocked) body.y = clamp(ny, radius, FIELD.height - radius);
  }

  /**
   * Wall-follow assist: when a body steering at `target` barely moved, it is
   * pressing into a wall. Slide along the blocking wall toward the end nearer
   * the target, so the body walks around the wall instead of hovering there
   * forever. `ox, oy` is the position before the blocked move; `mx, my` its
   * direction. Used by the turkey (click-to-move / autopilot) and the farmer
   * (patrol / chase), who both steer in straight lines at rectangular walls.
   */
  slideAroundWall(body, radius, ox, oy, mx, my, speed, dt, target) {
    const moved = Math.hypot(body.x - ox, body.y - oy);
    // Half speed, not a hair: a body sliding along a wall at ~0.3x speed sits
    // right on a 0.3 threshold, so the assist fires one step and not the
    // next and fights the direct movement instead of routing around the wall.
    if (moved >= speed * dt * 0.5) return;
    const ix = ox + mx * speed * dt;
    const iy = oy + my * speed * dt;
    for (const s of this.solids()) {
      if (circleHitsRect(ix, iy, radius, s)) {
        const vertical = Math.abs(mx) >= Math.abs(my);
        let sx = 0;
        let sy = 0;
        if (vertical) sy = target.y < s.y + s.h / 2 ? -1 : 1;
        else sx = target.x < s.x + s.w / 2 ? -1 : 1;
        this.moveCircle(body, sx * speed * dt, sy * speed * dt, radius);
        return;
      }
    }
  }

  loseLife(events) {
    this.lives -= 1;
    this.knives.length = 0;
    if (this.lives <= 0) {
      this.status = 'over';
      return events | EVENT_OVER;
    }
    // Caught: back to the stage start, brief grace, farmer resumes his rounds.
    this.player.x = this.stage.playerStart.x;
    this.player.y = this.stage.playerStart.y;
    this.player.invuln = PLAYER.invulnSeconds;
    this.player.boost = 0;
    this.farmer.x = this.stage.farmerStart.x;
    this.farmer.y = this.stage.farmerStart.y;
    this.farmer.mode = 'patrol';
    this.farmer.waypoint = 0;
    this.farmer.windup = 0;
    this.spotted = false;
    return events | EVENT_CAUGHT;
  }

  throwKnife() {
    const f = this.farmer;
    const p = this.player;
    const lead = 0.25;
    const tx = p.x + p.vx * lead;
    const ty = p.y + p.vy * lead;
    const a = angleTo(f.x, f.y, tx, ty);
    this.knives.push({
      kind: KIND_KNIFE,
      x: f.x + Math.cos(a) * (FARMER.radius + 14),
      y: f.y + Math.sin(a) * (FARMER.radius + 14),
      vx: Math.cos(a) * FARMER.throwSpeed,
      vy: Math.sin(a) * FARMER.throwSpeed,
      angle: a, active: true,
    });
  }

  step(dt, input) {
    let events = EVENT_NONE;
    if (this.status !== 'play') return events;
    this.time += dt;
    this.stageTime += dt;
    const p = this.player;
    const f = this.farmer;
    const def = this.stage;

    // --- player movement: keys, or a mouse click target ---
    let mx = 0;
    let my = 0;
    if (input.target) {
      const dx = input.target.x - p.x;
      const dy = input.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) { mx = dx / d; my = dy / d; }
    } else {
      mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.hypot(mx, my);
      if (len > 0) { mx /= len; my /= len; }
    }
    const moving = mx !== 0 || my !== 0;
    p.hidden = this.playerInHay();
    const speed = p.boost > 0 ? PLAYER.boostSpeed : p.hidden ? PLAYER.hideSpeed : PLAYER.speed;
    p.vx = mx * speed;
    p.vy = my * speed;
    if (moving) p.face = Math.atan2(my, mx);
    const px0 = p.x;
    const py0 = p.y;
    this.moveCircle(p, p.vx * dt, p.vy * dt, PLAYER.radius);
    // Wall-follow assist for click-to-move (and the autopilot, which steers the
    // same way): a straight-line target can sit exactly behind a fence, where
    // pressing into the wall forever is a soft-lock for a mouse-only player.
    if (input.target && moving) {
      this.slideAroundWall(p, PLAYER.radius, px0, py0, mx, my, speed, dt, input.target);
    }
    // Distance is the journey, not the odometer: each stage is 500 m of the
    // 1,500 m to the forest, earned by closing on that stage's exit.
    this.distance = this.stageIndex * 500
      + clamp((p.x - def.playerStart.x) / (def.exit.x - def.playerStart.x), 0, 1) * 500;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.boost > 0) p.boost -= dt;
    if (this.alertT > 0) this.alertT -= dt;

    // --- farmer senses ---
    const dFarmer = dist(p.x, p.y, f.x, f.y);
    const hearR = p.hidden ? FARMER.hearRadius / 2 : FARMER.hearRadius;
    const inSightRange = dFarmer < FARMER.sightRadius;
    const inCone = Math.abs(angleDiff(angleTo(f.x, f.y, p.x, p.y), f.face)) < FARMER.sightHalfAngle;
    const seen = !p.hidden && p.invuln <= 0 && inSightRange && inCone
      && hasLineOfSight(f.x, f.y, p.x, p.y, this.solids());
    const heard = !p.hidden && moving && dFarmer < hearR;

    if (seen) {
      f.lastSeen = { x: p.x, y: p.y };
      f.lastSeenT = this.time;
      if (f.mode !== 'chase') {
        f.mode = 'chase';
        this.spotted = true;
        this.alertT = 1.2;
        events |= EVENT_SPOTTED;
      }
    } else if (f.mode === 'chase' && this.time - f.lastSeenT > FARMER.loseSightSeconds) {
      f.mode = 'search';
      f.searchT = FARMER.searchSeconds;
      f.wander = null;
    } else if (heard && f.mode === 'patrol') {
      f.mode = 'suspicious';
      f.lastSeen = { x: p.x, y: p.y };
      f.lookT = 1.4;
    }

    // --- farmer movement by mode ---
    let target = null;
    let fSpeed = FARMER.patrolSpeed;
    if (f.mode === 'patrol') {
      const wp = def.farmerWaypoints[f.waypoint];
      target = wp;
      fSpeed = FARMER.patrolSpeed;
      if (dist(f.x, f.y, wp.x, wp.y) < 14) f.waypoint = (f.waypoint + 1) % def.farmerWaypoints.length;
    } else if (f.mode === 'suspicious') {
      target = f.lastSeen;
      fSpeed = FARMER.suspiciousSpeed;
      if (dist(f.x, f.y, target.x, target.y) < 16) {
        f.lookT -= dt;
        if (f.lookT <= 0) { f.mode = 'patrol'; }
      }
    } else if (f.mode === 'chase') {
      target = f.lastSeen;
      fSpeed = FARMER.chaseSpeed[this.stageIndex + 1];
      // Thrown knives, telegraphed: he winds up first, so a quick turkey can dodge.
      f.throwT -= dt;
      if (f.windup > 0) {
        f.windup -= dt;
        if (f.windup <= 0) this.throwKnife();
      } else if (f.throwT <= 0 && dFarmer > 120 && dFarmer < 420) {
        f.windup = FARMER.throwWindup;
        f.throwT = FARMER.throwCooldown[this.stageIndex + 1];
      }
    } else if (f.mode === 'search') {
      fSpeed = FARMER.searchSpeed;
      if (!f.wander || dist(f.x, f.y, f.wander.x, f.wander.y) < 16) {
        f.wander = {
          x: clamp(f.lastSeen.x + (this.rng() - 0.5) * 320, 40, FIELD.width - 40),
          y: clamp(f.lastSeen.y + (this.rng() - 0.5) * 320, 40, FIELD.height - 40),
        };
      }
      target = f.wander;
      f.searchT -= dt;
      if (f.searchT <= 0) { f.mode = 'patrol'; f.wander = null; }
    }
    if (target) {
      const a = angleTo(f.x, f.y, target.x, target.y);
      // Turn toward the target, then walk: no instant snapping.
      const diff = angleDiff(a, f.face);
      const turn = clamp(diff, -3.2 * dt, 3.2 * dt);
      f.face += turn;
      if (Math.abs(diff) < 1.2) {
        const fx0 = f.x;
        const fy0 = f.y;
        const fmx = Math.cos(f.face);
        const fmy = Math.sin(f.face);
        this.moveCircle(f, fmx * fSpeed * dt, fmy * fSpeed * dt, FARMER.radius);
        // Same wall-follow as the turkey: without it the farmer wedges on a
        // fence whenever a waypoint sits straight behind one, and the patrol
        // (and the chase) dies there.
        this.slideAroundWall(f, FARMER.radius, fx0, fy0, fmx, fmy, fSpeed, dt, target);
      }
    }

    // --- farmer catches the turkey ---
    if (p.invuln <= 0 && dist(p.x, p.y, f.x, f.y) < FARMER.catchRadius + PLAYER.radius - 6) {
      events |= this.loseLife(events);
      if (this.status === 'over') return events;
    }

    // --- thrown + lane knives ---
    for (const k of this.knives) {
      if (!k.active) continue;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.angle = Math.atan2(k.vy, k.vx);
      if (k.x < -30 || k.x > FIELD.width + 30 || k.y < -30 || k.y > FIELD.height + 30) {
        k.active = false;
        continue;
      }
      let hitWall = false;
      for (const s of this.solids()) {
        if (k.x >= s.x && k.x <= s.x + s.w && k.y >= s.y && k.y <= s.y + s.h) { hitWall = true; break; }
      }
      if (hitWall) { k.active = false; continue; }
      if (p.invuln <= 0 && dist(k.x, k.y, p.x, p.y) < PLAYER.radius + 8) {
        k.active = false;
        events |= this.loseLife(events);
        if (this.status === 'over') return events;
      }
    }
    this.knives = this.knives.filter((k) => k.active);
    for (let i = 0; i < def.knifeLanes.length; i += 1) {
      this.laneT[i] -= dt;
      if (this.laneT[i] <= 0) {
        const lane = def.knifeLanes[i];
        const fromLeft = this.rng() < 0.5;
        this.knives.push({
          kind: KIND_KNIFE,
          x: fromLeft ? -20 : FIELD.width + 20, y: lane.y,
          vx: (fromLeft ? 1 : -1) * lane.speed, vy: 0,
          angle: fromLeft ? 0 : Math.PI, active: true,
        });
        this.laneT[i] = lane.every * (0.85 + this.rng() * 0.3);
      }
    }

    // --- the oven (kitchen): warn, then a burst of heat around it ---
    if (def.oven) {
      this.ovenT += dt;
      const o = def.oven;
      const cycle = o.burstEvery;
      const t = this.ovenT % cycle;
      if (t < cycle - o.burstSeconds - o.warnSeconds) {
        this.ovenState = 'idle';
      } else if (t < cycle - o.burstSeconds) {
        this.ovenState = 'warn';
      } else {
        if (this.ovenState !== 'burst') this.ovenHitDone = false;
        this.ovenState = 'burst';
      }
      if (this.ovenState === 'burst' && !this.ovenHitDone && p.invuln <= 0) {
        const glow = { x: o.x - 34, y: o.y - 34, w: o.w + 68, h: o.h + 68 };
        if (circleHitsRect(p.x, p.y, PLAYER.radius, glow)) {
          this.ovenHitDone = true;
          events |= this.loseLife(events);
          if (this.status === 'over') return events;
        }
      }
    }

    // --- pickups ---
    for (const item of this.pickups) {
      if (!item.active) continue;
      if (dist(item.x, item.y, p.x, p.y) < PLAYER.radius + 14) {
        item.active = false;
        if (item.kind === KIND_CORN) this.score += SCORE.corn;
        if (item.kind === KIND_FEATHER) this.score += SCORE.feather;
        if (item.kind === KIND_GRAVY) p.boost = PLAYER.boostSeconds;
        events |= EVENT_PICKUP;
      }
    }

    // --- the exit ---
    const ex = def.exit;
    if (p.x > ex.x - 4 && p.x < ex.x + ex.w && p.y > ex.y && p.y < ex.y + ex.h) {
      this.score += SCORE.stageClear;
      if (this.stageIndex >= STAGES.length - 1) {
        this.status = 'escaped';
        this.distance = GOAL_DISTANCE;
        return events | EVENT_ESCAPED;
      }
      this.stageIndex += 1;
      this.loadStage(this.stageIndex);
      // Keep the run's score and lives; the new stage starts fresh.
      return events | EVENT_STAGE;
    }
    return events;
  }
}
