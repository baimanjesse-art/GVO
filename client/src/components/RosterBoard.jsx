import { useEffect, useState } from "react";
import { POSITIONS, teamMeta } from "../../../shared/constants.js";
import { fitDistance } from "../../../shared/sim.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

/**
 * The five-slot roster board. When `placing` (a selected player) is set,
 * open slots become clickable and show fit quality for that player.
 * When `onSwap` is provided (and nothing is being placed), locked-in players
 * can be rearranged: tap a player, then tap another slot to swap or move.
 */
export default function RosterBoard({ roster, placing, onPlace, onSwap, title, accent, compact }) {
  const [swapFrom, setSwapFrom] = useState(null);
  const swapMode = Boolean(onSwap) && !placing;
  const filled = POSITIONS.filter((pos) => roster[pos]).length;

  useEffect(() => {
    if (!swapMode) setSwapFrom(null);
  }, [swapMode]);

  function handleSlotTap(pos, hasPlayer) {
    if (!swapMode) return;
    if (swapFrom === null) {
      if (hasPlayer) setSwapFrom(pos);
      return;
    }
    if (swapFrom === pos) {
      setSwapFrom(null);
      return;
    }
    onSwap(swapFrom, pos);
    setSwapFrom(null);
  }

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
          const placedDist = p ? fitDistance(p, pos) : 0;
          const isSwapSource = swapMode && swapFrom === pos;
          const isSwapTarget = swapMode && swapFrom !== null && swapFrom !== pos;
          const swapClickable = swapMode && (p || swapFrom !== null);
          return (
            <button
              key={pos}
              disabled={!canPlace && !swapClickable}
              onClick={() =>
                canPlace ? onPlace(pos) : handleSlotTap(pos, Boolean(p))
              }
              className={`flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all ${
                p
                  ? isSwapSource
                    ? "border-hoop bg-hoop/15 ring-1 ring-hoop"
                    : isSwapTarget
                      ? "border-hoop/50 bg-panel2 hover:bg-hoop/10"
                      : "border-line bg-panel2"
                  : canPlace
                    ? `border bg-panel2/70 hover:bg-panel2 ${fitColor} animate-pulse`
                    : isSwapTarget
                      ? "border-dashed border-hoop/50 bg-transparent hover:bg-hoop/10"
                      : "border-dashed border-line bg-transparent"
              } ${canPlace || swapClickable ? "cursor-pointer active:scale-[0.98]" : ""}`}
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
                  {placedDist >= 1 && (
                    <span
                      title={placedDist === 1 ? "playing a stretch position" : "out of position"}
                      className={`flex-none rounded px-1 text-[9px] font-bold ${
                        placedDist === 1 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {placedDist === 1 ? "STRETCH" : "OOP"}
                    </span>
                  )}
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
                  {canPlace
                    ? `tap to place · ${fitLabel}`
                    : isSwapTarget
                      ? "move here"
                      : "empty"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {swapMode && filled >= 1 && (
        <div className="mt-2 text-center text-[10px] text-slate-500">
          {swapFrom
            ? "now tap another slot to swap · tap again to cancel"
            : "↔ tap a player, then another slot, to rearrange positions"}
        </div>
      )}
    </div>
  );
}
