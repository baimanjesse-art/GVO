import { useEffect, useRef, useState } from "react";
import { POSITIONS, teamMeta } from "../../../shared/constants.js";
import { fitDistance } from "../../../shared/sim.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

/**
 * Both teams on ONE full court. Team A defends the near basket, Team B the far
 * one. Responsive: a horizontal court (A left / B right) on wide screens, and a
 * vertical court (A top / B bottom) on phones so the players stay legible.
 *
 * Team A is always static. Team B can be made interactive (`interactiveB`) for
 * the draft — its empty spots light up as legal landing spots and its players
 * can be tapped to swap, exactly like the half-court board.
 */

// Each spot as fractions of a half: d = depth from that team's own baseline
// (0 = at the rim, 1 = center line), l = lateral position (0..1 across width).
const SPOT = {
  PG: { d: 0.65, l: 0.5, label: "Top of the Key" },
  SG: { d: 0.46, l: 0.84, label: "The Wing" },
  SF: { d: 0.13, l: 0.13, label: "The Corner" },
  PF: { d: 0.4, l: 0.5, label: "Free-Throw Line" },
  C: { d: 0.155, l: 0.68, label: "The Block" },
};
const ORDER = ["C", "SF", "PF", "SG", "PG"];

function place(pos, side, orientation) {
  const { d, l } = SPOT[pos];
  if (orientation === "vertical") {
    return side === "A"
      ? { left: l * 100, top: ((d * 47) / 94) * 100 }
      : { left: (1 - l) * 100, top: ((94 - d * 47) / 94) * 100 };
  }
  return side === "A"
    ? { left: ((d * 47) / 94) * 100, top: l * 100 }
    : { left: ((94 - d * 47) / 94) * 100, top: (1 - l) * 100 };
}

function shortName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

export default function FullCourt({
  teamA,
  teamB,
  nameA,
  nameB,
  accentA = "#38bdf8",
  accentB = "#fb7185",
  interactiveB,
}) {
  const [swapFrom, setSwapFrom] = useState(null);
  const rootRef = useRef(null);
  const lastPlacing = useRef(null);
  const placing = interactiveB?.placing || null;

  // Reset a half-made swap whenever we enter placing mode or interaction ends.
  useEffect(() => {
    if (placing || !interactiveB?.onSwap) setSwapFrom(null);
  }, [placing, interactiveB?.onSwap]);

  // Bring the court (your half) into view when you pick a player to place.
  useEffect(() => {
    const name = placing?.name ?? null;
    if (name && name !== lastPlacing.current && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.5) {
        rootRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    lastPlacing.current = name;
  }, [placing]);

  const filledB = POSITIONS.filter((p) => teamB[p]).length;

  return (
    <div
      ref={rootRef}
      className="scroll-mt-20 overflow-hidden rounded-2xl border border-[#3a2917] bg-[#241708] shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-between border-b border-[#3a2917] bg-gradient-to-b from-black/60 to-black/30 px-3 py-2 text-xs font-display font-bold uppercase tracking-[0.15em]">
        <span className="truncate" style={{ color: accentA }}>● {nameA}</span>
        <span className="truncate text-right" style={{ color: accentB }}>
          {interactiveB ? `${nameB} · ${filledB}/5` : nameB} ●
        </span>
      </div>
      <div className="lg:hidden">
        <Court orientation="vertical" {...{ teamA, teamB, accentA, accentB, interactiveB, swapFrom, setSwapFrom }} />
      </div>
      <div className="hidden lg:block">
        <Court orientation="horizontal" {...{ teamA, teamB, accentA, accentB, interactiveB, swapFrom, setSwapFrom }} />
      </div>
      {interactiveB?.onSwap && !placing && filledB >= 1 && (
        <div className="border-t border-[#3a2917] bg-black/40 px-2 py-1.5 text-center text-[10px] text-[#b18a5c]">
          {swapFrom
            ? "now tap another spot to swap · tap him again to cancel"
            : "↔ tap one of your players, then another spot, to move him"}
        </div>
      )}
    </div>
  );
}

function Court({ orientation, teamA, teamB, accentA, accentB, interactiveB, swapFrom, setSwapFrom }) {
  const vertical = orientation === "vertical";
  const size = vertical ? 19 : 12;
  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: vertical ? "50 / 94" : "94 / 50" }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(rgba(20,10,2,0.35), rgba(20,10,2,0.55)), repeating-linear-gradient(90deg, #a06a33 0 9%, #916030 9% 18%, #aa713a 18% 27%, #8d5c2d 27% 36%)",
        }}
      />
      {vertical ? <VerticalLines accentA={accentA} accentB={accentB} /> : <HorizontalLines accentA={accentA} accentB={accentB} />}

      {/* Team A — always static */}
      {ORDER.map((pos) => {
        const p = teamA[pos];
        if (!p) return null;
        const { left, top } = place(pos, "A", orientation);
        return <Dot key={`a-${pos}`} p={p} pos={pos} left={left} top={top} size={size} accent={accentA} />;
      })}

      {/* Team B — static, or interactive during the draft */}
      {ORDER.map((pos) => {
        const coords = place(pos, "B", orientation);
        if (interactiveB) {
          return (
            <Spot
              key={`b-${pos}`}
              pos={pos}
              player={teamB[pos]}
              roster={teamB}
              coords={coords}
              size={size}
              accent={accentB}
              swapFrom={swapFrom}
              setSwapFrom={setSwapFrom}
              {...interactiveB}
            />
          );
        }
        const p = teamB[pos];
        if (!p) return null;
        return <Dot key={`b-${pos}`} p={p} pos={pos} left={coords.left} top={coords.top} size={size} accent={accentB} />;
      })}
    </div>
  );
}

