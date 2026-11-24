import { createLevel, TOTAL_SECTORS } from './levels';
import {
  AudioEvent,
  Crate,
  GameSnapshot,
  GameWorld,
  InputState,
  LevelDefinition,
  Particle,
  ParticleKind,
  Platform,
  PlayerState,
  Rect,
  TentacleLimb,
} from './types';

const MAX_PARTICLES = 240;
const GRAVITY = 1180;
const WATER_GRAVITY = 120;
const PLAYER_RADIUS = 18;
const GRAPPLE_REACH = 310;

function createTentacles(x: number, y: number): TentacleLimb[] {
  const tentacles: TentacleLimb[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    tentacles.push({
      baseAngle: angle,
      tipX: x + Math.cos(angle) * 24,
      tipY: y + Math.sin(angle) * 24,
      targetX: x + Math.cos(angle) * 24,
      targetY: y + Math.sin(angle) * 24,
      midX: x + Math.cos(angle) * 12,
      midY: y + Math.sin(angle) * 12,
      attached: false,
    });
  }
  return tentacles;
}

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PLAYER_RADIUS,
    facing: 1,
    onGround: false,
    clingNormalX: 0,
    clingNormalY: 0,
    isClinging: false,
    inWater: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    hp: 3,
    maxHp: 3,
    invulnTimer: 0,
    hitFlashTimer: 0,
    ink: 100,
    maxInk: 100,
    camoActive: false,
    camoPattern: 'none',
    camoEfficiency: 0,
    grappleTargetId: null,
    grappleType: null,
    grappleX: x,
    grappleY: y,
    grappleLength: 0,
    grappleAnimTimer: 0,
    squashX: 1,
    squashY: 1,
    walkDistance: 0,
    inkCooldown: 0,
    tentacles: createTentacles(x, y),
  };
}

function createParticlePool(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 3,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      kind: 'bubble',
    });
  }
  return pool;
}

export function createWorld(sectorIndex = 0, bestScore = 0): GameWorld {
  const level = createLevel(sectorIndex);
  const player = createPlayer(level.spawn.x, level.spawn.y);
  return {
    phase: 'title',
    sectorIndex,
    level,
    player,
    camera: {
      x: Math.max(0, level.spawn.x - 420),
      y: Math.max(0, level.spawn.y - 360),
      trauma: 0,
      shakeX: 0,
      shakeY: 0,
    },
    hitstopTimer: 0,
    time: 0,
    runTime: 0,
    totalPearlsRun: 0,
    damageTakenRun: 0,
    score: 0,
    bestScore,
    deathReason: null,
    contextHint: null,
    inkProjectiles: Array.from({ length: 12 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 })),
    inkClouds: Array.from({ length: 12 }, () => ({ active: false, x: 0, y: 0, radius: 60, life: 0, maxLife: 3.5 })),
    shockBolts: Array.from({ length: 12 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 })),
    particles: createParticlePool(),
    particleCursor: 0,
    audioQueue: [],
    sectorBannerTimer: 2.8,
    checkpointReached: false,
  };
}

export function resetSectorWorld(world: GameWorld, sectorIndex: number, keepScore = false): void {
  const level = createLevel(sectorIndex);
  const prevBest = world.bestScore;
  const prevScore = keepScore ? world.score : 0;
  const prevPearls = keepScore ? world.totalPearlsRun : 0;
  const prevDmg = keepScore ? world.damageTakenRun : 0;
  const prevTime = keepScore ? world.runTime : 0;

  world.sectorIndex = sectorIndex;
  world.level = level;
  world.player = createPlayer(level.spawn.x, level.spawn.y);
  world.camera.x = Math.max(0, level.spawn.x - 420);
  world.camera.y = Math.max(0, level.spawn.y - 360);
  world.camera.trauma = 0;
  world.hitstopTimer = 0;
  world.runTime = prevTime;
  world.totalPearlsRun = prevPearls;
  world.damageTakenRun = prevDmg;
  world.score = prevScore;
  world.bestScore = prevBest;
  world.deathReason = null;
  world.contextHint = null;
  world.sectorBannerTimer = 2.8;
  world.checkpointReached = false;

  for (const p of world.inkProjectiles) p.active = false;
  for (const c of world.inkClouds) c.active = false;
  for (const b of world.shockBolts) b.active = false;
  for (const pt of world.particles) pt.active = false;
}

export function spawnParticles(
  world: GameWorld,
  x: number,
  y: number,
  count: number,
  kind: ParticleKind,
  color: string,
  speedMin = 40,
  speedMax = 160,
  sizeMin = 3,
  sizeMax = 7,
  life = 0.55
): void {
  for (let i = 0; i < count; i++) {
    const p = world.particles[world.particleCursor];
    world.particleCursor = (world.particleCursor + 1) % MAX_PARTICLES;
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - (kind === 'bubble' ? 55 : 0);
    p.size = sizeMin + Math.random() * (sizeMax - sizeMin);
    p.life = life * (0.7 + Math.random() * 0.6);
    p.maxLife = p.life;
    p.color = color;
    p.kind = kind;
  }
}

function pushAudio(world: GameWorld, ev: AudioEvent): void {
  world.audioQueue.push(ev);
}

export function getEffectivePlatformRect(p: Platform): Rect {
  if (!p.doorId) return p;
  const progress = p.openProgress ?? 0;
  const offset = (p.openOffsetY ?? -180) * progress;
  return { x: p.x, y: p.y + offset, w: p.w, h: p.h };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(cx: number, cy: number, r: number, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function segmentIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: Rect): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;

  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return true;
  }
  return false;
}

