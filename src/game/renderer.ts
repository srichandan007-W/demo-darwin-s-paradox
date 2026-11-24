import { getEffectivePlatformRect } from './simulation';
import { GameWorld, InputState, Platform, PlayerState } from './types';

const VIEW_W = 1280;
const VIEW_H = 720;

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  input: InputState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();
  const scaleX = canvasWidth / VIEW_W;
  const scaleY = canvasHeight / VIEW_H;
  const scale = Math.max(scaleX, scaleY);
  const offsetX = (canvasWidth - VIEW_W * scale) * 0.5;
  const offsetY = (canvasHeight - VIEW_H * scale) * 0.5;

  ctx.fillStyle = '#050c14';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const camX = world.camera.x + world.camera.shakeX;
  const camY = world.camera.y + world.camera.shakeY;

  // 1. Background & Parallax Industrial Facility
  drawBackdrop(ctx, world, camX, camY);

  ctx.save();
  ctx.translate(-camX, -camY);

  // 2. Camo Cover Panels (behind foreground actors)
  drawCamoCovers(ctx, world);

  // 3. Exit / Ocean Goal
  drawExit(ctx, world);

  // 4. Water Zones (back tint)
  drawWaterBack(ctx, world);

  // 5. Interactive Props (Levers, Plates, Grapple Rings, Crates)
  drawInteractables(ctx, world);

  // 6. Platforms & Sliding Blast Doors
  for (const plat of world.level.platforms) {
    drawPlatform(ctx, plat, world.time);
  }

  // 7. Crushers & Electric Traps
  drawHazards(ctx, world);

  // 8. Pearls
  drawPearls(ctx, world);

  // 9. Security Cameras & Patrol Drones (with volumetric light cones)
  drawSecurityCameras(ctx, world);
  drawPatrolDrones(ctx, world);

  // 10. Ink Clouds & Projectiles & Shock Bolts
  drawProjectilesAndClouds(ctx, world);

  // 11. Darwin (Hero Octopus)
  drawDarwin(ctx, world, input);

  // 12. Water Foreground Meniscus & Caustics
  drawWaterFront(ctx, world);

  // 13. Pooled Particles
  drawParticles(ctx, world);

  // 14. Subtle Aim Reticle if pointer moved
  if (world.phase === 'playing' && input.hasPointerAim) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(input.aimWorldX, input.aimWorldY, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(input.aimWorldX, input.aimWorldY, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(94, 234, 212, 0.85)';
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  if (world.player.hp === 1 && world.phase === 'playing') {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.16)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  ctx.restore();
}

let cachedUfoodLabel: HTMLCanvasElement | null = null;

function getUfoodLabel(): HTMLCanvasElement | null {
  if (cachedUfoodLabel) return cachedUfoodLabel;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 40;
  const lctx = c.getContext('2d');
  if (!lctx) return null;
  lctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
  lctx.font = '700 26px system-ui, sans-serif';
  lctx.fillText('UFOOD', 4, 28);
  cachedUfoodLabel = c;
  return c;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, world: GameWorld, camX: number, camY: number): void {
  ctx.fillStyle = '#08131d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#060e16';
  ctx.fillRect(0, 0, VIEW_W, 180);

  // Far parallax vats & factory silhouettes (0.22x)
  const label = getUfoodLabel();
  const p1 = -(camX * 0.22) % 420;
  for (let x = p1 - 420; x < VIEW_W + 420; x += 420) {
    ctx.fillStyle = '#0a1824';
    ctx.fillRect(x + 40, 80, 140, 560);
    ctx.fillRect(x + 220, 150, 110, 490);
    ctx.fillRect(x, 120, 420, 22);
    ctx.fillRect(x, 380, 420, 14);

    // Warm sodium lamp glow
    ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
    ctx.beginPath();
    ctx.arc(x + 110, 140, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.11)';
    ctx.beginPath();
    ctx.arc(x + 110, 140, 28, 0, Math.PI * 2);
    ctx.fill();

    if (label) {
      ctx.drawImage(label, x + 54, 224);
    }
  }

  // Mid parallax structural columns & hanging cables (0.45x)
  const p2 = -(camX * 0.45) % 340;
  ctx.strokeStyle = 'rgba(30, 58, 82, 0.35)';
  ctx.lineWidth = 3;
  for (let x = p2 - 340; x < VIEW_W + 340; x += 340) {
    ctx.fillStyle = 'rgba(11, 24, 36, 0.72)';
    ctx.fillRect(x + 150, 0, 28, VIEW_H);
    ctx.beginPath();
    ctx.moveTo(x, 30 - camY * 0.1);
    ctx.quadraticCurveTo(x + 170, 135 - camY * 0.1, x + 340, 30 - camY * 0.1);
    ctx.stroke();
  }

  // Subtle ambient dust motes
  ctx.fillStyle = 'rgba(125, 211, 252, 0.12)';
  for (let i = 0; i < 12; i++) {
    const mx = ((i * 197 + world.time * 12 - camX * 0.3) % VIEW_W + VIEW_W) % VIEW_W;
    const my = ((i * 113 + Math.sin(world.time + i) * 20) % VIEW_H + VIEW_H) % VIEW_H;
    ctx.fillRect(mx, my, 2, 2);
  }
}

function drawCamoCovers(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const cover of world.level.camoCovers) {
    ctx.save();
    if (cover.pattern === 'coral') {
      // Organic swaying coral / anemone cluster
      ctx.fillStyle = 'rgba(36, 20, 48, 0.78)';
      ctx.beginPath();
      ctx.roundRect(cover.x, cover.y + 8, cover.w, cover.h - 8, 12);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const fx = cover.x + 16 + i * ((cover.w - 32) / 4);
        const sway = Math.sin(world.time * 2.2 + i) * 4;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.5)' : 'rgba(45, 212, 191, 0.45)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx, cover.y + cover.h - 4);
        ctx.quadraticCurveTo(fx + sway, cover.y + cover.h * 0.45, fx + sway * 1.4, cover.y + 14 + (i % 2) * 10);
        ctx.stroke();
      }
    } else if (cover.pattern === 'rust') {
      ctx.fillStyle = '#2a1d19';
      ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
      ctx.fillStyle = 'rgba(194, 65, 12, 0.34)';
      ctx.fillRect(cover.x + 6, cover.y + 8, cover.w - 12, 16);
      ctx.fillRect(cover.x + 10, cover.y + 42, cover.w - 20, 22);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cover.x + 5, cover.y + 5, 4, 4);
      ctx.fillRect(cover.x + cover.w - 9, cover.y + 5, 4, 4);
    } else if (cover.pattern === 'vent') {
      ctx.fillStyle = '#18242e';
      ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
      ctx.fillStyle = '#091117';
      for (let y = cover.y + 10; y < cover.y + cover.h - 8; y += 12) {
        ctx.fillRect(cover.x + 10, y, cover.w - 20, 5);
      }
    } else {
      ctx.fillStyle = '#232018';
      ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      for (let x = cover.x + 8; x < cover.x + cover.w - 10; x += 24) {
        ctx.fillRect(x, cover.y + 8, 10, cover.h - 16);
      }
    }
    if (cover.pattern !== 'coral') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cover.x, cover.y, cover.w, cover.h);
    }
    ctx.restore();
  }
}

