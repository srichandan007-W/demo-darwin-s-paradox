import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { gameAudio } from './game/audio';
import { renderWorld } from './game/renderer';
import { createWorld, getSnapshot, resetSectorWorld, stepWorld } from './game/simulation';
import { GameSnapshot, GameWorld, InputState } from './game/types';

const VIEW_W = 1280;
const VIEW_H = 720;
const BEST_SCORE_KEY = 'darwins_paradox_best_score_v1';

function readBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.round(score)));
  } catch {
    // Ignore storage quota errors
  }
}

function syncBodyDatasetState(phase: GameWorld['phase']): void {
  const mapped = phase === 'victory' ? 'gameover' : phase;
  document.body.dataset.state = mapped;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const mouseButtonsRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const pointerClientRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const justPressedRef = useRef<{
    jump: boolean;
    jumpReleased: boolean;
    camo: boolean;
    ink: boolean;
    grab: boolean;
  }>({
    jump: false,
    jumpReleased: false,
    camo: false,
    ink: false,
    grab: false,
  });

  if (!worldRef.current) {
    const initial = createWorld(0, readBestScore());
    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';
    if (autostart) {
      initial.phase = 'playing';
    }
    worldRef.current = initial;
  }

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => getSnapshot(worldRef.current!));
  const [muted, setMuted] = useState<boolean>(false);

  const clearInputs = useCallback(() => {
    keysHeldRef.current.clear();
    mouseButtonsRef.current.left = false;
    mouseButtonsRef.current.right = false;
    justPressedRef.current.jump = false;
    justPressedRef.current.jumpReleased = false;
    justPressedRef.current.camo = false;
    justPressedRef.current.ink = false;
    justPressedRef.current.grab = false;
  }, []);

  const syncSnapshotNow = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    syncBodyDatasetState(world.phase);
    setSnapshot(getSnapshot(world));
  }, []);

  const startGame = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    clearInputs();
    resetSectorWorld(world, 0, false);
    world.phase = 'playing';
    syncSnapshotNow();
    canvasRef.current?.focus();
  }, [clearInputs, syncSnapshotNow]);

  const restartSector = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    clearInputs();
    resetSectorWorld(world, world.sectorIndex, world.sectorIndex > 0);
    world.phase = 'playing';
    syncSnapshotNow();
    canvasRef.current?.focus();
  }, [clearInputs, syncSnapshotNow]);

  const resumeGame = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    clearInputs();
    world.phase = 'playing';
    syncSnapshotNow();
    canvasRef.current?.focus();
  }, [clearInputs, syncSnapshotNow]);

  const pauseGame = useCallback(() => {
    const world = worldRef.current;
    if (!world || world.phase !== 'playing') return;
    clearInputs();
    world.phase = 'paused';
    syncSnapshotNow();
  }, [clearInputs, syncSnapshotNow]);

  const returnToTitle = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    clearInputs();
    resetSectorWorld(world, 0, false);
    world.phase = 'title';
    syncSnapshotNow();
  }, [clearInputs, syncSnapshotNow]);

  const toggleMute = useCallback(() => {
    const next = gameAudio.toggleMute();
    setMuted(next);
  }, []);

  // Main 60Hz decoupled simulation & canvas render loop
  useEffect(() => {
    const world = worldRef.current!;
    syncBodyDatasetState(world.phase);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let canvasCssW = window.innerWidth;
    let canvasCssH = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvasCssW = Math.max(320, rect.width || window.innerWidth);
      canvasCssH = Math.max(240, rect.height || window.innerHeight);
      // Keep internal buffer crisp while avoiding oversampling on large/software viewports
      dpr = canvasCssW >= 1200 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvasCssW * dpr);
      canvas.height = Math.round(canvasCssH * dpr);
      needsStaticRedraw = true;
    };
    let needsStaticRedraw = true;
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const scale = Math.max(rect.width / VIEW_W, rect.height / VIEW_H);
      const offsetX = (rect.width - VIEW_W * scale) * 0.5;
      const offsetY = (rect.height - VIEW_H * scale) * 0.5;
      return {
        x: (sx - offsetX) / scale + world.camera.x,
        y: (sy - offsetY) / scale + world.camera.y,
      };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      gameAudio.unlock();
      const code = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }

      if (world.phase === 'title') {
        if ((code === 'Enter' || code === 'Space') && !e.repeat) {
          startGame();
        }
        return;
      }

      if (!e.repeat) {
        if (code === 'Escape' || code === 'KeyP') {
          if (world.phase === 'playing') pauseGame();
          else if (world.phase === 'paused') resumeGame();
          return;
        }
        if (code === 'KeyM') {
          toggleMute();
          return;
        }
        if (code === 'KeyR' && (world.phase === 'playing' || world.phase === 'paused')) {
          restartSector();
          return;
        }
        if ((code === 'Enter' || code === 'Space') && (world.phase === 'gameover' || world.phase === 'victory')) {
          startGame();
          return;
        }
      }

      if (world.phase !== 'playing') return;

      const wasHeld = keysHeldRef.current.has(code);
      keysHeldRef.current.add(code);

      if (!wasHeld) {
        if (code === 'Space' || (!world.player.inWater && !world.player.isClinging && (code === 'KeyW' || code === 'ArrowUp'))) {
          justPressedRef.current.jump = true;
        }
        if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyC') {
          justPressedRef.current.camo = true;
        }
        if (code === 'KeyQ' || code === 'KeyF') {
          justPressedRef.current.ink = true;
        }
        if (code === 'KeyE') {
          justPressedRef.current.grab = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      keysHeldRef.current.delete(code);
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
        justPressedRef.current.jumpReleased = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerClientRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const onMouseDown = (e: MouseEvent) => {
      gameAudio.unlock();
      if (e.target !== canvas) return;
      if (world.phase !== 'playing') return;
      pointerClientRef.current = { x: e.clientX, y: e.clientY, active: true };
      if (e.button === 0) {
        mouseButtonsRef.current.left = true;
        justPressedRef.current.grab = true;
      } else if (e.button === 2) {
        mouseButtonsRef.current.right = true;
        justPressedRef.current.ink = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseButtonsRef.current.left = false;
      if (e.button === 2) mouseButtonsRef.current.right = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === canvas) e.preventDefault();
    };

    const onBlur = () => clearInputs();
    const onVisibility = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let lastTime = performance.now();
    let lastPhase = world.phase;
    let lastHp = world.player.hp;
    let lastInkInt = Math.round(world.player.ink);
    let lastPearls = world.totalPearlsRun;
    let lastScore = world.score;
    let lastCamo = world.player.camoActive;
    let lastInWater = world.player.inWater;
    let lastCling = world.player.isClinging;
    let lastHint = world.contextHint;

    const tick = (now: number) => {
      if (disposed) return;
      const frameStart = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const held = keysHeldRef.current;
      const aim = pointerClientRef.current.active
        ? screenToWorld(pointerClientRef.current.x, pointerClientRef.current.y)
        : { x: world.player.x + world.player.facing * 120, y: world.player.y - 20 };

      const input: InputState = {
        left: held.has('KeyA') || held.has('ArrowLeft'),
        right: held.has('KeyD') || held.has('ArrowRight'),
        up: held.has('KeyW') || held.has('ArrowUp'),
        down: held.has('KeyS') || held.has('ArrowDown'),
        jumpHeld: held.has('Space') || held.has('KeyW') || held.has('ArrowUp'),
        jumpJustPressed: justPressedRef.current.jump,
        jumpJustReleased: justPressedRef.current.jumpReleased,
        camoHeld: held.has('ShiftLeft') || held.has('ShiftRight') || held.has('KeyC'),
        camoJustPressed: justPressedRef.current.camo,
        inkJustPressed: justPressedRef.current.ink,
        grabHeld: held.has('KeyE') || mouseButtonsRef.current.left,
        grabJustPressed: justPressedRef.current.grab,
        aimWorldX: aim.x,
        aimWorldY: aim.y,
        hasPointerAim: pointerClientRef.current.active,
      };

      // Clear single-frame edges
      justPressedRef.current.jump = false;
      justPressedRef.current.jumpReleased = false;
      justPressedRef.current.camo = false;
      justPressedRef.current.ink = false;
      justPressedRef.current.grab = false;

      const prevPhase = world.phase;
      stepWorld(world, input, rawDt);
      if (world.phase !== prevPhase) needsStaticRedraw = true;

      // Flush synthesized audio events
      if (world.audioQueue.length > 0) {
        gameAudio.playEvents(world.audioQueue);
        world.audioQueue.length = 0;
      }

      // Render canvas (skip redundant static frames while paused/modal is open)
      const isActiveCanvas = world.phase === 'playing' || world.phase === 'title';
      if (isActiveCanvas || needsStaticRedraw) {
        needsStaticRedraw = false;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderWorld(ctx, world, input, canvasCssW, canvasCssH);
        ctx.restore();
      }

      // Sync React HUD only when visible HUD fields actually change
      const curInkInt = Math.round(world.player.ink);
      const discreteChanged =
        lastPhase !== world.phase ||
        lastHp !== world.player.hp ||
        Math.abs(lastInkInt - curInkInt) >= 2 ||
        (curInkInt === 100 && lastInkInt !== 100) ||
        lastPearls !== world.totalPearlsRun ||
        lastScore !== world.score ||
        lastCamo !== world.player.camoActive ||
        lastInWater !== world.player.inWater ||
        lastCling !== world.player.isClinging ||
        lastHint !== world.contextHint;

      if (discreteChanged) {
        if (lastPhase !== world.phase) {
          syncBodyDatasetState(world.phase);
          if (world.phase === 'victory' || world.phase === 'gameover') {
            saveBestScore(world.bestScore);
          }
        }
        lastPhase = world.phase;
        lastHp = world.player.hp;
        lastInkInt = curInkInt;
        lastPearls = world.totalPearlsRun;
        lastScore = world.score;
        lastCamo = world.player.camoActive;
        lastInWater = world.player.inWater;
        lastCling = world.player.isClinging;
        lastHint = world.contextHint;
        setSnapshot(getSnapshot(world));
      }

      const frameMs = performance.now() - frameStart;
      if (frameMs > 10) {
        timeoutId = setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        }, 12);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearInputs, pauseGame, restartSector, resumeGame, startGame, toggleMute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050c14]">
      {/* Isolated Canvas Mount */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        data-testid="game-canvas"
        className="block w-full h-full outline-none"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_52%,rgba(3,8,14,0.52)_100%)]"
      />

      {snapshot.phase === 'title' && (
        <TitleOverlay onStart={startGame} bestScore={snapshot.bestScore} />
      )}

      {snapshot.phase === 'playing' && (
        <GameHUD
          snapshot={snapshot}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={pauseGame}
          onRestart={restartSector}
        />
      )}

      <StatusModal
        snapshot={snapshot}
        onResume={resumeGame}
        onRestartSector={restartSector}
        onRestartRun={startGame}
        onReturnTitle={returnToTitle}
      />
    </main>
  );
}
