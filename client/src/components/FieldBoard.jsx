import { useEffect, useRef, useState } from "react";
import { SLOTS, SLOT_LABEL, teamMeta } from "../../../shared/football/constants.js";
import { fitDistance } from "../../../shared/football/sim.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

/**
 * The football counterpart to CourtBoard: the seven-man roster laid out as a
 * spread offense on a field — QB in the gun, RB in the backfield, receivers
 * split wide and in the slot, TE on the line, and a FLEX. Same contract as
 * CourtBoard so the Solo flow can drop in either board: `placing` lights up
 * legal landing spots, `onSwap` taps two spots to rearrange, `strictFit`
 * restricts to natural fits and `onlySlots` pins a pick to given slots.
 */
const SPOTS = {
  WR1: { x: 11, y: 45, spot: "Split End" },
  TE: { x: 63, y: 48, spot: "Tight End" },
  WR2: { x: 89, y: 45, spot: "Flanker" },
  WR3: { x: 27, y: 58, spot: "The Slot" },
  FLEX: { x: 77, y: 61, spot: "Flex" },
  QB: { x: 50, y: 76, spot: "Under Center" },
  RB: { x: 34, y: 85, spot: "Backfield" },
};

export default function FieldBoard({
  roster,
  placing,
  onPlace,
  onSwap,
  onlySlots,
  strictFit,
  title,
  accent,
  compact,
}) {
  const [swapFrom, setSwapFrom] = useState(null);
  const swapMode = Boolean(onSwap) && !placing;
  const filled = SLOTS.filter((slot) => roster[slot]).length;

  const rootRef = useRef(null);
  const lastPlacedName = useRef(null);

  useEffect(() => {
    if (!swapMode) setSwapFrom(null);
  }, [swapMode]);

  // Bring the field into view when a player is picked (only if it's below the
  // fold — on the desktop side-by-side layout it's already visible).
  useEffect(() => {
    const name = placing?.name ?? null;
    if (name && name !== lastPlacedName.current && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.5) {
        rootRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    lastPlacedName.current = name;
  }, [placing]);

  function handleSpotTap(slot, hasPlayer) {
    if (!swapMode) return;
    if (swapFrom === null) {
      if (hasPlayer) setSwapFrom(slot);
      return;
    }
    if (swapFrom === slot) {
      setSwapFrom(null);
      return;
    }
    onSwap(swapFrom, slot);
    setSwapFrom(null);
  }

  const paint = accent || "#22c55e";

  return (
    <div
      ref={rootRef}
      className="scroll-mt-20 overflow-hidden rounded-2xl border border-[#14431f] bg-[#0b3018] shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
    >
      {title && (
        <div className="flex items-center justify-between border-b border-[#14431f] bg-gradient-to-b from-black/60 to-black/30 px-3 py-2">
          <span
            className="font-display text-base font-bold uppercase tracking-[0.15em]"
            style={{ color: accent || "#86efac" }}
          >
            {title}
          </span>
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-[#4e8a63]">
            {filled}/{SLOTS.length} on the field
          </span>
        </div>
      )}

      <div className="relative mx-auto w-full" style={{ aspectRatio: "50 / 56" }}>
        {/* turf — mown stripes */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(rgba(4,30,12,0.30), rgba(4,30,12,0.50)), repeating-linear-gradient(0deg, #157a37 0 8.5%, #12692f 8.5% 17%)",
          }}
        />
        {/* field markings */}
        <svg
          viewBox="0 0 50 56"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <g stroke="#eafff0" strokeOpacity="0.7" strokeWidth="0.28" fill="none">
            {/* end zone at the top */}
            <rect x="0.2" y="0.2" width="49.6" height="7" fill={paint} fillOpacity="0.22" />
            <line x1="0" y1="7.2" x2="50" y2="7.2" strokeWidth="0.5" />
            {/* yard lines every ~8 units */}
            {[15, 23, 31, 39, 47].map((y) => (
              <line key={y} x1="0" y1={y} x2="50" y2={y} />
            ))}
            {/* hash marks down the middle */}
            {[11, 19, 27, 35, 43, 51].map((y) => (
              <g key={`h${y}`}>
                <line x1="20" y1={y} x2="21" y2={y} strokeWidth="0.22" />
                <line x1="29" y1={y} x2="30" y2={y} strokeWidth="0.22" />
              </g>
            ))}
            {/* sideline box */}
            <rect x="0.2" y="0.2" width="49.6" height="55.6" strokeOpacity="0.5" />
          </g>
          <text
            x="25"
            y="4.7"
            textAnchor="middle"
            fill="#eafff0"
            fillOpacity="0.55"
            fontSize="2.6"
            fontFamily="Barlow Condensed, sans-serif"
            fontWeight="700"
            letterSpacing="0.5"
          >
            82-0 ARENA
          </text>
        </svg>

        {/* players on their spots */}
        {SLOTS.map((slot) => {
          const p = roster[slot];
          const dist = placing && !p ? fitDistance(placing, slot) : null;
          const allowed =
            (!onlySlots || onlySlots.includes(slot)) && !(strictFit && dist !== 0);
          const canPlace = Boolean(placing && !p && allowed);
          const fitLabel =
            dist === 0 ? "natural fit" : dist === 1 ? "stretch" : "out of position";
          const fitColor = dist === 0 ? "#34d399" : dist === 1 ? "#fbbf24" : "#fb7185";
          const placedDist = p ? fitDistance(p, slot) : 0;
          const isSwapSource = swapMode && swapFrom === slot;
          const strictSwapOk =
            !strictFit ||
            swapFrom === null ||
            (fitDistance(roster[swapFrom], slot) === 0 &&
              (!p || fitDistance(p, swapFrom) === 0));
          const isSwapTarget =
            swapMode && swapFrom !== null && swapFrom !== slot && strictSwapOk;
          const swapClickable =
            swapMode && (swapFrom === null ? Boolean(p) : swapFrom === slot || isSwapTarget);
          const clickable = canPlace || swapClickable;
          const { x, y, spot } = SPOTS[slot];
          const label = SLOT_LABEL[slot] || slot;

          return (
            <button
              key={slot}
              disabled={!clickable}
              onClick={() => (canPlace ? onPlace(slot) : handleSpotTap(slot, Boolean(p)))}
              className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
                clickable ? "cursor-pointer" : ""
              }`}
              style={{ left: `${x}%`, top: `${y}%`, width: compact ? "24%" : "22%" }}
            >
              {p ? (
                <>
                  <span
                    className={`relative block rounded-full transition-transform ${
                      isSwapSource
                        ? "scale-110 animate-glow-pulse"
                        : isSwapTarget
                          ? "animate-pulse"
                          : ""
                    }`}
                    style={{
                      width: compact ? "60%" : "58%",
                      border: `2.5px solid ${
                        isSwapSource || isSwapTarget ? "#22c55e" : teamMeta(p.team).color
                      }`,
                      borderRadius: "9999px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.55)",
                    }}
                  >
                    <PlayerPhoto
                      name={p.name}
                      team={p.team}
                      className="aspect-square w-full rounded-full"
                    />
                    <span className="absolute -right-1.5 -top-1.5 rounded-md bg-black/85 px-1 font-display text-[11px] font-bold leading-4 text-emerald-300">
                      {p.rating}
                    </span>
                    {placedDist >= 1 && (
                      <span
                        title={placedDist === 1 ? "stretch position" : "out of position"}
                        className={`absolute -left-1.5 -top-1.5 rounded-md px-1 font-display text-[9px] font-bold leading-4 ${
                          placedDist === 1
                            ? "bg-amber-400/90 text-black"
                            : "bg-rose-500/90 text-white"
                        }`}
                      >
                        {placedDist === 1 ? "ST" : "OOP"}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 max-w-full rounded bg-black/70 px-1 py-px font-display text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-100 sm:text-[11px]">
                    <span className="text-emerald-300">{label}</span>{" "}
                    <span className="truncate">{shortName(p.name)}</span>
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`flex aspect-square items-center justify-center rounded-full border-2 border-dashed font-display text-sm font-bold ${
                      canPlace
                        ? "animate-pulse bg-black/30"
                        : isSwapTarget
                          ? "animate-pulse border-emerald-400/80 bg-black/30 text-emerald-300"
                          : placing && !allowed
                            ? "border-white/15 text-white/25"
                            : "border-white/35 text-white/60"
                    }`}
                    style={{
                      width: compact ? "60%" : "58%",
                      ...(canPlace ? { borderColor: fitColor, color: fitColor } : {}),
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="mt-0.5 rounded bg-black/55 px-1 py-px text-center font-display text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]"
                    style={{
                      color: canPlace
                        ? fitColor
                        : isSwapTarget
                          ? "#86efac"
                          : placing && !allowed
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(234,255,240,0.75)",
                    }}
                  >
                    {canPlace
                      ? fitLabel
                      : isSwapTarget
                        ? "move here"
                        : placing && !allowed
                          ? "not his spot"
                          : spot}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {swapMode && filled >= 1 && (
        <div className="border-t border-[#14431f] bg-black/40 px-2 py-1.5 text-center text-[10px] text-[#6fae86]">
          {swapFrom
            ? "now tap another spot to swap · tap him again to cancel"
            : "↔ tap a player, then another spot, to move him around the field"}
        </div>
      )}
    </div>
  );
}

function shortName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}