function drawExit(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { exit } = world.level;
  ctx.save();
  if (exit.isOceanGoal) {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.34)';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = 'rgba(6, 78, 59, 0.38)';
    ctx.fillRect(exit.x, exit.y + exit.h * 0.45, exit.w, exit.h * 0.55);

    ctx.strokeStyle = 'rgba(94, 234, 212, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const kx = exit.x + 50 + i * 38;
      ctx.beginPath();
      ctx.moveTo(kx, exit.y + exit.h);
      ctx.quadraticCurveTo(kx + Math.sin(world.time * 2 + i) * 14, exit.y + exit.h * 0.5, kx + Math.cos(world.time * 1.7 + i) * 12, exit.y + 30);
      ctx.stroke();
    }
  } else {
    // Glowing Outfall Chute
    ctx.fillStyle = '#081824';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    const pulse = 0.55 + Math.sin(world.time * 3.5) * 0.2;
    ctx.fillStyle = `rgba(45, 212, 191, ${pulse * 0.3})`;
    ctx.fillRect(exit.x + 8, exit.y + 8, exit.w - 16, exit.h - 16);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);

    // Arrow indicator
    ctx.fillStyle = '#5eead4';
    ctx.beginPath();
    const cx = exit.x + exit.w * 0.5 + Math.sin(world.time * 4) * 5;
    const cy = exit.y + exit.h * 0.5;
    ctx.moveTo(cx - 12, cy - 10);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx - 12, cy + 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWaterBack(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const wz of world.level.waterZones) {
    ctx.fillStyle = 'rgba(12, 92, 118, 0.36)';
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.fillStyle = 'rgba(8, 51, 68, 0.25)';
    ctx.fillRect(wz.x, wz.y + wz.h * 0.5, wz.w, wz.h * 0.5);
  }
}

