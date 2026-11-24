import React from 'react';
import { GameSnapshot } from '../game/types';

interface GameHUDProps {
  snapshot: GameSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  snapshot,
  muted,
  onToggleMute,
  onPause,
  onRestart,
}) => {
  const inkPct = Math.max(0, Math.min(100, Math.round((snapshot.ink / snapshot.maxInk) * 100)));
  const alertPct = Math.round(snapshot.detectedAlert * 100);
  const statusLabel = snapshot.camoActive
    ? 'CAMO ACTIVE'
    : alertPct >= 80
    ? 'LOCKED ON'
    : alertPct >= 20
    ? 'SUSPICIOUS'
    : snapshot.inWater
    ? 'SUBMERGED'
    : snapshot.isClinging
    ? 'SUCTION CLING'
    : 'MOBILE';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Vitality Pips, Ink Reservoir & Live State */}
        <div className="flex flex-col gap-2.5 bg-[#08131d]/85 border border-slate-700/60 rounded-lg px-3.5 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            {/* 3 Octopus Vitality Sockets */}
            <div className="flex items-center gap-1.5" aria-label={`Vitality ${snapshot.hp} of ${snapshot.maxHp}`}>
              {Array.from({ length: snapshot.maxHp }).map((_, i) => {
                const full = i < snapshot.hp;
                return (
                  <svg key={i} viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                    <path
                      d="M12 3C7.6 3 4.5 6.1 4.5 10.1c0 2.1.8 3.6 2 4.7-.2 1.6-.8 3.3-1.8 4.4 1.6.1 3-.6 4-1.7.7.2 1.5.4 2.3.4V20h2v-2.1c.8 0 1.6-.2 2.3-.4 1 1.1 2.4 1.8 4 1.7-1-1.1-1.6-2.8-1.8-4.4 1.2-1.1 2-2.6 2-4.7C19.5 6.1 16.4 3 12 3z"
                      fill={full ? '#ff6b4a' : '#132230'}
                      stroke="#050c14"
                      strokeWidth="1.8"
                    />
                    {full && <circle cx="9.5" cy="9.5" r="1.4" fill="#fef08a" />}
                    {full && <circle cx="14.5" cy="9.5" r="1.4" fill="#fef08a" />}
                  </svg>
                );
              })}
            </div>

            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
              HP <span className="text-slate-100 font-bold">{snapshot.hp}/{snapshot.maxHp}</span>
            </span>
          </div>

          {/* Ink Meter */}
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path
                d="M12 2.5C12 2.5 6 10.2 6 14.5C6 17.8 8.7 20.5 12 20.5C15.3 20.5 18 17.8 18 14.5C18 10.2 12 2.5 12 2.5Z"
                fill="#818cf8"
                stroke="#050c14"
                strokeWidth="1.8"
              />
            </svg>
            <div className="w-28 h-2.5 bg-[#0d1b28] rounded-sm overflow-hidden border border-slate-700/70">
              <div
                className="h-full bg-[#818cf8] transition-[width] duration-75"
                style={{ width: `${inkPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono-tabular text-slate-200 w-12">
              INK {inkPct}
            </span>
          </div>

          {/* Live Stealth / Mobility Status */}
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular">
            <span
              className={
                alertPct >= 80
                  ? 'text-red-400 font-bold'
                  : snapshot.camoActive
                  ? 'text-teal-300 font-bold'
                  : alertPct >= 20
                  ? 'text-amber-300 font-bold'
                  : 'text-slate-300'
              }
            >
              {statusLabel}
            </span>
            {alertPct >= 15 && (
              <span className="text-amber-300">· ALERT {alertPct}%</span>
            )}
          </div>
        </div>

        {/* Top-Right: Sector, Pearls, Score & Utility Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[#08131d]/85 border border-slate-700/60 rounded-lg px-3.5 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.45)] text-xs font-mono-tabular">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Sector</div>
              <div className="text-sm font-bold text-slate-100">
                {snapshot.sectorIndex + 1}/{snapshot.totalSectors}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-700/70" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Pearls</div>
              <div className="text-sm font-bold text-teal-300">
                {snapshot.pearlsCollected}/{snapshot.totalPearlsInSector}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-700/70" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Score</div>
              <div className="text-sm font-bold text-slate-100">{snapshot.score}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
              title={muted ? 'Unmute [M]' : 'Mute [M]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#08131d]/90 hover:bg-[#132638] border border-slate-700/70 text-slate-200 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                {muted ? (
                  <path d="M22 9l-6 6M16 9l6 6" stroke="#f87171" />
                ) : (
                  <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" stroke="#5eead4" />
                )}
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart sector (R)"
              title="Restart Sector [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#08131d]/90 hover:bg-[#132638] border border-slate-700/70 text-slate-200 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 103-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause game (Esc)"
              title="Pause [Esc]"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#08131d]/90 hover:bg-[#132638] border border-slate-700/70 text-slate-200 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Contextual Action Cue (only when near interactable) */}
      <div className="flex justify-center pb-2">
        {snapshot.contextHint && (
          <div className="bg-[#08131d]/90 border border-teal-400/50 rounded-md px-4 py-1.5 text-xs md:text-sm font-mono-tabular text-teal-200 shadow-lg">
            {snapshot.contextHint}
          </div>
        )}
      </div>
    </div>
  );
};
