import { useEffect, useMemo, useRef, useState } from "react";
import { useSport } from "../lib/sport.jsx";
import SpinReel from "../components/SpinReel.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import H2HCompare from "../components/H2HCompare.jsx";
import RankBadge from "../components/RankBadge.jsx";
import { recordBattle } from "../lib/career.js";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";
import { rankFor } from "../../../shared/ranks.js";

/**
 * Battle modes: draft a squad, then face a real team (basketball best-of-7,
 * football single game).
 * - historic: spin once for a real opponent; their era locks and you draft
 *   from that decade only, everyone at his natural position. (basketball only)
 * - alltime: face a legendary squad; each spin lands on an era and deals one
 *   star per roster slot — take one and he locks in at that spot.
 */
export default function BattleGame({ mode, navigate }) {
  const sport = useSport();
  if (mode !== "historic" && mode !== "alltime") {
    return <ModePicker navigate={navigate} sport={sport} />;
  }
  if (mode === "historic" && !sport.supportsHistoric) {
    return <HistoricComingSoon navigate={navigate} sport={sport} />;
  }
  return <Battle mode={mode} sport={sport} />;
}

function Battle({ mode, sport }) {
  const { slots: SLOTS, rounds: ROUNDS, teamMeta, Versus } = sport;
  const { user, profile, refreshProfile } = useAuth();
  // scout | scout-spin | idle | spinning | picking | results
  const [phase, setPhase] = useState("scout");
  const [opponent, setOpponent] = useState(null);
  const [oppSpin, setOppSpin] = useState(null);
  const [oppSpinId, setOppSpinId] = useState(0);
  const [roster, setRoster] = useState(() => sport.emptyRoster());
  const [usedPoolKeys, setUsedPoolKeys] = useState([]);
  const [spin, setSpin] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [selected, setSelected] = useState(null);
  // All-Time deals pin each pick to the slot he was dealt at.
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [result, setResult] = useState(null);

  const picksMade = SLOTS.filter((s) => roster[s]).length;
  const rosterFull = picksMade === ROUNDS;

  // After locking a player into a slot, scroll back up to the spin button.
  const topRef = useRef(null);
  const prevPicksRef = useRef(picksMade);
  useEffect(() => {
    if (picksMade > prevPicksRef.current && topRef.current) {
      const rect = topRef.current.getBoundingClientRect();
      if (rect.top < 0) topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevPicksRef.current = picksMade;
  }, [picksMade]);

  const takenNames = useMemo(() => {
    const yours = SLOTS.map((s) => roster[s]?.name).filter(Boolean);
    const theirs = opponent ? SLOTS.map((s) => opponent.roster[s]?.name).filter(Boolean) : [];
    return [...yours, ...theirs];
  }, [roster, opponent, SLOTS]);

  // --- opponent scouting -------------------------------------------------
  function scout() {
    if (mode === "historic") {
      const s = sport.spinWheel({});
      if (!s) return;
      setOppSpin(s);
      setOppSpinId((n) => n + 1);
      setPhase("scout-spin");
    } else {
      const legend = sport.randomLegend();
      setOpponent({ ...legend, sub: legend.record });
      setPhase("idle");
    }
  }

  function scoutDone() {
    const lineup = sport.bestLineup(sport.pools[oppSpin.key]);
    const meta = teamMeta(oppSpin.team);
    setOpponent({
      id: oppSpin.key,
      name: `${oppSpin.decade} ${oppSpin.team}`,
      sub: `their real starting lineup`,
      abbr: meta.abbr,
      color: meta.color,
      tagline: `Era locked — draft from the ${oppSpin.decade} only, and everyone plays his natural position.`,
      roster: lineup,
      decade: oppSpin.decade,
      key: oppSpin.key,
    });
    setPhase("idle");
  }

  // --- drafting -----------------------------------------------------------
  const strict = mode === "historic";

  function doSpin() {
    let s;
    if (mode === "historic") {
      // Deep leagues (basketball) draft one player per franchise; thin ones
      // (football) may re-draw a team, so we only exclude the last pool to
      // avoid landing on the same franchise twice in a row.
      const unique = sport.historicUniqueTeams !== false;
      const opts = {
        usedPoolKeys: unique ? usedPoolKeys : [],
        takenNames,
        decade: opponent.decade,
        excludeKeys: unique
          ? [opponent.key]
          : [opponent.key, usedPoolKeys[usedPoolKeys.length - 1]].filter(Boolean),
        openSlots: SLOTS.filter((slot) => !roster[slot]),
      };
      s = sport.decadeSpin(opts) || sport.decadeSpin({ ...opts, minAvailable: 1 });
    } else {
      s = sport.eraLineupSpin({ usedDecades: usedPoolKeys, takenNames });
    }
    if (!s) return;
    setSpin(s);
    setSelected(null);
    setSelectedSlot(null);
    setSpinId((n) => n + 1);
    setPhase("spinning");
  }

  function selectDeal(slot) {
    if (roster[slot]) return;
    if (selectedSlot === slot) {
      setSelected(null);
      setSelectedSlot(null);
    } else {
      setSelected(spin.lineup[slot]);
      setSelectedSlot(slot);
    }
  }

  function handlePlace(slot) {
    if (!selected || roster[slot]) return;
    if (selectedSlot && slot !== selectedSlot) return;
    if (strict && sport.fitDistance(selected, slot) !== 0) return;
    setRoster({ ...roster, [slot]: selected });
    setUsedPoolKeys((keys) => [...keys, spin.key]);
    setSelected(null);
    setSelectedSlot(null);
    setSpin(null);
    setPhase("idle");
  }

  function handleSwap(a, b) {
    if (a === b) return;
    setRoster((r) => ({ ...r, [a]: r[b], [b]: r[a] }));
  }

  function autoPick() {
    if (spin.lineup) {
      const open = SLOTS.filter((slot) => !roster[slot]);
      const best = open.reduce(
        (acc, slot) => (!acc || spin.lineup[slot].rating > spin.lineup[acc].rating ? slot : acc),
        null
      );
      if (best) selectDeal(best);
      return;
    }
    const pick = sport.bestPick(spin.players, roster, { naturalOnly: strict });
    if (pick) setSelected(pick.player);
  }

  // --- the battle ----------------------------------------------------------
  async function runBattle() {
    const rng = sport.makeRng((Math.random() * 2 ** 31) >>> 0);
    const evYou = sport.evaluateTeam(roster);
    const evOpp = sport.evaluateTeam(opponent.roster);
    const series = sport.simulateSeries(evYou, evOpp, rng);
    const won = series.winner === "A";
    const base = {
      order: ["you", "opp"],
      names: { you: "Your Squad", opp: opponent.name },
      seasons: {
        you: sport.simulateSeason(roster, rng),
        opp: sport.simulateSeason(opponent.roster, rng),
      },
      rosters: { you: roster, opp: opponent.roster },
      series,
      edges: sport.statEdges(evYou, evOpp),
      winnerId: won ? "you" : "opp",
    };
    setResult(base);
    setPhase("results");

    // Basketball logged-in results count toward the account rank. Football (and
    // logged-out play) updates the on-device, sport-scoped Battle Rank instead.
    if (user && sport.id === "basketball") {
      const before = profile?.elo ?? 1000;
      const { data } = await supabase.rpc("apply_offline_result", {
        p_won: won,
        p_opp_overall: evOpp.overall,
      });
      const after = data?.elo ?? before;
      setResult({
        ...base,
        career: {
          mode,
          won,
          before: Math.round(before),
          after: Math.round(after),
          delta: Math.round(after - before),
          rankBefore: rankFor(before),
          rankAfter: rankFor(after),
          promoted: rankFor(after).index > rankFor(before).index,
          demoted: rankFor(after).index < rankFor(before).index,
          wins: data?.wins ?? 0,
          losses: data?.losses ?? 0,
          account: true,
        },
      });
      refreshProfile?.();
    } else {
      setResult({ ...base, career: recordBattle({ won, oppOverall: evOpp.overall, mode, sport: sport.id }) });
    }
  }

  function reset() {
    setPhase("scout");
    setOpponent(null);
    setOppSpin(null);
    setRoster(sport.emptyRoster());
    setUsedPoolKeys([]);
    setSpin(null);
    setSelected(null);
    setSelectedSlot(null);
    setResult(null);
  }

  const title = mode === "historic" ? "Historic Battle" : "All-Time Battle";
  const seriesCta = sport.seriesLabel === "single game" ? "🏈 Play the game" : "⚔️ Play the best-of-7";

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-3xl animate-slide-up space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          {title}
        </h1>
        {result.career && <CareerUpdate career={result.career} />}
        <H2HCompare payload={result} youId="you" readOnly sport={sport} />
        <button
          onClick={reset}
          className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest"
        >
          🔄 Run it back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div ref={topRef} className="mb-4 flex scroll-mt-20 items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            {title}
          </h1>
          <p className="text-xs text-slate-400">
            {!opponent
              ? mode === "historic"
                ? "Spin once to draw a real team — then beat them with players from their own era, everyone at his natural position."
                : "Face a legendary squad — every era spin deals one star per roster slot. Take one, he locks in at his spot."
              : rosterFull
                ? "Squad locked — time to play it out."
                : `Round ${Math.min(picksMade + 1, ROUNDS)} of ${ROUNDS} — ${
                    mode === "historic"
                      ? `team-only spins, ${opponent.decade} locked, natural positions only`
                      : "each era deals a star per slot"
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

      <div className="space-y-4">
        <div className="space-y-4">
          {phase === "scout" && (
            <button
              onClick={scout}
              className="btn-ball w-full rounded-2xl py-5 font-display text-2xl font-bold uppercase tracking-widest"
            >
              {mode === "historic" ? "🔍 Spin for your opponent" : "🎲 Reveal your opponent"}
            </button>
          )}

          {(phase === "scout" || phase === "scout-spin") && mode === "historic" && (
            <SpinReel
              result={oppSpin}
              spinId={oppSpinId}
              onDone={scoutDone}
              decades={sport.decades}
              teams={sport.teams}
              teamMeta={teamMeta}
            />
          )}

          {phase !== "scout" && phase !== "scout-spin" && !rosterFull && (
            <SpinReel
              result={spin}
              spinId={spinId}
              onDone={() => setPhase("picking")}
              decades={sport.decades}
              teams={sport.teams}
              teamMeta={teamMeta}
            />
          )}

          {phase === "idle" && opponent && !rosterFull && (
            <button
              onClick={doSpin}
              className="btn-ball w-full rounded-2xl py-5 font-display text-2xl font-bold uppercase tracking-widest"
            >
              {mode === "alltime"
                ? picksMade === 0
                  ? "🎰 Spin for an era"
                  : "Spin for the next era"
                : picksMade === 0
                  ? "🎰 Spin the wheel"
                  : "Spin again"}
            </button>
          )}

          {phase === "idle" && rosterFull && (
            <button
              onClick={runBattle}
              className="w-full animate-flash rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-5 font-display text-2xl font-bold uppercase tracking-widest text-black transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98]"
            >
              {seriesCta}
            </button>
          )}

          {(phase === "spinning" || phase === "scout-spin") && (
            <div className="rounded-2xl border border-line bg-panel p-6 text-center text-slate-400">
              <span className="animate-floaty inline-block text-3xl">{sport.icon}</span>
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
                  <span style={{ color: spin.team ? teamMeta(spin.team).color : "#f97316" }}>
                    ■
                  </span>{" "}
                  {spin.decade} {spin.team || "· The Era Deals A Squad"}
                  <span className="ml-2 align-middle text-xs font-normal normal-case tracking-normal text-slate-400">
                    {spin.lineup ? "take one — he plays his spot" : "pick one"}
                  </span>
                </h2>
                <button
                  onClick={autoPick}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-300 hover:bg-panel2"
                >
                  ✨ best fit
                </button>
              </div>
              {spin.lineup ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {SLOTS.map((slot, i) => {
                    const p = spin.lineup[slot];
                    const open = !roster[slot];
                    return (
                      <div
                        key={slot}
                        className={`animate-slide-up ${open ? "" : "opacity-40"}`}
                        style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="mb-1 flex items-center justify-between px-1">
                          <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-hoop2">
                            {sport.slotLabel(slot)}
                          </span>
                          {!open && (
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">
                              spot filled
                            </span>
                          )}
                        </div>
                        <PlayerCard
                          player={p}
                          selected={selectedSlot === slot}
                          onClick={() => open && selectDeal(slot)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
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
              )}
              {selected && (
                <div className="animate-pop rounded-xl border border-hoop/50 bg-hoop/10 p-3 text-sm">
                  <span className="font-bold text-hoop2">{selected.name}</span>{" "}
                  selected —{" "}
                  {selectedSlot
                    ? `tap the glowing ${sport.slotLabel(selectedSlot)} spot to lock him in.`
                    : strict
                      ? `tap an open spot he naturally plays (${sport.playerPositionLabel(selected)}).`
                      : "tap an open spot to lock him in."}
                </div>
              )}
            </div>
          )}
        </div>

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
            <Versus
              teamA={opponent.roster}
              nameA={opponent.name}
              accentA={opponent.color}
              teamB={roster}
              nameB="Your Squad"
              accentB="#f97316"
              interactiveB={{
                placing: phase === "picking" ? selected : null,
                onPlace: handlePlace,
                onSwap: handleSwap,
                strictFit: strict,
                onlySlots: selectedSlot ? [selectedSlot] : null,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CareerUpdate({ career }) {
  const gained = career.delta >= 0;
  return (
    <div className="animate-pop overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line/60 bg-black/30 px-4 py-2">
        <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
          Battle Rank
        </span>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          {career.account ? "account rank" : "offline career"} · {career.wins}W-{career.losses}L
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <RankBadge elo={career.after} size="lg" progress />
          <div className="leading-tight">
            <div className="text-sm text-slate-400">
              {gained ? "Rating gained" : "Rating lost"}
            </div>
            <div
              className={`font-display text-2xl font-black tabular-nums ${
                gained ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {gained ? "+" : ""}
              {career.delta}
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              {career.before} → <span className="font-bold text-hoop2">{career.after}</span>
            </div>
          </div>
        </div>
        {(career.promoted || career.demoted) && (
          <div
            className={`rounded-xl border px-4 py-2 text-center ${
              career.promoted
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-rose-500/50 bg-rose-500/10"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
              {career.promoted ? "⬆ Promoted" : "⬇ Demoted"}
            </div>
            <div className="font-display text-lg font-bold" style={{ color: career.rankAfter.color }}>
              {career.rankAfter.badge} {career.rankAfter.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricComingSoon({ navigate, sport }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="text-5xl">🕰️</div>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide">
        Historic Battle
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
        Historic Battle isn't wired for {sport.label.toLowerCase()} yet — it needs
        deeper real-team rosters. All-Time Battle is live now, or jump into a Solo
        Run.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          onClick={() => navigate("/battle/alltime")}
          className="btn-ball rounded-xl px-5 py-3 font-display text-lg font-bold uppercase tracking-wider"
        >
          🐐 All-Time Battle
        </button>
        <button
          onClick={() => navigate("/solo")}
          className="rounded-xl border border-line bg-panel px-5 py-3 font-bold transition hover:bg-panel2"
        >
          Solo Run
        </button>
      </div>
    </div>
  );
}

function ModePicker({ navigate, sport }) {
  const historic = sport.supportsHistoric;
  const isBasketball = sport.id === "basketball";
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="py-6 text-center font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
        ⚔️ Battle <span className="text-hoop">Modes</span>
      </h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {historic ? (
          <button
            onClick={() => navigate("/battle/historic")}
            className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          >
            <div className="text-3xl">🕰️</div>
            <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
              Historic Battle
            </div>
            <p className="mt-1 text-sm text-slate-400">
              One spin draws a real team and locks their era. Draft from that
              decade only — natural positions, no cheese — and beat the actual
              squad.
            </p>
          </button>
        ) : (
          <div className="animate-slide-up rounded-2xl border border-dashed border-line bg-panel/50 p-6 text-left">
            <div className="text-3xl">🕰️</div>
            <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide text-slate-300">
              Historic Battle
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Coming soon for {sport.label.toLowerCase()} — needs deeper real-team
              rosters. All-Time Battle is ready now.
            </p>
          </div>
        )}
        <button
          onClick={() => navigate("/battle/alltime")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">🐐</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            All-Time Battle
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {isBasketball
              ? "The 72-10 Bulls. The 73-9 Warriors. The Dream Team. Every era spin deals five random 88+ stars, one per position — take one and build the squad that slays a legend."
              : "The 1972 Dolphins. The Greatest Show on Turf. Peyton's record offense. Every era spin deals one 88+ star per slot — take one and build the squad that slays a legend."}
          </p>
        </button>
      </div>
    </div>
  );
}