export function hasLineOfSight(world: GameWorld, x1: number, y1: number, x2: number, y2: number): boolean {
  for (const plat of world.level.platforms) {
    const rect = getEffectivePlatformRect(plat);
    if (segmentIntersectsRect(x1, y1, x2, y2, rect)) return false;
  }
  for (const cloud of world.inkClouds) {
    if (!cloud.active) continue;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > 0.001) {
      const t = Math.max(0, Math.min(1, ((cloud.x - x1) * dx + (cloud.y - y1) * dy) / lenSq));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const distSq = (px - cloud.x) ** 2 + (py - cloud.y) ** 2;
      if (distSq < cloud.radius * cloud.radius) return false;
    }
  }
  return true;
}

export function computeCamoState(world: GameWorld): { pattern: PlayerState['camoPattern']; efficiency: number } {
  const { player, level } = world;
  if (!player.camoActive) {
    return { pattern: 'none', efficiency: 0 };
  }
  const speed = Math.hypot(player.vx, player.vy);
  let pattern: PlayerState['camoPattern'] = 'steel';
  let onCover = false;

  for (const cover of level.camoCovers) {
    if (circleRectOverlap(player.x, player.y, player.radius + 6, cover)) {
      pattern = cover.pattern;
      onCover = true;
      break;
    }
  }

  let efficiency = onCover ? 0.96 : 0.78;
  if (player.inWater) efficiency = Math.max(efficiency, 0.85);
  if (speed > 140) efficiency *= 0.45;
  else if (speed > 35) efficiency *= 0.75;
  else if (onCover) efficiency = 1.0;

  return { pattern, efficiency };
}

function toggleTargets(level: LevelDefinition, targetIds: string[], activate: boolean): void {
  for (const plat of level.platforms) {
    if (plat.doorId && targetIds.includes(plat.doorId)) {
      plat.isOpen = activate;
    }
  }
  for (const eh of level.electricHazards) {
    if (targetIds.includes(eh.trapId)) {
      eh.active = !activate;
    }
  }
}

export function damagePlayer(world: GameWorld, amount: number, knockX: number, knockY: number, reason: string): void {
  const { player } = world;
  if (player.invulnTimer > 0 || world.phase !== 'playing') return;

  player.hp = Math.max(0, player.hp - amount);
  player.invulnTimer = 1.25;
  player.hitFlashTimer = 0.08;
  player.camoActive = false;
  player.grappleTargetId = null;
  player.grappleType = null;
  player.vx = knockX;
  player.vy = knockY;
  world.damageTakenRun += amount;
  world.hitstopTimer = 0.06;
  world.camera.trauma = Math.min(1, world.camera.trauma + 0.55);
  spawnParticles(world, player.x, player.y, 18, 'spark', '#ff6b4a', 80, 240, 3, 7, 0.45);
  pushAudio(world, { type: 'hurt' });

  if (player.hp <= 0) {
    world.phase = 'gameover';
    world.deathReason = reason;
    world.bestScore = Math.max(world.bestScore, world.score);
    pushAudio(world, { type: 'gameover' });
  }
}

function resolveCircleWorldCollisions(world: GameWorld, dt: number): { conveyorVx: number } {
  const { player, level } = world;
  const r = player.radius;
  const wasOnGround = player.onGround;
  player.onGround = false;
  player.clingNormalX = 0;
  player.clingNormalY = 0;
  let conveyorVx = 0;

  const solids: { rect: Rect; conveyorSpeed?: number }[] = [];
  for (const p of level.platforms) {
    solids.push({ rect: getEffectivePlatformRect(p), conveyorSpeed: p.conveyorSpeed });
  }
  for (const c of level.crates) {
    solids.push({ rect: c });
  }

  for (const { rect, conveyorSpeed } of solids) {
    const closestX = Math.max(rect.x, Math.min(player.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(player.y, rect.y + rect.h));
    const dx = player.x - closestX;
    const dy = player.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq);
      let nx = 0;
      let ny = 0;
      let overlap = 0;

      if (dist > 0.0001) {
        nx = dx / dist;
        ny = dy / dist;
        overlap = r - dist;
      } else {
        // Inside rect center fallback: push out along shallowest axis
        const leftPen = player.x - rect.x;
        const rightPen = rect.x + rect.w - player.x;
        const topPen = player.y - rect.y;
        const bottomPen = rect.y + rect.h - player.y;
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === topPen) {
          nx = 0;
          ny = -1;
          overlap = topPen + r;
        } else if (minPen === bottomPen) {
          nx = 0;
          ny = 1;
          overlap = bottomPen + r;
        } else if (minPen === leftPen) {
          nx = -1;
          ny = 0;
          overlap = leftPen + r;
        } else {
          nx = 1;
          ny = 0;
          overlap = rightPen + r;
        }
      }

      player.x += nx * overlap;
      player.y += ny * overlap;

      const vn = player.vx * nx + player.vy * ny;
      if (vn < 0) {
        player.vx -= vn * nx;
        player.vy -= vn * ny;
      }

      if (ny < -0.65) {
        player.onGround = true;
        player.clingNormalY = 1;
        if (conveyorSpeed) conveyorVx = conveyorSpeed;
      } else if (ny > 0.65) {
        player.clingNormalY = -1;
      }
      if (Math.abs(nx) > 0.65) {
        player.clingNormalX = nx > 0 ? 1 : -1;
      }
    }
  }

  // Also check 3px proximity sensor for clinging on walls/ceilings while crawling
  if (!player.onGround && player.clingNormalX === 0 && player.clingNormalY === 0) {
    const probe = r + 5;
    for (const { rect } of solids) {
      if (player.vy <= 30 && player.x > rect.x && player.x < rect.x + rect.w && Math.abs((rect.y + rect.h) - player.y) < probe && player.y > rect.y + rect.h) {
        player.clingNormalY = -1;
        break;
      }
      if (player.y > rect.y && player.y < rect.y + rect.h) {
        if (Math.abs(player.x - (rect.x + rect.w)) < probe) {
          player.clingNormalX = 1;
          break;
        }
        if (Math.abs(rect.x - player.x) < probe) {
          player.clingNormalX = -1;
          break;
        }
      }
    }
  }

  if (!wasOnGround && player.onGround && !player.inWater) {
    player.squashX = 1.24;
    player.squashY = 0.76;
    spawnParticles(world, player.x, player.y + r, 5, 'water', '#8bd3dd', 30, 90, 2, 4, 0.3);
    pushAudio(world, { type: 'land' });
  }

  // Clamp inside world bounds
  player.x = Math.max(r, Math.min(level.width - r, player.x));
  player.y = Math.max(r, Math.min(level.height - r, player.y));
  void dt;
  return { conveyorVx };
}

