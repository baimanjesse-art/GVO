import { teamMeta } from "../../../shared/constants.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

function ovrColor(r) {
  if (r >= 95) return "text-amber-300";
  if (r >= 88) return "text-orange-400";
  if (r >= 80) return "text-emerald-400";
  if (r >= 73) return "text-sky-400";
  return "text-slate-400";
}

export default function PlayerCard({ player, selected, disabled, onClick, compact }) {
  const meta = teamMeta(player.team);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-150 ${
        selected
          ? "border-hoop bg-panel2 ring-2 ring-hoop/70 animate-glow-pulse"
          : "border-line bg-panel hover:-translate-y-0.5 hover:border-slate-500 hover:bg-panel2 hover:shadow-lg hover:shadow-black/40"
      } ${disabled ? "cursor-not-allowed opacity-40" : "active:scale-[0.98]"}`}
    >
      {/* team color wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{ background: `linear-gradient(180deg, ${meta.color}40 0%, transparent 100%)` }}
      />

      <div className="relative flex items-stretch gap-2 p-2.5 pb-1.5">
        <PlayerPhoto
          name={player.name}
          team={player.team}
          className="h-16 w-[4.5rem] flex-none rounded-lg border border-white/10"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate font-display text-lg font-bold uppercase leading-tight tracking-wide">
            {player.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
            <span
              className="rounded px-1 py-px font-bold text-white/95"
              style={{ background: meta.color }}
            >
              {player.positions.join("/")}
            </span>
            <span className="font-semibold text-slate-400">
              {meta.abbr} · {player.decade}
            </span>
          </div>
        </div>
        <div className="flex flex-none flex-col items-center justify-center pl-1">
          <div className={`font-display text-4xl font-bold leading-none tabular-nums ${ovrColor(player.rating)}`}>
            {player.rating}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            OVR
          </div>
        </div>
      </div>

      {!compact && (
        <div className="relative grid grid-cols-3 gap-px border-t border-line/60 bg-line/40 text-center text-xs">
          {[
            [player.pts, "PPG"],
            [player.reb, "RPG"],
            [player.ast, "APG"],
          ].map(([v, label]) => (
            <div key={label} className="bg-panel/90 py-1.5">
              <span className="font-bold tabular-nums">{v}</span>
              <span className="ml-1 text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
