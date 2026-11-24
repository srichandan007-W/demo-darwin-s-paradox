export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlatformMaterial = 'steel' | 'concrete' | 'crate_support' | 'grate' | 'conveyor';

export interface Platform extends Rect {
  id: string;
  material: PlatformMaterial;
  conveyorSpeed?: number; // px/s horizontal push when standing on top
  doorId?: string; // If present, acts as a solid blast door that opens when unlocked
  openOffsetY?: number; // How far up/down the door slides when open
  isOpen?: boolean;
  openProgress?: number; // 0 = closed, 1 = open
}

export interface WaterZone extends Rect {
  id: string;
  label?: string;
}

export interface CamoCover extends Rect {
  id: string;
  pattern: 'coral' | 'rust' | 'vent' | 'hazard';
}

export interface Crate extends Rect {
  id: string;
  vx: number;
  vy: number;
  onGround: boolean;
  grabbed: boolean;
}

export interface Lever {
  id: string;
  x: number;
  y: number;
  activated: boolean;
  targetIds: string[]; // doorIds or trapIds toggled
  label: string;
}

export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  w: number;
  pressed: boolean;
  targetIds: string[]; // doorIds held open while pressed
}

export interface GrappleRing {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface SecurityCamera {
  id: string;
  x: number;
  y: number;
  baseAngle: number; // radians
  sweepRange: number; // radians (+/-)
  sweepSpeed: number; // rad/s
  range: number; // cone length px
  fov: number; // half-angle rad
  currentAngle: number;
  blindTimer: number; // > 0 when blinded by ink
  suspicion: number; // 0..1
  alertState: 'patrol' | 'suspicious' | 'windup' | 'firing' | 'blinded';
  windupTimer: number;
  fireCooldown: number;
}

export interface PatrolDrone {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  baseY: number;
  speed: number;
  facing: 1 | -1;
  scanRange: number;
  scanHalfWidth: number;
  blindTimer: number;
  suspicion: number;
  alertState: 'patrol' | 'suspicious' | 'windup' | 'dashing' | 'blinded';
  windupTimer: number;
  dashTimer: number;
  hitFlashTimer: number;
}

export interface CrusherHazard {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  extendH: number;
  period: number; // full cycle seconds
  phaseOffset: number;
  state: 'retracted' | 'telegraph' | 'slamming' | 'resting';
  currentExtend: number; // 0..1
  disabledByTrapId?: string;
  active: boolean;
}

export interface ElectricHazard extends Rect {
  id: string;
  trapId: string;
  active: boolean;
  period?: number; // if periodic, cycles on/off
  timer: number;
  telegraphing: boolean;
}

export interface PearlCollectible {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  bobPhase: number;
}

export interface InkProjectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface InkCloud {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface ShockBolt {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export type ParticleKind = 'ink' | 'bubble' | 'spark' | 'water' | 'camo' | 'pearl' | 'alert';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  kind: ParticleKind;
}

export interface TentacleLimb {
  baseAngle: number;
  tipX: number;
  tipY: number;
  targetX: number;
  targetY: number;
  midX: number;
  midY: number;
  attached: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facing: 1 | -1;
  onGround: boolean;
  clingNormalX: number; // -1 left wall, 1 right wall, 0 none
  clingNormalY: number; // -1 ceiling, 1 floor, 0 none
  isClinging: boolean;
  inWater: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  hp: number;
  maxHp: number;
  invulnTimer: number;
  hitFlashTimer: number;
  ink: number; // 0..100
  maxInk: number;
  camoActive: boolean;
  camoPattern: 'none' | 'steel' | 'coral' | 'rust' | 'vent' | 'hazard';
  camoEfficiency: number; // 0..1 (higher when still or on matching cover)
  grappleTargetId: string | null;
  grappleType: 'ring' | 'crate' | null;
  grappleX: number;
  grappleY: number;
  grappleLength: number;
  grappleAnimTimer: number;
  squashX: number;
  squashY: number;
  walkDistance: number;
  inkCooldown: number;
  tentacles: TentacleLimb[];
}

export interface LevelExit extends Rect {
  label: string;
  isOceanGoal?: boolean;
}

export interface LevelDefinition {
  index: number;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  spawn: Vec2;
  checkpoint: Vec2;
  exit: LevelExit;
  platforms: Platform[];
  waterZones: WaterZone[];
  camoCovers: CamoCover[];
  crates: Crate[];
  levers: Lever[];
  plates: PressurePlate[];
  grappleRings: GrappleRing[];
  cameras: SecurityCamera[];
  drones: PatrolDrone[];
  crushers: CrusherHazard[];
  electricHazards: ElectricHazard[];
  pearls: PearlCollectible[];
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  camoHeld: boolean;
  camoJustPressed: boolean;
  inkJustPressed: boolean;
  grabHeld: boolean;
  grabJustPressed: boolean;
  aimWorldX: number;
  aimWorldY: number;
  hasPointerAim: boolean;
}

export interface AudioEvent {
  type:
    | 'jump'
    | 'land'
    | 'splash'
    | 'ink_fire'
    | 'ink_splat'
    | 'camo_on'
    | 'camo_off'
    | 'grapple'
    | 'lever'
    | 'plate'
    | 'pearl'
    | 'alert_windup'
    | 'hurt'
    | 'crusher_slam'
    | 'sector_clear'
    | 'victory'
    | 'gameover';
  intensity?: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  sectorIndex: number;
  totalSectors: number;
  sectorName: string;
  hp: number;
  maxHp: number;
  ink: number;
  maxInk: number;
  camoActive: boolean;
  inWater: boolean;
  isClinging: boolean;
  detectedAlert: number; // 0..1 highest active enemy suspicion
  pearlsCollected: number;
  totalPearlsInSector: number;
  totalPearlsRun: number;
  elapsedSeconds: number;
  score: number;
  bestScore: number;
  contextHint: string | null;
  deathReason: string | null;
}

export interface GameWorld {
  phase: GamePhase;
  sectorIndex: number;
  level: LevelDefinition;
  player: PlayerState;
  camera: {
    x: number;
    y: number;
    trauma: number;
    shakeX: number;
    shakeY: number;
  };
  hitstopTimer: number;
  time: number;
  runTime: number;
  totalPearlsRun: number;
  damageTakenRun: number;
  score: number;
  bestScore: number;
  deathReason: string | null;
  contextHint: string | null;
  inkProjectiles: InkProjectile[];
  inkClouds: InkCloud[];
  shockBolts: ShockBolt[];
  particles: Particle[];
  particleCursor: number;
  audioQueue: AudioEvent[];
  sectorBannerTimer: number;
  checkpointReached: boolean;
}
