import { useMemo, useState } from "react";
import { spinWheel, decadeSpin, POOLS } from "../../../shared/players.js";
import {
  bestLineup,
  bestPick,
  evaluateTeam,
  simulateSeason,
  simulateSeries,
  statEdges,
  makeRng,
} from "../../../shared/sim.js";
import { POSITIONS, ROUNDS, teamMeta } from "../../../shared/constants.js";
import { randomLegend } from "../../../shared/legends.js";
import SpinReel from "../components/SpinReel.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import RosterBoard from "../components/RosterBoard.jsx";
import H2HCompare from "../components/H2HCompare.jsx";

const EMPTY_ROSTER = { PG: null, SG: null, SF: null, PF: null, C: null };

/**
 * Battle modes: draft a squad, then face a real team in a best-of-7.
 * - historic: spin once for an opponent; their era locks and you draft
 *   from that decade only, one team-only spin per round.
 * - alltime: face a legendary 68+ win team or super squad; draft across
 *   every era to build the team that can take them down.
 */
export default function BattleGame({ mode, navigate }) {
  if (mode !== "historic" && mode !== "alltime") {
    return <ModePicker navigate={navigate} />;
  }
  return <Battle mode={mode} />;
}

function Battle({ mode }) {
  // scout | scout-spin | idle | spinning | picking | results
  const [phase, setPhase] = useState("scout");
  const [opponent, setOpponent] = useState(null);
  const [oppSpin, setOppSpin] = useState(null);
  const [oppSpinId, setOppSpinId] = useState(0);
  const [roster, setRoster] = useState(EMPTY_ROSTER);
  const [usedPoolKeys, setUsedPoolKeys] = useState([]);
  const [spin, setSpin] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  const picksMade = POSITIONS.filter((p) => roster[p]).length;
  const rosterFull = picksMade === ROUNDS;

  const takenNames = useMemo(() => {
    const yours = POSITIONS.map((p) => roster[p]?.name).filter(Boolean);
    const theirs = opponent
      ? POSITIONS.map((p) => opponent.roster[p].name)
      : [];
    return [...yours, ...theirs];
  }, [roster, opponent]);

  // --- opponent scouting -------------------------------------------------
  function scout() {
    if (mode === "historic") {
      const s = spinWheel({});
      if (!s) return;
      setOppSpin(s);
      setOppSpinId((n) => n + 1);
      setPhase("scout-spin");
    } else {
      const legend = randomLegend();
      setOpponent({ ...legend, sub: legend.record });
      setPhase("idle");
    }
  }

  function scoutDone() {
    const lineup = bestLineup(POOLS[oppSpin.key]);
    const meta = teamMeta(oppSpin.team);
    setOpponent({
      id: oppSpin.key,
      name: `${oppSpin.decade} ${oppSpin.team}`,
      sub: `their real starting five`,
      abbr: meta.abbr,
      color: meta.color,
      tagline: `Era locked — you can only draft from the ${oppSpin.decade}.`,
      roster: lineup,
      decade: oppSpin.decade,
      key: oppSpin.key,
    });
    setPhase("idle");
  }

  // --- drafting -----------------------------------------------------------
  function doSpin() {
    const opts = { usedPoolKeys, takenNames };
    const s =
      mode === "historic"
        ? decadeSpin({ ...opts, decade: opponent.decade, excludeKeys: [opponent.key] }) ||
          decadeSpin({ ...opts, decade: opponent.decade, excludeKeys: [opponent.key], minAvailable: 1 })
        : spinWheel(opts);
    if (!s) return;
    setSpin(s);
    setSelected(null);
    setSpinId((n) => n + 1);
    setPhase("spinning");
  }

  function handlePlace(slot) {
    if (!selected || roster[slot]) return;
    setRoster({ ...roster, [slot]: selected });
    setUsedPoolKeys((keys) => [...keys, spin.key]);
    setSelected(null);
    setSpin(null);
    setPhase("idle");
  }

  function handleSwap(a, b) {
    if (a === b) return;
    setRoster((r) => ({ ...r, [a]: r[b], [b]: r[a] }));
  }

  function autoPick() {
    const pick = bestPick(spin.players, roster);
    if (pick) setSelected(pick.player);
  }

  // --- the battle ----------------------------------------------------------
  function runBattle() {
    const rng = makeRng((Math.random() * 2 ** 31) >>> 0);
    const evYou = evaluateTeam(roster);
    const evOpp = evaluateTeam(opponent.roster);
    const series = simulateSeries(evYou, evOpp, rng);
    setResult({
      order: ["you", "opp"],
      names: { you: "Your Squad", opp: opponent.name },
      seasons: {
        you: simulateSeason(roster, rng),
        opp: simulateSeason(opponent.roster, rng),
      },
      rosters: { you: roster, opp: opponent.roster },
      series,
      edges: statEdges(evYou, evOpp),
      winnerId: series.winner === "A" ? "you" : "opp",
    });
    setPhase("results");
  }

  function reset() {
    setPhase("scout");
    setOpponent(null);
    setOppSpin(null);
    setRoster(EMPTY_ROSTER);
    setUsedPoolKeys([]);
    setSpin(null);
    setSelected(null);
    setResult(null);
  }

  const title = mode === "historic" ? "Historic Battle" : "All-Time Battle";

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-3xl animate-slide-up space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          {title}
        </h1>
        <H2HCompare payload={result} youId="you" readOnly />
        <button
          onClick={reset}
          className="w-full rounded-2xl bg-gradient-to-b from-hoop to-orange-600 py-4 font-display text-xl font-bold uppercase tracking-widest text-black transition hover:from-hoop2 hover:to-hoop active:scale-[0.98]"
        >
          🔄 Run it back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            {title}
          </h1>
          <p className="text-xs text-slate-400">
            {!opponent
              ? mode === "historic"
                ? "Spin once to draw a real team — then beat them with players from their own era."
                : "Face a legendary squad — draft across every era to take them down."
              : rosterFull
                ? "Squad locked — time to play the series."
                : `Round ${Math.min(picksMade + 1, ROUNDS)} of ${ROUNDS} — ${
                    mode === "historic"
                      ? `team-only spins, ${opponent.decade} locked`
                      : "spin anywhere in history"
                  }.`}
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: ROUNDS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-6 rounded-full transition-colors ${
                i < picksMade ? "bg-hoop" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          {phase === "scout" && (
            <button
              onClick={scout}
              className="w-full rounded-2xl bg-gradient-to-b from-hoop to-orange-600 py-5 font-display text-2xl font-bold uppercase tracking-widest text-black shadow-lg shadow-hoop/25 transition hover:from-hoop2 hover:to-hoop active:scale-[0.98]"
            >
              {mode === "historic" ? "🔍 Spin for your opponent" : "🎲 Reveal your opponent"}
            </button>
          )}

          {(phase === "scout" || phase === "scout-spin") && mode === "historic" && (
            <SpinReel result={oppSpin} spinId={oppSpinId} onDone={scoutDone} />
          )}

          {phase !== "scout" && phase !== "scout-spin" && !rosterFull && (
            <SpinReel result={spin} spinId={spinId} onDone={() => setPhase("picking")} />
          )}

          {phase === "idle" && opponent && !rosterFull && (
            <button
              onClick={doSpin}
              className="w-full rounded-2xl bg-gradient-to-b from-hoop to-orange-600 py-5 font-display text-2xl font-bold uppercase tracking-widest text-black shadow-lg shadow-hoop/25 transition hover:from-hoop2 hover:to-hoop active:scale-[0.98]"
            >
              {picksMade === 0 ? "🎰 Spin the wheel" : "Spin again"}
            </button>
          )}

          {phase === "idle" && rosterFull && (
            <button
              onClick={runBattle}
              className="w-full animate-flash rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-5 font-display text-2xl font-bold uppercase tracking-widest text-black transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98]"
            >
              ⚔️ Play the best-of-7
            </button>
          )}

          {(phase === "spinning" || phase === "scout-spin") && (
            <div className="rounded-2xl border border-line bg-panel p-6 text-center text-slate-400">
              <span className="animate-floaty inline-block text-3xl">🏀</span>
              <div className="mt-1 text-sm">
                {phase === "scout-spin"
                  ? "Scouting your opponent…"
                  : "The wheel decides your fate…"}
              </div>
            </div>
          )}

          {phase === "picking" && spin && (
            <div className="animate-slide-up space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold uppercase tracking-wide">
                  <span style={{ color: teamMeta(spin.team).color }}>■</span>{" "}
                  {spin.decade} {spin.team}
                  <span className="ml-2 align-middle text-xs font-normal normal-case tracking-normal text-slate-400">
                    pick one
                  </span>
                </h2>
                <button
                  onClick={autoPick}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-300 hover:bg-panel2"
                >
                  ✨ best fit
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {spin.players.map((p, i) => (
                  <div
                    key={p.name}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}
                  >
                    <PlayerCard
                      player={p}
                      selected={selected?.name === p.name}
                      onClick={() => setSelected(selected?.name === p.name ? null : p)}
                    />
                  </div>
                ))}
              </div>
              {selected && (
                <div className="animate-pop rounded-xl border border-hoop/50 bg-hoop/10 p-3 text-sm">
                  <span className="font-bold text-hoop2">{selected.name}</span>{" "}
                  selected — tap an open roster slot to lock him in.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {opponent && (
            <div className="animate-pop space-y-2">
              <div
                className="rounded-2xl border p-3"
                style={{ borderColor: opponent.color, background: `${opponent.color}14` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                      Your opponent
                    </div>
                    <div className="font-display text-lg font-bold uppercase leading-tight tracking-wide">
                      {opponent.name}
                    </div>
                  </div>
                  <span
                    className="flex-none rounded-lg px-2 py-1 font-display text-sm font-bold text-white/95"
                    style={{ background: opponent.color }}
                  >
                    {opponent.record || opponent.sub}
                  </span>
                </div>
                {opponent.tagline && (
                  <p className="mt-1 text-xs text-slate-400">{opponent.tagline}</p>
                )}
              </div>
              <RosterBoard roster={opponent.roster} compact accent={opponent.color} />
            </div>
          )}

          <RosterBoard
            roster={roster}
            placing={phase === "picking" ? selected : null}
            onPlace={handlePlace}
            onSwap={handleSwap}
            title="Your Squad"
          />
        </div>
      </div>
    </div>
  );
}

function ModePicker({ navigate }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="py-6 text-center font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
        ⚔️ Battle <span className="text-hoop">Modes</span>
      </h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigate("/battle/historic")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
        >
          <div className="text-3xl">🏛️</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            Historic Battle
          </div>
          <p className="mt-1 text-sm text-slate-400">
            One spin draws a real team and locks their era. Draft from that
            decade only — then try to beat the actual squad.
          </p>
        </button>
        <button
          onClick={() => navigate("/battle/alltime")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">👑</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            All-Time Battle
          </div>
          <p className="mt-1 text-sm text-slate-400">
            The 72-10 Bulls. The 73-9 Warriors. The Dream Team. Draft across
            every era and take down a legend.
          </p>
        </button>
      </div>
    </div>
  );
}