function updateCrates(world: GameWorld, dt: number): void {
  const { player, level } = world;
  for (const crate of level.crates) {
    // Player pushing crate horizontally on land
    if (circleRectOverlap(player.x, player.y, player.radius + 2, crate)) {
      const pushDir = player.x < crate.x + crate.w * 0.5 ? 1 : -1;
      if (Math.abs(player.y - (crate.y + crate.h * 0.5)) < crate.h * 0.6) {
        crate.vx += pushDir * 320 * dt;
      }
    }

    crate.vy += GRAVITY * dt;
    crate.vx *= Math.pow(0.02, dt);
    crate.x += crate.vx * dt;
    crate.y += crate.vy * dt;
    crate.onGround = false;

    for (const plat of level.platforms) {
      const rect = getEffectivePlatformRect(plat);
      if (rectsOverlap(crate, rect)) {
        const prevBottom = crate.y + crate.h - crate.vy * dt;
        if (prevBottom <= rect.y + 12 && crate.vy >= 0) {
          crate.y = rect.y - crate.h;
          crate.vy = 0;
          crate.onGround = true;
          if (plat.conveyorSpeed) {
            crate.x += plat.conveyorSpeed * dt;
          }
        } else {
          const overlapLeft = crate.x + crate.w - rect.x;
          const overlapRight = rect.x + rect.w - crate.x;
          if (overlapLeft < overlapRight) {
            crate.x = rect.x - crate.w;
          } else {
            crate.x = rect.x + rect.w;
          }
          crate.vx = 0;
        }
      }
    }

    crate.x = Math.max(40, Math.min(level.width - 40 - crate.w, crate.x));
  }

  // Update pressure plates
  for (const plate of level.plates) {
    const wasPressed = plate.pressed;
    let isPressed = false;
    const plateZone: Rect = { x: plate.x, y: plate.y - 16, w: plate.w, h: 26 };
    for (const crate of level.crates) {
      if (rectsOverlap(crate, plateZone)) {
        isPressed = true;
        break;
      }
    }
    if (circleRectOverlap(player.x, player.y, player.radius, plateZone)) {
      isPressed = true;
    }
    plate.pressed = isPressed;
    toggleTargets(level, plate.targetIds, isPressed);
    if (!wasPressed && isPressed) {
      pushAudio(world, { type: 'plate' });
    }
  }
}

function updateTentacles(world: GameWorld, dt: number): void {
  const { player, level } = world;
  const speed = Math.hypot(player.vx, player.vy);
  player.walkDistance += speed * dt;

  for (let i = 0; i < player.tentacles.length; i++) {
    const t = player.tentacles[i];
    const spreadAngle =
      player.inWater
        ? t.baseAngle + Math.sin(world.time * 4.5 + i * 0.9) * 0.45
        : Math.PI * 0.15 + (i / 7) * Math.PI * 0.7 + Math.sin(player.walkDistance * 0.08 + i * 1.4) * 0.25;

    let reach = player.inWater ? 28 : 26;
    let tx = player.x + Math.cos(spreadAngle) * reach;
    let ty = player.y + Math.sin(spreadAngle) * reach;
    t.attached = false;

    if (player.isClinging && !player.inWater) {
      if (player.clingNormalX !== 0) {
        tx = player.x - player.clingNormalX * 22;
        ty = player.y + (i - 3.5) * 6 + Math.sin(player.walkDistance * 0.1 + i) * 4;
        t.attached = true;
      } else if (player.clingNormalY === -1) {
        tx = player.x + (i - 3.5) * 7 + Math.sin(player.walkDistance * 0.1 + i) * 4;
        ty = player.y - 22;
        t.attached = true;
      }
    } else if (player.onGround && i >= 1 && i <= 6) {
      const stepOffset = Math.sin(player.walkDistance * 0.09 + i * 1.3);
      tx = player.x + (i - 3.5) * 7 + stepOffset * 5;
      ty = player.y + player.radius + (stepOffset > 0 ? 1 : -4);
      t.attached = stepOffset > 0;
    }

    if (player.grappleTargetId && i === 0) {
      tx = player.grappleX;
      ty = player.grappleY;
      t.attached = true;
    }

    t.targetX = tx;
    t.targetY = ty;
    const lerp = 1 - Math.exp(-18 * dt);
    t.tipX += (t.targetX - t.tipX) * lerp;
    t.tipY += (t.targetY - t.tipY) * lerp;

    const midWave = Math.sin(world.time * 6 + i * 1.1) * (player.inWater ? 7 : 3);
    t.midX = (player.x + t.tipX) * 0.5 + (player.facing * -4) + midWave * 0.5;
    t.midY = (player.y + t.tipY) * 0.5 + (player.inWater ? midWave : -4);
    void level;
  }
}

