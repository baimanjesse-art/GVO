import { teamMeta } from "../../../shared/constants.js";
import PlayerPhoto from "./PlayerPhoto.jsx";

/**
 * Both teams on ONE full court. Team A defends the near basket, Team B the far
 * one. Responsive: a horizontal court (A left / B right) on wide screens, and a
 * vertical court (A top / B bottom) on phones so the players stay legible.
 *
 * Read-only — this is the results view, no placing/swapping.
 */

// Each spot as fractions of a half: d = depth from that team's own baseline
// (0 = at the rim, 1 = center line), l = lateral position (0..1 across width).
// Taken from the half-court board so the two views feel identical.
const SPOT = {
  PG: { d: 0.65, l: 0.5 },
  SG: { d: 0.46, l: 0.84 },
  SF: { d: 0.13, l: 0.13 },
  PF: { d: 0.4, l: 0.5 },
  C: { d: 0.155, l: 0.68 },
};
const ORDER = ["C", "SF", "PF", "SG", "PG"];

// Convert a spot to a {left%, top%} for a team on a given side of the court.
function place(pos, side, orientation) {
  const { d, l } = SPOT[pos];
  if (orientation === "vertical") {
    // viewBox 50 x 94, basket A at top, basket B at bottom
    return side === "A"
      ? { left: l * 100, top: ((d * 47) / 94) * 100 }
      : { left: (1 - l) * 100, top: ((94 - d * 47) / 94) * 100 };
  }
  // horizontal viewBox 94 x 50, basket A left, basket B right
  return side === "A"
    ? { left: ((d * 47) / 94) * 100, top: l * 100 }
    : { left: ((94 - d * 47) / 94) * 100, top: (1 - l) * 100 };
}

function shortName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

export default function FullCourt({ teamA, teamB, nameA, nameB, accentA = "#38bdf8", accentB = "#fb7185" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#3a2917] bg-[#241708] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between border-b border-[#3a2917] bg-gradient-to-b from-black/60 to-black/30 px-3 py-2 text-xs font-display font-bold uppercase tracking-[0.15em]">
        <span className="truncate" style={{ color: accentA }}>● {nameA}</span>
        <span className="truncate text-right" style={{ color: accentB }}>{nameB} ●</span>
      </div>
      {/* phone: vertical court */}
      <div className="lg:hidden">
        <Court orientation="vertical" teamA={teamA} teamB={teamB} accentA={accentA} accentB={accentB} />
      </div>
      {/* desktop: horizontal court */}
      <div className="hidden lg:block">
        <Court orientation="horizontal" teamA={teamA} teamB={teamB} accentA={accentA} accentB={accentB} />
      </div>
    </div>
  );
}

function Court({ orientation, teamA, teamB, accentA, accentB }) {
  const vertical = orientation === "vertical";
  const size = vertical ? 19 : 12; // avatar width as % of container
  return (
    <div
      className="relative mx-auto w-full"
      style={{ aspectRatio: vertical ? "50 / 94" : "94 / 50" }}
    >
      {/* hardwood */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(rgba(20,10,2,0.35), rgba(20,10,2,0.55)), repeating-linear-gradient(90deg, #a06a33 0 9%, #916030 9% 18%, #aa713a 18% 27%, #8d5c2d 27% 36%)",
        }}
      />
      {vertical ? (
        <VerticalLines accentA={accentA} accentB={accentB} />
      ) : (
        <HorizontalLines accentA={accentA} accentB={accentB} />
      )}
      {ORDER.map((pos) => {
        const p = teamA[pos];
        if (!p) return null;
        const { left, top } = place(pos, "A", orientation);
        return <Dot key={`a-${pos}`} p={p} pos={pos} left={left} top={top} size={size} accent={accentA} />;
      })}
      {ORDER.map((pos) => {
        const p = teamB[pos];
        if (!p) return null;
        const { left, top } = place(pos, "B", orientation);
        return <Dot key={`b-${pos}`} p={p} pos={pos} left={left} top={top} size={size} accent={accentB} />;
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
        style={{
          width: "78%",
          border: `2px solid ${teamMeta(p.team).color}`,
          borderRadius: "9999px",
          boxShadow: "0 3px 8px rgba(0,0,0,0.55)",
        }}
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

const LINE = { stroke: "#f3e3c3", strokeOpacity: 0.75, strokeWidth: 0.35, fill: "none" };

function VerticalLines({ accentA, accentB }) {
  return (
    <svg viewBox="0 0 50 94" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <g {...LINE}>
        {/* top team A */}
        <rect x="17" y="0" width="16" height="19" fill={accentA} fillOpacity="0.26" />
        <circle cx="25" cy="19" r="6" />
        <path d="M21 5.4 A4 4 0 0 0 29 5.4" />
        <path d="M3 0 L3 14.1 A23.75 23.75 0 0 0 47 14.1 L47 0" />
        <line x1="22" y1="4" x2="28" y2="4" strokeWidth="0.6" />
        {/* bottom team B */}
        <rect x="17" y="75" width="16" height="19" fill={accentB} fillOpacity="0.26" />
        <circle cx="25" cy="75" r="6" />
        <path d="M21 88.6 A4 4 0 0 1 29 88.6" />
        <path d="M3 94 L3 79.9 A23.75 23.75 0 0 1 47 79.9 L47 94" />
        <line x1="22" y1="90" x2="28" y2="90" strokeWidth="0.6" />
        {/* center + border */}
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
        {/* left team A */}
        <rect x="0" y="17" width="19" height="16" fill={accentA} fillOpacity="0.26" />
        <circle cx="19" cy="25" r="6" />
        <path d="M5.4 21 A4 4 0 0 1 5.4 29" />
        <path d="M0 3 L14.1 3 A23.75 23.75 0 0 1 14.1 47 L0 47" />
        <line x1="4" y1="22" x2="4" y2="28" strokeWidth="0.6" />
        {/* right team B */}
        <rect x="75" y="17" width="19" height="16" fill={accentB} fillOpacity="0.26" />
        <circle cx="75" cy="25" r="6" />
        <path d="M88.6 21 A4 4 0 0 0 88.6 29" />
        <path d="M94 3 L79.9 3 A23.75 23.75 0 0 0 79.9 47 L94 47" />
        <line x1="90" y1="22" x2="90" y2="28" strokeWidth="0.6" />
        {/* center + border */}
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