function drawWaterFront(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const wz of world.level.waterZones) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = wz.x; x <= wz.x + wz.w; x += 14) {
      const wy = wz.y + Math.sin(x * 0.05 + world.time * 3.8) * 3;
      if (x === wz.x) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();

    // Subtle caustic vertical light ribbons
    ctx.fillStyle = 'rgba(103, 232, 249, 0.06)';
    for (let x = wz.x + 25; x < wz.x + wz.w - 25; x += 64) {
      const shift = Math.sin(world.time * 1.4 + x * 0.02) * 14;
      ctx.beginPath();
      ctx.moveTo(x + shift, wz.y + 4);
      ctx.lineTo(x + 22 + shift, wz.y + 4);
      ctx.lineTo(x + 8 - shift, wz.y + wz.h);
      ctx.lineTo(x - 10 - shift, wz.y + wz.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawPlatform(ctx: CanvasRenderingContext2D, plat: Platform, time: number): void {
  const rect = getEffectivePlatformRect(plat);
  ctx.save();

  if (plat.doorId) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = plat.isOpen ? '#10b981' : '#f59e0b';
    ctx.fillRect(rect.x + 6, rect.y + 12, rect.w - 12, 8);
    ctx.fillRect(rect.x + 6, rect.y + rect.h - 20, rect.w - 12, 8);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }

  if (plat.material === 'conveyor') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    // Moving chevrons showing belt direction
    const speed = plat.conveyorSpeed ?? 80;
    const offset = ((time * speed) % 36 + 36) % 36;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.beginPath();
    for (let x = rect.x + offset; x < rect.x + rect.w - 12; x += 36) {
      const dir = speed >= 0 ? 1 : -1;
      ctx.moveTo(x - dir * 5, rect.y + 12);
      ctx.lineTo(x + dir * 5, rect.y + rect.h * 0.5);
      ctx.lineTo(x - dir * 5, rect.y + rect.h - 12);
    }
    ctx.stroke();
  } else if (plat.material === 'grate') {
    ctx.fillStyle = '#1f2d3a';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = '#334759';
    ctx.lineWidth = 2;
    for (let x = rect.x + 12; x < rect.x + rect.w - 6; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, rect.y + 3);
      ctx.lineTo(x, rect.y + rect.h - 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#475f75';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  } else if (plat.material === 'steel') {
    ctx.fillStyle = '#243444';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#35495e';
    ctx.fillRect(rect.x, rect.y, rect.w, Math.min(6, rect.h));
    ctx.strokeStyle = '#4b637c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = '#16222e';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#223344';
    ctx.fillRect(rect.x, rect.y, rect.w, Math.min(8, rect.h));
    ctx.strokeStyle = '#2d4154';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  ctx.restore();
}

function drawInteractables(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { level } = world;

  // Pressure plates
  for (const plate of level.plates) {
    const h = plate.pressed ? 5 : 10;
    ctx.fillStyle = plate.pressed ? '#10b981' : '#f59e0b';
    ctx.fillRect(plate.x, plate.y + (10 - h), plate.w, h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(plate.x, plate.y + (10 - h), plate.w, h);
  }

  // Levers
  for (const lever of level.levers) {
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.fillRect(lever.x - 14, lever.y - 8, 28, 8);
    const angle = lever.activated ? 0.55 : -0.55;
    ctx.translate(lever.x, lever.y - 6);
    ctx.rotate(angle);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -28);
    ctx.stroke();
    ctx.fillStyle = lever.activated ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -30, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Grapple Rings
  for (const ring of level.grappleRings) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fill();
    ctx.restore();
  }

  // Crates
  for (const crate of level.crates) {
    ctx.save();
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(crate.x, crate.y, crate.w, crate.h);
    ctx.beginPath();
    ctx.moveTo(crate.x + 6, crate.y + 6);
    ctx.lineTo(crate.x + crate.w - 6, crate.y + crate.h - 6);
    ctx.moveTo(crate.x + crate.w - 6, crate.y + 6);
    ctx.lineTo(crate.x + 6, crate.y + crate.h - 6);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHazards(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const c of world.level.crushers) {
    const headY = c.y + c.h - 40 + c.currentExtend * c.extendH;
    // Piston shaft
    ctx.fillStyle = '#334155';
    ctx.fillRect(c.x + c.w * 0.3, c.y, c.w * 0.4, headY - c.y);

    // Slam head
    ctx.fillStyle = c.state === 'telegraph' ? '#b45309' : '#1e293b';
    ctx.fillRect(c.x, headY, c.w, 40);
    ctx.strokeStyle = c.state === 'telegraph' ? '#fbbf24' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(c.x, headY, c.w, 40);

    // Warning beacon on crusher
    if (c.state === 'telegraph') {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.beginPath();
      ctx.arc(c.x + c.w * 0.5, headY + 20, 8 + Math.sin(world.time * 28) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const eh of world.level.electricHazards) {
    if (!eh.active && !eh.telegraphing) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(eh.x, eh.y + 4, eh.w, eh.h - 6);
      continue;
    }
    ctx.save();
    ctx.strokeStyle = eh.telegraphing ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = eh.telegraphing ? 2 : 3.5;
    ctx.beginPath();
    const segs = Math.max(4, Math.floor(eh.w / 18));
    for (let i = 0; i <= segs; i++) {
      const px = eh.x + (i / segs) * eh.w;
      const jitter = eh.telegraphing ? 2 : 6;
      const py = eh.y + eh.h * 0.5 + (i === 0 || i === segs ? 0 : Math.sin(world.time * 42 + i * 2.1) * jitter);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawPearls(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const p of world.level.pearls) {
    if (p.collected) continue;
    const py = p.y + Math.sin(world.time * 3 + p.bobPhase) * 6;
    ctx.save();
    ctx.fillStyle = 'rgba(94, 234, 212, 0.16)';
    ctx.beginPath();
    ctx.arc(p.x, py, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(94, 234, 212, 0.32)';
    ctx.beginPath();
    ctx.arc(p.x, py, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ccfbf1';
    ctx.beginPath();
    ctx.arc(p.x, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawSecurityCameras(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const cam of world.level.cameras) {
    ctx.save();
    // Cone
    if (cam.alertState !== 'blinded') {
      const color =
        cam.alertState === 'windup'
          ? 'rgba(239, 68, 68, 0.34)'
          : cam.alertState === 'suspicious'
          ? 'rgba(245, 158, 11, 0.25)'
          : 'rgba(56, 189, 248, 0.14)';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.arc(cam.x, cam.y, cam.range, cam.currentAngle - cam.fov, cam.currentAngle + cam.fov);
      ctx.closePath();
      ctx.fill();

      // Windup laser line telegraph
      if (cam.alertState === 'windup') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.lineTo(world.player.x, world.player.y);
        ctx.stroke();
      }
    }

    // Camera housing
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.currentAngle);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, -9, 24, 18);
    ctx.fillStyle = cam.alertState === 'blinded' ? '#1e1b4b' : cam.alertState === 'windup' ? '#ef4444' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(12, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ink splat badge when blinded
    if (cam.alertState === 'blinded') {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(cam.x + 4, cam.y + 2, 13, 0, Math.PI * 2);
      ctx.fill();
    } else if (cam.suspicion > 0.15) {
      // Suspicion arc gauge above camera
      ctx.strokeStyle = cam.alertState === 'windup' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y - 22, 9, -Math.PI * 0.5, -Math.PI * 0.5 + cam.suspicion * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPatrolDrones(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const d of world.level.drones) {
    ctx.save();
    if (d.alertState !== 'blinded') {
      const coneColor =
        d.alertState === 'windup' || d.alertState === 'dashing'
          ? 'rgba(239, 68, 68, 0.30)'
          : d.alertState === 'suspicious'
          ? 'rgba(245, 158, 11, 0.22)'
          : 'rgba(56, 189, 248, 0.13)';
      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(d.x - 10, d.y + 8);
      ctx.lineTo(d.x + 10, d.y + 8);
      ctx.lineTo(d.x + d.scanHalfWidth, d.y + d.scanRange);
      ctx.lineTo(d.x - d.scanHalfWidth, d.y + d.scanRange);
      ctx.closePath();
      ctx.fill();
    }

    // Drone hull
    ctx.fillStyle = d.hitFlashTimer > 0 ? '#ffffff' : '#334155';
    ctx.beginPath();
    ctx.roundRect(d.x - 20, d.y - 12, 40, 22, 8);
    ctx.fill();
    ctx.strokeStyle = d.alertState === 'windup' ? '#ef4444' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotor blades
    const rotorW = 14 + Math.sin(world.time * 40) * 4;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.x - 16 - rotorW, d.y - 15);
    ctx.lineTo(d.x - 16 + rotorW, d.y - 15);
    ctx.moveTo(d.x + 16 - rotorW, d.y - 15);
    ctx.lineTo(d.x + 16 + rotorW, d.y - 15);
    ctx.stroke();

    // Eye sensor
    ctx.fillStyle = d.alertState === 'blinded' ? '#312e81' : d.alertState === 'windup' || d.alertState === 'dashing' ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(d.x + d.facing * 8, d.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (d.suspicion > 0.15 && d.alertState !== 'blinded') {
      ctx.strokeStyle = d.alertState === 'windup' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(d.x, d.y - 28, 9, -Math.PI * 0.5, -Math.PI * 0.5 + d.suspicion * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawProjectilesAndClouds(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const cloud of world.inkClouds) {
    if (!cloud.active) continue;
    const alpha = Math.min(0.72, (cloud.life / cloud.maxLife) * 0.85);
    ctx.fillStyle = `rgba(30, 27, 75, ${alpha})`;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const proj of world.inkProjectiles) {
    if (!proj.active) continue;
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#818cf8';
    ctx.beginPath();
    ctx.arc(proj.x - 2, proj.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bolt of world.shockBolts) {
    if (!bolt.active) continue;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getCamoPalette(pattern: PlayerState['camoPattern']): { body: string; spot: string; alpha: number } {
  switch (pattern) {
    case 'coral':
      return { body: '#6b345c', spot: '#f472b6', alpha: 0.52 };
    case 'rust':
      return { body: '#6b3e2e', spot: '#c2410c', alpha: 0.52 };
    case 'vent':
      return { body: '#2c3d4b', spot: '#111b24', alpha: 0.48 };
    case 'hazard':
      return { body: '#524722', spot: '#f59e0b', alpha: 0.52 };
    case 'steel':
      return { body: '#364859', spot: '#64748b', alpha: 0.58 };
    default:
      return { body: '#ff6b4a', spot: '#5eead4', alpha: 1 };
  }
}

function drawDarwin(ctx: CanvasRenderingContext2D, world: GameWorld, input: InputState): void {
  const { player } = world;
  if (player.invulnTimer > 0 && Math.floor(world.time * 16) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
  } else {
    ctx.save();
  }

  const palette = player.hitFlashTimer > 0 ? { body: '#ffffff', spot: '#ffffff', alpha: 1 } : getCamoPalette(player.camoPattern);
  ctx.globalAlpha *= palette.alpha;

  // Draw Grapple Tentacle if latched or animating lever pull
  if (player.grappleTargetId || player.grappleAnimTimer > 0) {
    ctx.save();
    ctx.strokeStyle = palette.body;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.grappleX, player.grappleY);
    ctx.stroke();
    ctx.fillStyle = '#ffd6c9';
    for (let s = 0.25; s < 1; s += 0.25) {
      ctx.beginPath();
      ctx.arc(player.x + (player.grappleX - player.x) * s, player.y + (player.grappleY - player.y) * s, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw 8 articulated tentacles
  for (let i = 0; i < player.tentacles.length; i++) {
    const t = player.tentacles[i];
    ctx.strokeStyle = palette.body;
    ctx.lineWidth = i % 2 === 0 ? 6 : 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 4);
    ctx.quadraticCurveTo(t.midX, t.midY, t.tipX, t.tipY);
    ctx.stroke();

    // Suction cup dots
    ctx.fillStyle = player.camoActive ? palette.spot : '#fed7aa';
    ctx.beginPath();
    ctx.arc(t.midX, t.midY, 1.8, 0, Math.PI * 2);
    ctx.arc(t.tipX, t.tipY, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Darwin's expressive mantle/head with squash & stretch
  ctx.save();
  ctx.translate(player.x, player.y - 2);
  ctx.scale(player.squashX, player.squashY);

  // Bulbous octopus mantle
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(-player.facing * 2, -4, 17, 15, -player.facing * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Bioluminescent chromatophore spots
  ctx.fillStyle = palette.spot;
  ctx.beginPath();
  ctx.arc(-player.facing * 8, -9, 3, 0, Math.PI * 2);
  ctx.arc(-player.facing * 12, -3, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes tracking facing or pointer aim
  const eyeX = player.facing * 6;
  const eyeY = -1;
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, 5.2, player.camoActive ? 3.0 : 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  let pupilDx = player.facing * 1.5;
  let pupilDy = 0;
  if (input.hasPointerAim) {
    const a = Math.atan2(input.aimWorldY - player.y, input.aimWorldX - player.x);
    pupilDx = Math.cos(a) * 2.0;
    pupilDy = Math.sin(a) * 2.0;
  }
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(eyeX + pupilDx, eyeY + pupilDy, 2.2, player.camoActive ? 1.5 : 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Camo shimmer ring
  if (player.camoActive) {
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  for (const p of world.particles) {
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