function findNearestInteractable(world: GameWorld, input: InputState): {
  type: 'lever' | 'crate' | 'ring';
  id: string;
  x: number;
  y: number;
  label: string;
  dist: number;
} | null {
  const { player, level } = world;
  const refX = input.hasPointerAim ? input.aimWorldX : player.x + player.facing * 60;
  const refY = input.hasPointerAim ? input.aimWorldY : player.y - 20;

  let best: { type: 'lever' | 'crate' | 'ring'; id: string; x: number; y: number; label: string; dist: number; score: number } | null = null;

  for (const lever of level.levers) {
    const dist = Math.hypot(lever.x - player.x, lever.y - 22 - player.y);
    if (dist <= GRAPPLE_REACH) {
      const aimDist = Math.hypot(lever.x - refX, lever.y - refY);
      const score = dist * 0.6 + aimDist * 0.4;
      if (!best || score < best.score) {
        best = { type: 'lever', id: lever.id, x: lever.x, y: lever.y - 22, label: `[E] ${lever.label}`, dist, score };
      }
    }
  }

  for (const crate of level.crates) {
    const cx = crate.x + crate.w * 0.5;
    const cy = crate.y + crate.h * 0.5;
    const dist = Math.hypot(cx - player.x, cy - player.y);
    if (dist <= GRAPPLE_REACH) {
      const aimDist = Math.hypot(cx - refX, cy - refY);
      const score = dist * 0.65 + aimDist * 0.35;
      if (!best || score < best.score) {
        best = { type: 'crate', id: crate.id, x: cx, y: cy, label: '[E] Pull Crate', dist, score };
      }
    }
  }

  for (const ring of level.grappleRings) {
    const dist = Math.hypot(ring.x - player.x, ring.y - player.y);
    if (dist <= GRAPPLE_REACH) {
      const aimDist = Math.hypot(ring.x - refX, ring.y - refY);
      const score = dist * 0.55 + aimDist * 0.45;
      if (!best || score < best.score) {
        best = { type: 'ring', id: ring.id, x: ring.x, y: ring.y, label: '[E] Grapple Swing', dist, score };
      }
    }
  }

  return best;
}

