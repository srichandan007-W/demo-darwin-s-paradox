import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCamoState,
  createWorld,
  damagePlayer,
  getEffectivePlatformRect,
  getSnapshot,
  resetSectorWorld,
  stepWorld,
} from './simulation';
import { InputState } from './types';

function emptyInput(overrides: Partial<InputState> = {}): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    camoHeld: false,
    camoJustPressed: false,
    inkJustPressed: false,
    grabHeld: false,
    grabJustPressed: false,
    aimWorldX: 0,
    aimWorldY: 0,
    hasPointerAim: false,
    ...overrides,
  };
}

test('player spawns safely in Sector 1 water tank and survives 5 seconds without input', () => {
  const world = createWorld(0);
  world.phase = 'playing';
  for (let i = 0; i < 300; i++) {
    stepWorld(world, emptyInput(), 1 / 60);
  }
  assert.equal(world.phase, 'playing');
  assert.equal(world.player.hp, 3);
  assert.equal(world.player.inWater, true);
});

test('camouflage on cover grants near-100% stealth and prevents camera detection', () => {
  const world = createWorld(0);
  world.phase = 'playing';
  // Place player directly under camera 1 (x=920, y=310) on cover s1_camo_3 (x=960, y=490, w=96, h=90)
  world.player.x = 1000;
  world.player.y = 560;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.camoActive = true;

  const camo = computeCamoState(world);
  assert.equal(camo.pattern, 'vent');
  assert.equal(camo.efficiency, 1.0);

  const cam = world.level.cameras[0];
  cam.currentAngle = Math.atan2(world.player.y - cam.y, world.player.x - cam.x);

  for (let i = 0; i < 60; i++) {
    stepWorld(world, emptyInput(), 1 / 60);
  }
  assert.equal(cam.suspicion, 0);
  assert.equal(cam.alertState, 'patrol');
});

test('ink blast consumes ink and blinds security camera on hit', () => {
  const world = createWorld(0);
  world.phase = 'playing';
  const cam = world.level.cameras[0];
  world.player.x = cam.x - 120;
  world.player.y = cam.y + 40;

  stepWorld(
    world,
    emptyInput({
      inkJustPressed: true,
      hasPointerAim: true,
      aimWorldX: cam.x,
      aimWorldY: cam.y,
    }),
    1 / 60
  );

  assert.equal(world.player.ink < 100, true);

  for (let i = 0; i < 30; i++) {
    stepWorld(world, emptyInput(), 1 / 60);
  }

  assert.equal(cam.alertState, 'blinded');
  assert.equal(cam.blindTimer > 4, true);
  assert.equal(world.score >= 50, true);
});

test('pulling lever opens blast door in Sector 1', () => {
  const world = createWorld(0);
  world.phase = 'playing';
  const lever = world.level.levers[0];
  const door = world.level.platforms.find((p) => p.doorId === 's1_gate');
  assert.ok(door);
  const closedRect = getEffectivePlatformRect(door);

  world.player.x = lever.x - 40;
  world.player.y = lever.y - 18;

  stepWorld(world, emptyInput({ grabJustPressed: true, grabHeld: true }), 1 / 60);
  assert.equal(lever.activated, true);
  assert.equal(door.isOpen, true);

  for (let i = 0; i < 45; i++) {
    stepWorld(world, emptyInput(), 1 / 60);
  }
  const openRect = getEffectivePlatformRect(door);
  assert.equal(openRect.y < closedRect.y - 100, true);
});

test('crate on pressure plate unlocks Sector 2 processing blast door', () => {
  const world = createWorld(1);
  world.phase = 'playing';
  const plate = world.level.plates[0];
  const crate = world.level.crates[0];
  const door = world.level.platforms.find((p) => p.doorId === 's2_door');
  assert.ok(plate && crate && door);

  crate.x = plate.x + 10;
  crate.y = plate.y - crate.h;
  stepWorld(world, emptyInput(), 1 / 60);

  assert.equal(plate.pressed, true);
  assert.equal(door.isOpen, true);
});

test('pearl collection, damage defeat, and Sector 3 ocean victory transitions work', () => {
  const world = createWorld(0);
  world.phase = 'playing';
  const pearl = world.level.pearls[0];
  world.player.x = pearl.x;
  world.player.y = pearl.y;
  stepWorld(world, emptyInput(), 1 / 60);

  assert.equal(pearl.collected, true);
  assert.equal(world.totalPearlsRun, 1);
  assert.equal(world.score, 200);

  // Damage to defeat
  damagePlayer(world, 3, -100, -100, 'Test Hazard');
  assert.equal(world.phase, 'gameover');
  assert.equal(getSnapshot(world).hp, 0);

  // Ocean Victory in Sector 3
  resetSectorWorld(world, 2, false);
  world.phase = 'playing';
  world.player.x = world.level.exit.x + 40;
  world.player.y = world.level.exit.y + 80;
  stepWorld(world, emptyInput(), 1 / 60);
  assert.equal(world.phase, 'victory');
});