function Dot({ p, pos, left, top, size, accent }) {
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${left}%`, top: `${top}%`, width: `${size}%` }}
    >
      <span
        className="relative block rounded-full"
        style={{ width: "78%", border: `2px solid ${teamMeta(p.team).color}`, borderRadius: "9999px", boxShadow: "0 3px 8px rgba(0,0,0,0.55)" }}
      >
        <PlayerPhoto name={p.name} team={p.team} className="aspect-square w-full rounded-full" />
        <span className="absolute -right-1 -top-1 rounded bg-black/85 px-0.5 font-display text-[9px] font-bold leading-3 text-hoop2">
          {p.rating}
        </span>
      </span>
      <span className="mt-0.5 max-w-full truncate rounded bg-black/70 px-1 py-px font-display text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-100 sm:text-[10px]">
        <span style={{ color: accent }}>{pos}</span> {shortName(p.name)}
      </span>
    </div>
  );
}

// Interactive spot for your (team B) half — mirrors the half-court board.
function Spot({ pos, player, roster, coords, size, accent, placing, onPlace, onSwap, strictFit, onlySlots, swapFrom, setSwapFrom }) {
  const dist = placing && !player ? fitDistance(placing, pos) : null;
  const allowed = (!onlySlots || onlySlots.includes(pos)) && !(strictFit && dist !== 0);
  const canPlace = Boolean(placing && !player && allowed);
  const fitLabel = dist === 0 ? "natural fit" : dist === 1 ? "stretch" : "out of position";
  const fitColor = dist === 0 ? "#34d399" : dist === 1 ? "#fbbf24" : "#fb7185";
  const placedDist = player ? fitDistance(player, pos) : 0;
  const swapMode = Boolean(onSwap) && !placing;
  const isSwapSource = swapMode && swapFrom === pos;
  const strictSwapOk =
    !strictFit ||
    swapFrom === null ||
    (fitDistance(roster[swapFrom], pos) === 0 && (!player || fitDistance(player, swapFrom) === 0));
  const isSwapTarget = swapMode && swapFrom !== null && swapFrom !== pos && strictSwapOk;
  const swapClickable = swapMode && (swapFrom === null ? Boolean(player) : swapFrom === pos || isSwapTarget);
  const clickable = canPlace || swapClickable;

  function handleTap() {
    if (canPlace) return onPlace(pos);
    if (!swapMode) return;
    if (swapFrom === null) {
      if (player) setSwapFrom(pos);
      return;
    }
    if (swapFrom === pos) return setSwapFrom(null);
    onSwap(swapFrom, pos);
    setSwapFrom(null);
  }

  return (
    <button
      disabled={!clickable}
      onClick={handleTap}
      className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${clickable ? "cursor-pointer" : ""}`}
      style={{ left: `${coords.left}%`, top: `${coords.top}%`, width: `${size}%` }}
    >
      {player ? (
        <>
          <span
            className={`relative block rounded-full transition-transform ${
              isSwapSource ? "scale-110 animate-glow-pulse" : isSwapTarget ? "animate-pulse" : ""
            }`}
            style={{
              width: "78%",
              border: `2px solid ${isSwapSource || isSwapTarget ? "#f97316" : teamMeta(player.team).color}`,
              borderRadius: "9999px",
              boxShadow: "0 3px 8px rgba(0,0,0,0.55)",
            }}
          >
            <PlayerPhoto name={player.name} team={player.team} className="aspect-square w-full rounded-full" />
            <span className="absolute -right-1 -top-1 rounded bg-black/85 px-0.5 font-display text-[9px] font-bold leading-3 text-hoop2">
              {player.rating}
            </span>
            {placedDist >= 1 && (
              <span
                className={`absolute -left-1 -top-1 rounded px-0.5 font-display text-[8px] font-bold leading-3 ${
                  placedDist === 1 ? "bg-amber-400/90 text-black" : "bg-rose-500/90 text-white"
                }`}
              >
                {placedDist === 1 ? "ST" : "OOP"}
              </span>
            )}
          </span>
          <span className="mt-0.5 max-w-full truncate rounded bg-black/70 px-1 py-px font-display text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-100 sm:text-[10px]">
            <span style={{ color: accent }}>{pos}</span> {shortName(player.name)}
          </span>
        </>
      ) : (
        <>
          <span
            className={`flex aspect-square items-center justify-center rounded-full border-2 border-dashed font-display text-xs font-bold ${
              canPlace
                ? "animate-pulse bg-black/30"
                : isSwapTarget
                  ? "animate-pulse border-hoop/80 bg-black/30 text-hoop2"
                  : placing && !allowed
                    ? "border-white/15 text-white/25"
                    : "border-white/35 text-white/60"
            }`}
            style={{ width: "78%", ...(canPlace ? { borderColor: fitColor, color: fitColor } : {}) }}
          >
            {pos}
          </span>
          <span
            className="mt-0.5 rounded bg-black/55 px-1 py-px text-center font-display text-[8px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]"
            style={{
              color: canPlace ? fitColor : isSwapTarget ? "#fdba74" : placing && !allowed ? "rgba(255,255,255,0.3)" : "rgba(243,227,195,0.75)",
            }}
          >
            {canPlace ? fitLabel : isSwapTarget ? "move here" : placing && !allowed ? "not his spot" : SPOT[pos].label}
          </span>
        </>
      )}
    </button>
  );
}