export function stepWorld(world: GameWorld, input: InputState, rawDt: number): void {
  const dt = Math.min(rawDt, 0.05);
  world.time += dt;

  // Camera shake decays even during hitstop or gameover
  if (world.camera.trauma > 0) {
    world.camera.trauma = Math.max(0, world.camera.trauma - 1.65 * dt);
    const shake = world.camera.trauma * world.camera.trauma * 16;
    world.camera.shakeX = (Math.random() * 2 - 1) * shake;
    world.camera.shakeY = (Math.random() * 2 - 1) * shake;
  } else {
    world.camera.shakeX = 0;
    world.camera.shakeY = 0;
  }

  if (world.player.hitFlashTimer > 0) {
    world.player.hitFlashTimer = Math.max(0, world.player.hitFlashTimer - dt);
  }
  for (const d of world.level.drones) {
    if (d.hitFlashTimer > 0) d.hitFlashTimer = Math.max(0, d.hitFlashTimer - dt);
  }

  // Title screen gentle ambient animation
  if (world.phase === 'title') {
    const { player, level } = world;
    player.inWater = true;
    updateTentacles(world, dt);
    if (Math.random() < dt * 4) {
      spawnParticles(world, player.x + (Math.random() - 0.5) * 60, player.y + 10, 1, 'bubble', '#7dd3fc', 8, 25, 2, 5, 1.4);
    }
    updateParticles(world, dt);
    for (const cam of level.cameras) {
      cam.currentAngle = cam.baseAngle + Math.sin(world.time * cam.sweepSpeed) * cam.sweepRange;
    }
    const targetCamX = Math.max(0, Math.min(level.width - 1280, player.x - 360 + Math.sin(world.time * 0.35) * 40));
    const targetCamY = Math.max(0, Math.min(level.height - 720, player.y - 460));
    world.camera.x += (targetCamX - world.camera.x) * (1 - Math.exp(-3 * dt));
    world.camera.y += (targetCamY - world.camera.y) * (1 - Math.exp(-3 * dt));
    return;
  }

  if (world.phase !== 'playing') {
    return;
  }

  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return;
  }

  world.runTime += dt;
  if (world.sectorBannerTimer > 0) {
    world.sectorBannerTimer = Math.max(0, world.sectorBannerTimer - dt);
  }

  const { player, level } = world;

  // Timers & squash recovery
  if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  if (player.inkCooldown > 0) player.inkCooldown = Math.max(0, player.inkCooldown - dt);
  if (player.grappleAnimTimer > 0) player.grappleAnimTimer = Math.max(0, player.grappleAnimTimer - dt);

  player.squashX += (1 - player.squashX) * (1 - Math.exp(-14 * dt));
  player.squashY += (1 - player.squashY) * (1 - Math.exp(-14 * dt));

  // Check water overlap
  const wasInWater = player.inWater;
  player.inWater = false;
  for (const wz of level.waterZones) {
    if (circleRectOverlap(player.x, player.y, player.radius * 0.6, wz)) {
      player.inWater = true;
      break;
    }
  }
  if (wasInWater !== player.inWater) {
    spawnParticles(world, player.x, player.y, 10, 'water', '#7dd3fc', 50, 160, 2, 5, 0.45);
    pushAudio(world, { type: 'splash' });
  }

  // Ink regeneration (faster underwater)
  player.ink = Math.min(player.maxInk, player.ink + (player.inWater ? 24 : 10) * dt);

  // Camouflage toggle
  const prevCamo = player.camoActive;
  if (input.camoJustPressed) {
    player.camoActive = !player.camoActive;
  }
  if (!prevCamo && player.camoActive) {
    spawnParticles(world, player.x, player.y, 8, 'camo', '#38bdf8', 30, 80, 2, 4, 0.35);
    pushAudio(world, { type: 'camo_on' });
  } else if (prevCamo && !player.camoActive) {
    pushAudio(world, { type: 'camo_off' });
  }

  const camoInfo = computeCamoState(world);
  player.camoPattern = camoInfo.pattern;
  player.camoEfficiency = camoInfo.efficiency;

  // Input direction
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (moveX !== 0) player.facing = moveX > 0 ? 1 : -1;

  // Jump buffering & coyote time
  if (input.jumpJustPressed) {
    player.jumpBufferTimer = 0.13;
  } else if (player.jumpBufferTimer > 0) {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  if (player.onGround || player.isClinging) {
    player.coyoteTimer = 0.11;
  } else if (player.coyoteTimer > 0) {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  // Tentacle Grapple / Interact
  const nearest = findNearestInteractable(world, input);
  world.contextHint = nearest ? nearest.label : null;

  if (input.grabJustPressed && nearest) {
    if (nearest.type === 'lever') {
      const lever = level.levers.find((l) => l.id === nearest.id);
      if (lever) {
        const firstTime = !lever.activated;
        lever.activated = !lever.activated;
        toggleTargets(level, lever.targetIds, lever.activated);
        player.grappleX = lever.x;
        player.grappleY = lever.y - 22;
        player.grappleAnimTimer = 0.25;
        spawnParticles(world, lever.x, lever.y - 20, 10, 'spark', '#fbbf24', 50, 140, 2, 4, 0.35);
        pushAudio(world, { type: 'lever' });
        if (firstTime) world.score += 75;
      }
    } else if (nearest.type === 'crate' || nearest.type === 'ring') {
      player.grappleTargetId = nearest.id;
      player.grappleType = nearest.type;
      player.grappleX = nearest.x;
      player.grappleY = nearest.y;
      player.grappleLength = Math.max(60, Math.min(220, nearest.dist));
      pushAudio(world, { type: 'grapple' });
    }
  }

  if (!input.grabHeld) {
    if (player.grappleType === 'ring' || player.grappleType === 'crate') {
      player.grappleTargetId = null;
      player.grappleType = null;
    }
  }

  // Apply active grapple physics
  if (player.grappleTargetId && player.grappleType === 'crate') {
    const crate: Crate | undefined = level.crates.find((c) => c.id === player.grappleTargetId);
    if (crate) {
      const cx = crate.x + crate.w * 0.5;
      const cy = crate.y + crate.h * 0.5;
      player.grappleX = cx;
      player.grappleY = cy;
      const dx = player.x - cx;
      const dy = player.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > GRAPPLE_REACH + 40) {
        player.grappleTargetId = null;
        player.grappleType = null;
      } else if (dist > 45) {
        crate.vx += (dx / dist) * 680 * dt;
        if (dy < -30 && crate.onGround) {
          crate.vy = -210;
        }
      }
    }
  } else if (player.grappleTargetId && player.grappleType === 'ring') {
    const ring = level.grappleRings.find((r) => r.id === player.grappleTargetId);
    if (ring) {
      player.grappleX = ring.x;
      player.grappleY = ring.y;
      const dx = ring.x - player.x;
      const dy = ring.y - player.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      // Pull upward/inward like a taut octopus swing tentacle
      const pullStrength = dist > 75 ? 1900 : 850;
      player.vx += (dx / dist) * pullStrength * dt + moveX * 540 * dt;
      player.vy += (dy / dist) * pullStrength * dt;
      // Shorten rope slightly when holding Up
      if (moveY < 0) player.vy -= 420 * dt;
    }
  }

  // Ink Blast Firing
  if (input.inkJustPressed && player.ink >= 24 && player.inkCooldown <= 0) {
    const slot = world.inkProjectiles.find((p) => !p.active);
    if (slot) {
      player.ink -= 24;
      player.inkCooldown = 0.28;
      let dirX = player.facing;
      let dirY = -0.25;
      if (input.hasPointerAim) {
        const dx = input.aimWorldX - player.x;
        const dy = input.aimWorldY - player.y;
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          dirX = dx / len;
          dirY = dy / len;
        }
      }
      const speed = 640;
      slot.active = true;
      slot.x = player.x + dirX * 20;
      slot.y = player.y + dirY * 20;
      slot.vx = dirX * speed;
      slot.vy = dirY * speed;
      slot.life = 1.6;
      player.squashX = 0.85;
      player.squashY = 1.15;
      spawnParticles(world, slot.x, slot.y, 7, 'ink', '#1e1b4b', 40, 130, 3, 6, 0.35);
      pushAudio(world, { type: 'ink_fire' });
    }
  }

  // Movement: Swimming vs Wall/Ceiling Cling vs Ground/Air
  const clingingAllowed = !player.inWater && (player.clingNormalX !== 0 || player.clingNormalY === -1) && !input.down;
  player.isClinging = clingingAllowed && (input.left || input.right || input.up || player.clingNormalY === -1 || player.clingNormalX !== 0);

  if (player.inWater) {
    player.isClinging = false;
    const swimAccel = 1150;
    player.vx += moveX * swimAccel * dt;
    player.vy += moveY * swimAccel * dt + WATER_GRAVITY * dt;
    if (player.jumpBufferTimer > 0) {
      player.vy = -370;
      player.vx += moveX * 140;
      player.jumpBufferTimer = 0;
      player.squashX = 0.82;
      player.squashY = 1.2;
      spawnParticles(world, player.x, player.y + 10, 6, 'bubble', '#7dd3fc', 30, 90, 2, 5, 0.5);
      pushAudio(world, { type: 'jump' });
    }
    const drag = Math.pow(0.06, dt);
    player.vx *= drag;
    player.vy *= drag;
  } else if (player.isClinging && player.grappleType !== 'ring') {
    const climbSpeed = 230;
    if (player.clingNormalX !== 0) {
      player.vy = moveY * climbSpeed;
      // Stay gently suctioned to wall unless moving away
      if (moveX === player.clingNormalX) {
        player.vx = moveX * 250;
      } else {
        player.vx = -player.clingNormalX * 40;
      }
    } else if (player.clingNormalY === -1) {
      player.vx = moveX * climbSpeed;
      player.vy = -45; // suction against ceiling
    }

    if (player.jumpBufferTimer > 0) {
      player.jumpBufferTimer = 0;
      player.coyoteTimer = 0;
      player.isClinging = false;
      if (player.clingNormalX !== 0) {
        player.vx = player.clingNormalX * 330;
        player.vy = -470;
      } else {
        player.y += 8;
        player.vy = 160;
      }
      player.squashX = 0.84;
      player.squashY = 1.18;
      pushAudio(world, { type: 'jump' });
    }
  } else {
    // Ground / Air platforming
    const targetVx = moveX * (player.camoActive ? 175 : 275);
    const accel = player.onGround ? 18 : 11;
    player.vx += (targetVx - player.vx) * (1 - Math.exp(-accel * dt));
    player.vy += GRAVITY * dt;

    if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
      player.vy = -535;
      player.jumpBufferTimer = 0;
      player.coyoteTimer = 0;
      player.onGround = false;
      player.grappleTargetId = null;
      player.grappleType = null;
      player.squashX = 0.82;
      player.squashY = 1.2;
      spawnParticles(world, player.x, player.y + player.radius, 5, 'water', '#94a3b8', 30, 80, 2, 4, 0.3);
      pushAudio(world, { type: 'jump' });
    }
    if (input.jumpJustReleased && player.vy < -140) {
      player.vy *= 0.45;
    }
  }

  // Clamp terminal speed
  player.vx = Math.max(-520, Math.min(520, player.vx));
  player.vy = Math.max(-680, Math.min(680, player.vy));

  // Integrate player & resolve solid collisions
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const { conveyorVx } = resolveCircleWorldCollisions(world, dt);
  if (conveyorVx !== 0) {
    player.x += conveyorVx * dt;
    resolveCircleWorldCollisions(world, dt);
  }

  // Animate sliding doors smoothly
  for (const plat of level.platforms) {
    if (plat.doorId) {
      const target = plat.isOpen ? 1 : 0;
      const cur = plat.openProgress ?? 0;
      plat.openProgress = cur + (target - cur) * (1 - Math.exp(-8 * dt));
    }
  }

  updateCrates(world, dt);

  // Update Ink Projectiles
  for (const proj of world.inkProjectiles) {
    if (!proj.active) continue;
    proj.life -= dt;
    proj.vy += 260 * dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.life <= 0) {
      proj.active = false;
      continue;
    }

    let hit = false;

    // Hit Security Cameras
    for (const cam of level.cameras) {
      if (Math.hypot(proj.x - cam.x, proj.y - cam.y) < 34) {
        cam.blindTimer = 6.0;
        cam.suspicion = 0;
        cam.windupTimer = 0;
        cam.alertState = 'blinded';
        world.score += 50;
        hit = true;
        spawnParticles(world, cam.x, cam.y, 16, 'ink', '#312e81', 50, 170, 3, 7, 0.55);
        pushAudio(world, { type: 'ink_splat' });
        break;
      }
    }

    // Hit Patrol Drones
    if (!hit) {
      for (const drone of level.drones) {
        if (Math.hypot(proj.x - drone.x, proj.y - drone.y) < 34) {
          drone.blindTimer = 4.5;
          drone.suspicion = 0;
          drone.windupTimer = 0;
          drone.hitFlashTimer = 0.08;
          drone.alertState = 'blinded';
          world.score += 50;
          hit = true;
          spawnParticles(world, drone.x, drone.y, 18, 'ink', '#312e81', 60, 190, 3, 7, 0.55);
          pushAudio(world, { type: 'ink_splat' });
          break;
        }
      }
    }

    // Hit Platforms -> spawn Ink Cloud
    if (!hit) {
      for (const plat of level.platforms) {
        const rect = getEffectivePlatformRect(plat);
        if (circleRectOverlap(proj.x, proj.y, 6, rect)) {
          hit = true;
          const cloud = world.inkClouds.find((c) => !c.active);
          if (cloud) {
            cloud.active = true;
            cloud.x = proj.x;
            cloud.y = proj.y;
            cloud.radius = 66;
            cloud.life = 3.8;
            cloud.maxLife = 3.8;
          }
          spawnParticles(world, proj.x, proj.y, 12, 'ink', '#1e1b4b', 40, 140, 3, 6, 0.5);
          pushAudio(world, { type: 'ink_splat' });
          break;
        }
      }
    }

    if (hit) proj.active = false;
  }

  // Update Ink Clouds
  for (const cloud of world.inkClouds) {
    if (!cloud.active) continue;
    cloud.life -= dt;
    if (cloud.life <= 0) cloud.active = false;
  }

  // Update Security Cameras (Archetype 1: Sweeping Optic Sentry)
  for (const cam of level.cameras) {
    if (cam.fireCooldown > 0) cam.fireCooldown = Math.max(0, cam.fireCooldown - dt);
    if (cam.blindTimer > 0) {
      cam.blindTimer = Math.max(0, cam.blindTimer - dt);
      cam.alertState = 'blinded';
      cam.suspicion = 0;
      continue;
    }

    const dx = player.x - cam.x;
    const dy = player.y - cam.y;
    const dist = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);
    let angleDiff = Math.abs(Math.atan2(Math.sin(angleToPlayer - cam.currentAngle), Math.cos(angleToPlayer - cam.currentAngle)));

    const inCone = dist < cam.range && angleDiff < cam.fov && hasLineOfSight(world, cam.x, cam.y, player.x, player.y);
    const visible = inCone && player.camoEfficiency < 0.92;

    if (cam.alertState === 'windup') {
      cam.windupTimer -= dt;
      // Track player slightly during windup
      cam.currentAngle += Math.atan2(Math.sin(angleToPlayer - cam.currentAngle), Math.cos(angleToPlayer - cam.currentAngle)) * 3 * dt;
      if (!visible && cam.windupTimer > 0.25) {
        cam.alertState = 'suspicious';
      } else if (cam.windupTimer <= 0) {
        const bolt = world.shockBolts.find((b) => !b.active);
        if (bolt) {
          const aimA = Math.atan2(player.y - cam.y, player.x - cam.x);
          bolt.active = true;
          bolt.x = cam.x + Math.cos(aimA) * 18;
          bolt.y = cam.y + Math.sin(aimA) * 18;
          bolt.vx = Math.cos(aimA) * 520;
          bolt.vy = Math.sin(aimA) * 520;
          bolt.life = 1.4;
        }
        cam.fireCooldown = 1.3;
        cam.suspicion = 0.55;
        cam.alertState = 'suspicious';
      }
    } else {
      if (visible) {
        const detectRate = (1 - player.camoEfficiency) * 1.45;
        cam.suspicion = Math.min(1, cam.suspicion + detectRate * dt);
        if (cam.suspicion >= 1 && cam.fireCooldown <= 0) {
          cam.alertState = 'windup';
          cam.windupTimer = 0.6;
          pushAudio(world, { type: 'alert_windup' });
        } else {
          cam.alertState = cam.suspicion > 0.18 ? 'suspicious' : 'patrol';
        }
      } else {
        cam.suspicion = Math.max(0, cam.suspicion - 0.65 * dt);
        cam.alertState = cam.suspicion > 0.15 ? 'suspicious' : 'patrol';
        cam.currentAngle = cam.baseAngle + Math.sin(world.time * cam.sweepSpeed) * cam.sweepRange;
      }
    }
  }

  // Update Patrol Drones (Archetype 2: Hovering Charger Sentry)
  for (const drone of level.drones) {
    if (drone.blindTimer > 0) {
      drone.blindTimer = Math.max(0, drone.blindTimer - dt);
      drone.alertState = 'blinded';
      drone.suspicion = 0;
      drone.y = drone.baseY + Math.sin(world.time * 5) * 6;
      continue;
    }

    const dx = player.x - drone.x;
    const dy = player.y - drone.y;
    const inScan =
      dy > 0 &&
      dy < drone.scanRange &&
      Math.abs(dx) < drone.scanHalfWidth + (dy / drone.scanRange) * 35 &&
      hasLineOfSight(world, drone.x, drone.y, player.x, player.y);
    const visible = inScan && player.camoEfficiency < 0.9;

    if (drone.alertState === 'windup') {
      drone.windupTimer -= dt;
      drone.facing = dx >= 0 ? 1 : -1;
      if (drone.windupTimer <= 0) {
        drone.alertState = 'dashing';
        drone.dashTimer = 0.55;
        const len = Math.max(1, Math.hypot(dx, dy));
        drone.vx = (dx / len) * 390;
        drone.vy = (dy / len) * 390;
      }
    } else if (drone.alertState === 'dashing') {
      drone.dashTimer -= dt;
      drone.x += drone.vx * dt;
      drone.y += drone.vy * dt;
      if (Math.hypot(player.x - drone.x, player.y - drone.y) < player.radius + 20) {
        damagePlayer(world, 1, (dx >= 0 ? 1 : -1) * 260, -280, 'Intercepted by UFOOD Patrol Drone');
        drone.dashTimer = 0;
      }
      if (drone.dashTimer <= 0) {
        drone.alertState = 'patrol';
        drone.suspicion = 0.2;
      }
    } else {
      // Return smoothly toward patrol altitude & sweep
      drone.y += (drone.baseY + Math.sin(world.time * 2.8) * 8 - drone.y) * (1 - Math.exp(-4 * dt));
      drone.x += drone.facing * drone.speed * dt;
      if (drone.x >= drone.maxX) {
        drone.x = drone.maxX;
        drone.facing = -1;
      } else if (drone.x <= drone.minX) {
        drone.x = drone.minX;
        drone.facing = 1;
      }

      if (visible) {
        const rate = (1 - player.camoEfficiency) * 1.65;
        drone.suspicion = Math.min(1, drone.suspicion + rate * dt);
        if (drone.suspicion >= 1) {
          drone.alertState = 'windup';
          drone.windupTimer = 0.55;
          pushAudio(world, { type: 'alert_windup' });
        } else {
          drone.alertState = 'suspicious';
        }
      } else {
        drone.suspicion = Math.max(0, drone.suspicion - 0.7 * dt);
        drone.alertState = drone.suspicion > 0.15 ? 'suspicious' : 'patrol';
      }
    }
  }

  // Update Shock Bolts
  for (const bolt of world.shockBolts) {
    if (!bolt.active) continue;
    bolt.life -= dt;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (bolt.life <= 0) {
      bolt.active = false;
      continue;
    }
    if (Math.hypot(bolt.x - player.x, bolt.y - player.y) < player.radius + 8) {
      bolt.active = false;
      damagePlayer(world, 1, (bolt.vx >= 0 ? 1 : -1) * 230, -240, 'Stunned by Security Turret');
      continue;
    }
    for (const plat of level.platforms) {
      if (circleRectOverlap(bolt.x, bolt.y, 5, getEffectivePlatformRect(plat))) {
        bolt.active = false;
        spawnParticles(world, bolt.x, bolt.y, 8, 'spark', '#ef4444', 40, 130, 2, 4, 0.3);
        break;
      }
    }
  }

  // Update Crushers (Archetype 3: Industrial Pressurizer)
  for (const c of level.crushers) {
    if (!c.active) continue;
    const prevState = c.state;
    const phase = ((world.time + c.phaseOffset) % c.period) / c.period;
    if (phase < 0.35) {
      c.state = 'retracted';
      c.currentExtend = Math.max(0, c.currentExtend - 2.6 * dt);
    } else if (phase < 0.55) {
      c.state = 'telegraph';
      c.currentExtend = Math.max(0, c.currentExtend - 2.6 * dt);
    } else if (phase < 0.72) {
      c.state = 'slamming';
      c.currentExtend = Math.min(1, c.currentExtend + 7.5 * dt);
      if (prevState !== 'slamming') {
        world.camera.trauma = Math.min(1, world.camera.trauma + 0.18);
        pushAudio(world, { type: 'crusher_slam', intensity: 0.7 });
      }
    } else {
      c.state = 'resting';
      c.currentExtend = 1;
    }

    const activeRect: Rect = {
      x: c.x,
      y: c.y + c.h - 40 + c.currentExtend * c.extendH,
      w: c.w,
      h: 40,
    };
    if (circleRectOverlap(player.x, player.y, player.radius - 2, activeRect)) {
      damagePlayer(world, 1, player.x < c.x + c.w * 0.5 ? -260 : 260, -240, 'Crushed by UFOOD Pressurizer');
    }
  }

  // Update Electric Hazards
  for (const eh of level.electricHazards) {
    if (eh.period) {
      const p = (world.time % eh.period) / eh.period;
      eh.telegraphing = p >= 0.35 && p < 0.52;
      eh.active = p >= 0.52 && p < 0.92;
    }
    if (eh.active && circleRectOverlap(player.x, player.y, player.radius - 2, eh)) {
      damagePlayer(world, 1, -player.facing * 220, -310, 'Electrocuted by Facility Hazard');
    }
  }

  // Collect Bioluminescent Pearls
  for (const pearl of level.pearls) {
    if (pearl.collected) continue;
    if (Math.hypot(player.x - pearl.x, player.y - pearl.y) < player.radius + 20) {
      pearl.collected = true;
      world.totalPearlsRun += 1;
      world.score += 200;
      world.bestScore = Math.max(world.bestScore, world.score);
      spawnParticles(world, pearl.x, pearl.y, 16, 'pearl', '#5eead4', 40, 170, 3, 6, 0.6);
      pushAudio(world, { type: 'pearl' });
    }
  }

  // Checkpoint update
  if (!world.checkpointReached && player.x >= level.checkpoint.x) {
    world.checkpointReached = true;
  }

  // Check Sector Exit / Ocean Victory
  if (circleRectOverlap(player.x, player.y, player.radius, level.exit)) {
    world.score += 500;
    if (world.sectorIndex + 1 < TOTAL_SECTORS) {
      pushAudio(world, { type: 'sector_clear' });
      resetSectorWorld(world, world.sectorIndex + 1, true);
    } else {
      world.phase = 'victory';
      world.score += Math.max(0, 600 - Math.round(world.runTime * 4)) + (player.hp * 150);
      world.bestScore = Math.max(world.bestScore, world.score);
      pushAudio(world, { type: 'victory' });
    }
  }

  updateTentacles(world, dt);
  updateParticles(world, dt);

  // Smooth Camera Follow
  const viewW = 1280;
  const viewH = 720;
  const targetCamX = Math.max(0, Math.min(level.width - viewW, player.x + player.facing * 90 - viewW * 0.48));
  const targetCamY = Math.max(0, Math.min(level.height - viewH, player.y - viewH * 0.54));
  world.camera.x += (targetCamX - world.camera.x) * (1 - Math.exp(-6.5 * dt));
  world.camera.y += (targetCamY - world.camera.y) * (1 - Math.exp(-6.5 * dt));
}

