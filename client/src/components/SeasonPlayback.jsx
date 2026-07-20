import { useEffect, useRef, useState } from "react";

const MONTHS = ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR"];

/**
 * Plays the 82-game season back game by game: running record, live win/loss
 * strip, streak callouts. `result.games` is the per-game W/L array.
 */
export default function SeasonPlayback({ result, teamName = "YOUR SQUAD", onDone }) {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(null);
  const doneRef = useRef(false);

  const games = result.games || [];
  const total = games.length || 82;

  useEffect(() => {
    if (idx >= total) {
      const t = setTimeout(() => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }, 700);
      return () => clearTimeout(t);
    }
    // starts deliberate, accelerates into mid-season, slows for the finale
    const delay = idx < 8 ? 130 : idx > total - 6 ? 150 : 34;
    const t = setTimeout(() => setIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [idx, total, onDone]);

  const played = games.slice(0, idx);
  const wins = played.filter(Boolean).length;
  const losses = played.length - wins;

  // current streak for callouts
  let streak = 0;
  for (let i = played.length - 1; i >= 0 && played[i] === played[played.length - 1]; i--) streak++;
  const streakType = played[played.length - 1];

  useEffect(() => {
    if (streakType && streak >= 7 && streak % 3 === 1) {
      setFlash(`🔥 ${streak} straight wins`);
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
    if (streakType === false && streak >= 5 && streak % 3 === 0) {
      setFlash(`🥶 ${streak}-game skid`);
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const month = MONTHS[Math.min(MONTHS.length - 1, Math.floor((idx / total) * MONTHS.length))];
  const last12 = played.slice(-12);

  return (
    <div className="animate-pop mx-auto max-w-lg">
      <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-line bg-black/30 px-5 py-2.5">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            {teamName}
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-widest text-hoop2">
            {idx >= total ? "FINAL" : month}
          </span>
        </div>

        <div className="px-5 py-7 text-center">
          <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
            82-game season
          </div>
          <div className="mt-1 font-display text-7xl font-bold tabular-nums leading-none sm:text-8xl">
            <span className="text-emerald-400">{wins}</span>
            <span className="mx-2 text-slate-600">–</span>
            <span className="text-rose-400">{losses}</span>
          </div>

          <div className="mt-4 flex h-6 items-center justify-center gap-1">
            {flash ? (
              <span className="animate-pop font-display text-lg font-bold uppercase tracking-wider text-hoop2">
                {flash}
              </span>
            ) : (
              last12.map((w, i) => (
                <span
                  key={`${idx}-${i}`}
                  className={`inline-block h-5 w-3.5 rounded-sm font-bold ${
                    w ? "bg-emerald-500/80" : "bg-rose-500/70"
                  } ${i === last12.length - 1 ? "animate-pop" : "opacity-70"}`}
                />
              ))
            )}
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-hoop to-hoop2 transition-all duration-100"
              style={{ width: `${(idx / total) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-slate-500">
            <span>Game {Math.min(idx, total)} of {total}</span>
            <span>{Math.round((idx / total) * 100)}%</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
        }}
        className="mx-auto mt-4 block rounded-lg border border-line px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:bg-panel2 hover:text-slate-200"
      >
        Skip to results →
      </button>
    </div>
  );
}
