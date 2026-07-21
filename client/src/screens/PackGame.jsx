import { useMemo, useState } from "react";
import { dealPacks, PACK_SIZE } from "../../../shared/packs.js";
import { evaluateTeam, makeRng } from "../../../shared/sim.js";
import { POSITIONS, teamMeta } from "../../../shared/constants.js";
import PlayerCard from "../components/PlayerCard.jsx";
import PlayerPhoto from "../components/PlayerPhoto.jsx";
import CourtBoard from "../components/CourtBoard.jsx";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";

const SPOT_LABEL = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};
const EMPTY = { PG: null, SG: null, SF: null, PF: null, C: null };
const BEST_KEY = "arena-pack-best";

export default function PackGame() {
  const { user, profile, refreshProfile } = useAuth();
  const [phase, setPhase] = useState("setup"); // setup | packs | result
  const [upgraded, setUpgraded] = useState(null);
  const [packs, setPacks] = useState(null);
  const [roster, setRoster] = useState(EMPTY);
  const [openPos, setOpenPos] = useState(null);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));

  const picked = POSITIONS.filter((p) => roster[p]).length;
  const allPicked = picked === PACK_SIZE;

  function startPacks(pos) {
    setUpgraded(pos);
    setPacks(dealPacks({ upgradedPosition: pos }));
    setRoster(EMPTY);
    setOpenPos(null);
    setPhase("packs");
  }

  function pick(pos, player) {
    setRoster((r) => ({ ...r, [pos]: player }));
    setOpenPos(null);
  }

  async function reveal() {
    const ev = evaluateTeam(roster);
    const overall = ev.overall;
    setResult({ ev, overall });
    setPhase("result");
    // record best team overall
    if (overall > best) {
      setBest(Math.round(overall));
      localStorage.setItem(BEST_KEY, String(Math.round(overall)));
    }
    if (user && supabase) {
      await supabase.rpc("record_pack_score", { p_overall: overall });
      refreshProfile?.();
    }
  }

  function reset() {
    setPhase("setup");
    setUpgraded(null);
    setPacks(null);
    setRoster(EMPTY);
    setOpenPos(null);
    setResult(null);
  }

  // ---------- result ----------
  if (phase === "result" && result) {
    const displayBest = user && profile?.pack_best ? profile.pack_best : best;
    return (
      <div className="mx-auto max-w-3xl animate-slide-up space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          Pack & Play
        </h1>
        <div className="rounded-2xl border border-line bg-panel p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
            Team Overall
          </div>
          <div className="my-1 font-display text-6xl font-black tabular-nums text-hoop2">
            {result.overall}
          </div>
          <div className="text-sm text-slate-400">
            Your best team overall: <span className="font-bold text-slate-200">{Math.max(displayBest, Math.round(result.overall))}</span>
            {Math.round(result.overall) >= displayBest && (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                new best! 🎉
              </span>
            )}
          </div>
          {result.ev.strengths?.[0] && (
            <p className="mt-2 text-xs text-slate-500">{result.ev.strengths[0].text}</p>
          )}
        </div>
        <CourtBoard roster={roster} title="Your Pack Squad" />
        <button
          onClick={reset}
          className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest"
        >
          🎁 Open new packs
        </button>
      </div>
    );
  }

  // ---------- setup: choose upgraded position ----------
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          🎁 Pack & Play
        </h1>
        <p className="mb-4 text-xs text-slate-400">
          Five packs, one per position — each deals five 80+ players. First,
          pick <span className="text-hoop2">one position to upgrade</span>: that
          pack deals five 88+ stars, one of them 90+. Then open, take one from
          each, and build your highest-overall five.
        </p>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
          Choose your premium pack
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => startPacks(pos)}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 active:scale-[0.98]"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 font-display text-xl font-black text-black">
                {pos}
              </span>
              <div>
                <div className="font-display text-base font-bold uppercase tracking-wide group-hover:text-hoop2">
                  {SPOT_LABEL[pos]}
                </div>
                <div className="text-xs text-slate-500">Upgrade this pack → 88+ / 90+</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- packs: open + pick ----------
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            🎁 Your Packs
          </h1>
          <p className="text-xs text-slate-400">
            Open each pack and take one player. Premium: <span className="text-hoop2">{SPOT_LABEL[upgraded]}</span>.
          </p>
        </div>
        <div className="text-right font-display text-sm font-bold text-slate-400">
          {picked}/{PACK_SIZE} picked
        </div>
      </div>

      {openPos ? (
        <PackOpen
          pos={openPos}
          players={packs[openPos]}
          premium={openPos === upgraded}
          onPick={(p) => pick(openPos, p)}
          onBack={() => setOpenPos(null)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {POSITIONS.map((pos) => (
              <PackTile
                key={pos}
                pos={pos}
                premium={pos === upgraded}
                picked={roster[pos]}
                onOpen={() => setOpenPos(pos)}
              />
            ))}
          </div>
          {allPicked && (
            <button
              onClick={reveal}
              className="mt-4 w-full animate-flash rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 font-display text-xl font-bold uppercase tracking-widest text-black transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98]"
            >
              🏀 Reveal my team overall
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PackTile({ pos, premium, picked, onOpen }) {
  if (picked) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-hoop/40 bg-panel p-2 text-center">
        <span className="mb-1 font-display text-[10px] font-bold uppercase tracking-widest text-hoop2">
          {pos} {premium && "★"}
        </span>
        <div
          className="aspect-square w-14 overflow-hidden rounded-full border-2"
          style={{ borderColor: teamMeta(picked.team).color }}
        >
          <PlayerPhotoImg name={picked.name} team={picked.team} />
        </div>
        <div className="mt-1 truncate text-[11px] font-bold text-slate-200">{picked.name.split(" ").slice(-1)}</div>
        <div className="text-[10px] text-slate-500">{picked.rating} OVR</div>
      </div>
    );
  }
  return (
    <button
      onClick={onOpen}
      className={`group flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition hover:-translate-y-1 active:scale-95 ${
        premium
          ? "border-amber-400/70 bg-gradient-to-b from-amber-500/20 to-orange-700/20 shadow-lg shadow-amber-500/10"
          : "border-line bg-gradient-to-b from-panel2 to-panel"
      }`}
    >
      <span className="text-3xl transition-transform group-hover:scale-110">🎁</span>
      <span className="mt-2 font-display text-lg font-black uppercase tracking-wide">{pos}</span>
      <span
        className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
          premium ? "bg-amber-400 text-black" : "bg-line text-slate-400"
        }`}
      >
        {premium ? "★ Premium" : "80+"}
      </span>
      <span className="mt-1 text-[10px] text-slate-500">tap to open</span>
    </button>
  );
}

function PackOpen({ pos, players, premium, onPick, onBack }) {
  return (
    <div className="animate-slide-up">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">
          {pos} pack{" "}
          {premium && <span className="rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-black">★ Premium</span>}
          <span className="ml-2 text-xs font-normal text-slate-400">take one</span>
        </h2>
        <button onClick={onBack} className="text-xs text-slate-400 underline hover:text-slate-200">
          back to packs
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {players.map((p, i) => (
          <div key={p.name} className="animate-pop" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
            <PlayerCard player={p} onClick={() => onPick(p)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Small inline avatar for the PackTile.
function PlayerPhotoImg({ name, team }) {
  return <PlayerPhoto name={name} team={team} className="h-full w-full object-cover" />;
}