function updateParticles(world: GameWorld, dt: number): void {
  for (const p of world.particles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    if (p.kind === 'bubble') {
      p.vy -= 45 * dt;
      p.vx += Math.sin(world.time * 8 + p.y * 0.05) * 20 * dt;
    } else if (p.kind === 'ink' || p.kind === 'water') {
      p.vy += 280 * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function getSnapshot(world: GameWorld): GameSnapshot {
  let maxAlert = 0;
  for (const c of world.level.cameras) {
    if (c.alertState === 'windup') maxAlert = 1;
    else maxAlert = Math.max(maxAlert, c.suspicion);
  }
  for (const d of world.level.drones) {
    if (d.alertState === 'windup' || d.alertState === 'dashing') maxAlert = 1;
    else maxAlert = Math.max(maxAlert, d.suspicion);
  }

  const pearlsCollected = world.level.pearls.filter((p) => p.collected).length;

  return {
    phase: world.phase,
    sectorIndex: world.sectorIndex,
    totalSectors: TOTAL_SECTORS,
    sectorName: world.level.name,
    hp: Math.round(world.player.hp),
    maxHp: world.player.maxHp,
    ink: Math.round(world.player.ink),
    maxInk: world.player.maxInk,
    camoActive: world.player.camoActive,
    inWater: world.player.inWater,
    isClinging: world.player.isClinging,
    detectedAlert: maxAlert,
    pearlsCollected,
    totalPearlsInSector: world.level.pearls.length,
    totalPearlsRun: world.totalPearlsRun,
    elapsedSeconds: Math.round(world.runTime),
    score: Math.round(world.score),
    bestScore: Math.round(world.bestScore),
    contextHint: world.contextHint,
    deathReason: world.deathReason,
  };
}