const LINE = { stroke: "#f3e3c3", strokeOpacity: 0.75, strokeWidth: 0.35, fill: "none" };

function VerticalLines({ accentA, accentB }) {
  return (
    <svg viewBox="0 0 50 94" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <g {...LINE}>
        <rect x="17" y="0" width="16" height="19" fill={accentA} fillOpacity="0.26" />
        <circle cx="25" cy="19" r="6" />
        <path d="M21 5.4 A4 4 0 0 0 29 5.4" />
        <path d="M3 0 L3 14.1 A23.75 23.75 0 0 0 47 14.1 L47 0" />
        <line x1="22" y1="4" x2="28" y2="4" strokeWidth="0.6" />
        <rect x="17" y="75" width="16" height="19" fill={accentB} fillOpacity="0.26" />
        <circle cx="25" cy="75" r="6" />
        <path d="M21 88.6 A4 4 0 0 1 29 88.6" />
        <path d="M3 94 L3 79.9 A23.75 23.75 0 0 1 47 79.9 L47 94" />
        <line x1="22" y1="90" x2="28" y2="90" strokeWidth="0.6" />
        <line x1="0" y1="47" x2="50" y2="47" />
        <circle cx="25" cy="47" r="6" />
        <rect x="0.2" y="0.2" width="49.6" height="93.6" strokeOpacity="0.5" />
      </g>
      <circle cx="25" cy="5.6" r="0.9" stroke="#fb923c" strokeWidth="0.45" fill="none" />
      <circle cx="25" cy="88.4" r="0.9" stroke="#fb923c" strokeWidth="0.45" fill="none" />
      <text x="25" y="48.4" textAnchor="middle" fill="#f3e3c3" fillOpacity="0.4" fontSize="2.4" fontFamily="Barlow Condensed, sans-serif" fontWeight="700" letterSpacing="0.3">82-0 ARENA</text>
    </svg>
  );
}

function HorizontalLines({ accentA, accentB }) {
  return (
    <svg viewBox="0 0 94 50" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <g {...LINE}>
        <rect x="0" y="17" width="19" height="16" fill={accentA} fillOpacity="0.26" />
        <circle cx="19" cy="25" r="6" />
        <path d="M5.4 21 A4 4 0 0 1 5.4 29" />
        <path d="M0 3 L14.1 3 A23.75 23.75 0 0 1 14.1 47 L0 47" />
        <line x1="4" y1="22" x2="4" y2="28" strokeWidth="0.6" />
        <rect x="75" y="17" width="19" height="16" fill={accentB} fillOpacity="0.26" />
        <circle cx="75" cy="25" r="6" />
        <path d="M88.6 21 A4 4 0 0 0 88.6 29" />
        <path d="M94 3 L79.9 3 A23.75 23.75 0 0 0 79.9 47 L94 47" />
        <line x1="90" y1="22" x2="90" y2="28" strokeWidth="0.6" />
        <line x1="47" y1="0" x2="47" y2="50" />
        <circle cx="47" cy="25" r="6" />
        <rect x="0.2" y="0.2" width="93.6" height="49.6" strokeOpacity="0.5" />
      </g>
      <circle cx="5.6" cy="25" r="0.9" stroke="#fb923c" strokeWidth="0.45" fill="none" />
      <circle cx="88.4" cy="25" r="0.9" stroke="#fb923c" strokeWidth="0.45" fill="none" />
      <text x="47" y="26" textAnchor="middle" fill="#f3e3c3" fillOpacity="0.4" fontSize="2.4" fontFamily="Barlow Condensed, sans-serif" fontWeight="700" letterSpacing="0.3">82-0 ARENA</text>
    </svg>
  );
}
