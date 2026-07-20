import { POSITIONS, teamMeta } from "../../../shared/constants.js";
import { fitDistance } from "../../../shared/sim.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

/**
 * The five-slot roster board. When `placing` (a selected player) is set,
 * open slots become clickable and show fit quality for that player.
 */
export default function RosterBoard({ roster, placing, onPlace, title, accent, compact }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      {title && (
        <div
          className="mb-2 font-display text-base font-bold uppercase tracking-[0.15em]"
          style={accent ? { color: accent } : undefined}
        >
          {title}
        </div>
      )}
      <div className="space-y-1.5">
        {POSITIONS.map((pos) => {
          const p = roster[pos];
          const canPlace = placing && !p;
          const dist = canPlace ? fitDistance(placing, pos) : null;
          const fitLabel =
            dist === 0 ? "natural fit" : dist === 1 ? "stretch" : "out of position";
          const fitColor =
            dist === 0
              ? "text-emerald-400 border-emerald-500/70"
              : dist === 1
                ? "text-amber-400 border-amber-500/70"
                : "text-rose-400 border-rose-500/70";
          return (
            <button
              key={pos}
              disabled={!canPlace}
              onClick={() => canPlace && onPlace(pos)}
              className={`flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all ${
                p
                  ? "border-line bg-panel2"
                  : canPlace
                    ? `border bg-panel2/70 hover:bg-panel2 ${fitColor} animate-pulse`
                    : "border-dashed border-line bg-transparent"
              } ${canPlace ? "cursor-pointer active:scale-[0.98]" : ""}`}
            >
              <span className="w-7 flex-none text-center font-display text-sm font-bold text-slate-400">
                {pos}
              </span>
              {p ? (
                <>
                  <PlayerPhoto
                    name={p.name}
                    team={p.team}
                    className="h-9 w-9 flex-none rounded-lg border border-white/10"
                  />
                  <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold uppercase tracking-wide">
                    {p.name}
                  </span>
                  {!compact && (
                    <span
                      className="flex-none rounded px-1 text-[9px] font-bold text-white/95"
                      style={{ background: teamMeta(p.team).color }}
                    >
                      {teamMeta(p.team).abbr} '{p.decade.slice(2, 4)}
                    </span>
                  )}
                  <span className="flex-none font-display text-lg font-bold tabular-nums text-hoop2">
                    {p.rating}
                  </span>
                </>
              ) : (
                <span className="flex-1 py-1.5 text-xs text-slate-500">
                  {canPlace ? `tap to place · ${fitLabel}` : "empty"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
