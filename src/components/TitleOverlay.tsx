import React from 'react';

interface TitleOverlayProps {
  onStart: () => void;
  bestScore: number;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({ onStart, bestScore }) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-14 pointer-events-none">
      {/* Upper-Left Calm Negative Space Lockup */}
      <div className="max-w-xl pt-4 md:pt-8 pointer-events-auto">
        <svg
          viewBox="0 0 540 168"
          className="w-full max-w-[500px] h-auto drop-shadow-[0_6px_24px_rgba(0,0,0,0.85)]"
          role="img"
          aria-label="Darwin's Paradox"
        >
          <defs>
            <linearGradient id="coralStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff6b4a" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
          </defs>

          <text
            x="10"
            y="58"
            fill="#f8fafc"
            fontFamily="Bricolage Grotesque, system-ui, sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="-1.5"
          >
            DARWIN&apos;S
          </text>
          <text
            x="10"
            y="108"
            fill="#ff6b4a"
            fontFamily="Bricolage Grotesque, system-ui, sans-serif"
            fontWeight="800"
            fontSize="52"
            letterSpacing="1"
          >
            PARADOX
          </text>

          {/* Tentacle swirl motif cleanly below the title */}
          <path
            d="M12 132 C 42 132, 52 122, 82 126 C 112 130, 118 148, 156 146 C 192 144, 210 132, 246 132"
            fill="none"
            stroke="url(#coralStroke)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="62" cy="126" r="2.8" fill="#ffd6c9" />
          <circle cx="106" cy="136" r="2.5" fill="#ffd6c9" />
          <circle cx="148" cy="146" r="2.8" fill="#5eead4" />
          <circle cx="196" cy="138" r="2.4" fill="#5eead4" />

          <text
            x="264"
            y="137"
            fill="#94a3b8"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="13"
            letterSpacing="2.5"
          >
            ESCAPE FROM UFOOD
          </text>
        </svg>

        <p className="mt-4 max-w-md text-sm md:text-base text-slate-300/90 leading-relaxed">
          Outsmart security optics, morph your skin into steel, blind sentries with ink, and crawl back to the open sea.
        </p>

        <div className="mt-7 flex items-center gap-6">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-7 py-3.5 rounded-lg bg-[#ff6b4a] hover:bg-[#ff7f62] active:scale-[0.98] text-[#061017] font-display font-bold text-base tracking-wide shadow-[0_6px_24px_rgba(255,107,74,0.35)] transition-transform duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
          >
            Start Escape
          </button>

          {bestScore > 0 && (
            <div className="text-sm text-slate-300 font-mono-tabular">
              Best Score <span className="text-[#5eead4] font-bold">{bestScore}</span>
            </div>
          )}
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line */}
      <div className="w-full text-center pb-1">
        <p className="text-xs md:text-sm text-slate-300/80 tracking-wide font-mono-tabular">
          WASD / Arrows Move · Space Jump · Shift / C Camo · E / Click Tentacle Grab · Q / R-Click Ink Blast · Esc Pause
        </p>
      </div>
    </div>
  );
};
