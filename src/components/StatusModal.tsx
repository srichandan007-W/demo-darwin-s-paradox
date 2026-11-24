import React from 'react';
import { GameSnapshot } from '../game/types';

interface StatusModalProps {
  snapshot: GameSnapshot;
  onResume: () => void;
  onRestartSector: () => void;
  onRestartRun: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  snapshot,
  onResume,
  onRestartSector,
  onRestartRun,
  onReturnTitle,
}) => {
  if (snapshot.phase !== 'paused' && snapshot.phase !== 'victory' && snapshot.phase !== 'gameover') {
    return null;
  }

  const isPaused = snapshot.phase === 'paused';
  const isVictory = snapshot.phase === 'victory';

  const heading = isPaused ? 'Facility Paused' : isVictory ? 'Back to the Ocean' : 'Captured by UFOOD';
  const subtitle = isPaused
    ? snapshot.sectorName
    : isVictory
    ? 'Darwin breached the Sea Gate and returned safely to open waters.'
    : snapshot.deathReason ?? 'Security lockdown neutralized Darwin.';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#03090f]/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div className="w-full max-w-md rounded-xl bg-[#0a1622] border border-slate-700/80 p-7 shadow-[0_24px_64px_rgba(0,0,0,0.75)]">
        <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#ff6b4a]">
          {isPaused ? 'Paused' : isVictory ? 'Escape Complete' : 'Run Ended'}
        </div>
        <h2 id="modal-heading" className="mt-1.5 text-3xl font-display font-bold text-slate-50">
          {heading}
        </h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{subtitle}</p>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#0f2030] border border-slate-700/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Sector</div>
            <div className="mt-1 text-lg font-mono-tabular font-bold text-slate-100">
              {snapshot.sectorIndex + 1}/{snapshot.totalSectors}
            </div>
          </div>
          <div className="rounded-lg bg-[#0f2030] border border-slate-700/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Pearls</div>
            <div className="mt-1 text-lg font-mono-tabular font-bold text-teal-300">
              {snapshot.totalPearlsRun}/9
            </div>
          </div>
          <div className="rounded-lg bg-[#0f2030] border border-slate-700/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Score</div>
            <div className="mt-1 text-lg font-mono-tabular font-bold text-slate-100">
              {snapshot.score}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono-tabular text-slate-400">
          <span>Elapsed {snapshot.elapsedSeconds}s</span>
          <span>Best {snapshot.bestScore}</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          {isPaused ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onResume();
              }}
              className="w-full py-3 rounded-lg bg-[#ff6b4a] hover:bg-[#ff7f62] text-[#061017] font-display font-bold text-sm tracking-wide cursor-pointer"
            >
              Resume Escape
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestartRun();
              }}
              className="w-full py-3 rounded-lg bg-[#ff6b4a] hover:bg-[#ff7f62] text-[#061017] font-display font-bold text-sm tracking-wide cursor-pointer"
            >
              {isVictory ? 'Play Again' : 'Try Again'}
            </button>
          )}

          {!isVictory && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestartSector();
              }}
              className="w-full py-2.5 rounded-lg bg-[#13273a] hover:bg-[#1a344c] border border-slate-600/60 text-slate-100 font-medium text-sm cursor-pointer"
            >
              Restart Current Sector
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="w-full py-2.5 rounded-lg bg-transparent hover:bg-slate-800/60 border border-slate-700/70 text-slate-300 font-medium text-sm cursor-pointer"
          >
            Back to Title
          </button>
        </div>
      </div>
    </div>
  );
};
