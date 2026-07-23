import { useEffect, useMemo, useRef, useState } from "react";
import { useSport } from "../lib/sport.jsx";
import SpinReel from "../components/SpinReel.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import SeasonResults from "../components/SeasonResults.jsx";
import SeasonPlayback from "../components/SeasonPlayback.jsx";
import Confetti from "../components/Confetti.jsx";
import PlayerPhoto from "../components/PlayerPhoto.jsx";

export default function SoloGame() {
  const sport = useSport();
  const { slots: SLOTS, rounds: ROUNDS, teamMeta, Board } = sport;

  const [phase, setPhase] = useState("idle"); // idle | spinning | picking | simming | results
  const [roster, setRoster] = useState(() => sport.emptyRoster());
  const [usedPoolKeys, setUsedPoolKeys] = useState([]);
  const [spin, setSpin] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [shareCode, setShareCode] = useState(null);
  const [respins, setRespins] = useState({ era: 1, team: 1 });

  const picksMade = SLOTS.filter((s) => roster[s]).length;
  const rosterFull = picksMade === ROUNDS;

  // Preview the finished squad's overall so you can see whether you've cleared
  // the guaranteed-perfection line (basketball: a 97+ team is a lock for 82-0).
  const preview = useMemo(
    () => (rosterFull ? sport.evaluateTeam(roster) : null),
    [rosterFull, roster, sport]
  );
  const guaranteed = Boolean(preview && sport.id === "basketball" && preview.overall >= 97);

  // After a player is locked into a slot, scroll back up to the spin button
  // (mirrors the auto-scroll-to-court when a player is selected).
  const topRef = useRef(null);
  const prevPicksRef = useRef(picksMade);
  useEffect(() => {
    if (picksMade > prevPicksRef.current && topRef.current) {
      const rect = topRef.current.getBoundingClientRect();
      if (rect.top < 0) topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevPicksRef.current = picksMade;
  }, [picksMade]);

  const takenNames = useMemo(
    () => SLOTS.map((s) => roster[s]?.name).filter(Boolean),
    [roster, SLOTS]
  );

  function doSpin() {
    const s = sport.spinWheel({ usedPoolKeys, takenNames });
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
    setHistory((h) => [
      ...h,
      {
        round: h.length + 1,
        key: spin.key,
        decade: spin.decade,
        team: spin.team,
        player: selected,
        slot,
      },
    ]);
    setSelected(null);
    setSpin(null);
    setPhase("idle");
  }

  function autoPick() {
    const pick = sport.bestPick(spin.players, roster);
    if (pick) setSelected(pick.player);
  }

  // Rearrange locked-in players between slots (history follows so share
  // codes rebuild the final arrangement, not the original draft order).
  function handleSwap(a, b) {
    if (a === b) return;
    setRoster((r) => ({ ...r, [a]: r[b], [b]: r[a] }));
    setHistory((h) =>
      h.map((e) =>
        e.slot === a ? { ...e, slot: b } : e.slot === b ? { ...e, slot: a } : e
      )
    );
  }

  // One era respin (keep the franchise, reroll the decade) and one team
  // respin (keep the decade, reroll the franchise) per draft.
  const respinBase = spin
    ? { decade: spin.decade, team: spin.team, usedPoolKeys, takenNames }
    : null;
  const eraRespinPossible =
    phase === "picking" && respins.era > 0 && respinBase && sport.canRespin({ axis: "decade", ...respinBase });
  const teamRespinPossible =
    phase === "picking" && respins.team > 0 && respinBase && sport.canRespin({ axis: "team", ...respinBase });

  function doRespin(axis) {
    if (!spin) return;
    const s = sport.respinSpin({ axis, ...respinBase });
    if (!s) return;
    setRespins((r) => (axis === "decade" ? { ...r, era: r.era - 1 } : { ...r, team: r.team - 1 }));
    setSpin(s);
    setSelected(null);
    setSpinId((n) => n + 1);
    setPhase("spinning");
  }

  function runSeason() {
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const res = sport.simulateSeason(roster, sport.makeRng(seed));
    setResult(res);
    if (sport.supportsShare && sport.encodeSolo) setShareCode(sport.encodeSolo(history, seed));
    setPhase("simming");
  }

  function reset() {
    setPhase("idle");
    setRoster(sport.emptyRoster());
    setUsedPoolKeys([]);
    setSpin(null);
    setSelected(null);
    setResult(null);
    setHistory([]);
    setShareCode(null);
    setRespins({ era: 1, team: 1 });
  }

  if (phase === "simming" && result) {
    return (
      <div className="pt-8 sm:pt-16">
        <SeasonPlayback result={result} sport={sport} onDone={() => setPhase("results")} />
      </div>
    );
  }

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-3xl animate-slide-up">
        {result.wins >= sport.confettiWins && <Confetti />}
        <SeasonResults
          roster={roster}
          result={result}
          shareCode={shareCode}
          sport={sport}
          onPlayAgain={reset}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div ref={topRef} className="mb-4 flex scroll-mt-20 items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Solo Draft
          </h1>
          <p className="text-xs text-slate-400">
            {rosterFull
              ? "Roster locked — time to find out what this squad is made of."
              : `Round ${Math.min(picksMade + 1, ROUNDS)} of ${ROUNDS} — spin, then pick one player for an open slot.`}
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
          {!rosterFull && (
            <SpinReel
              result={spin}
              spinId={spinId}
              onDone={() => setPhase("picking")}
              decades={sport.decades}
              teams={sport.teams}
              teamMeta={teamMeta}
            />
          )}

          {phase === "idle" && !rosterFull && (
            <button
              onClick={doSpin}
              className="btn-ball w-full rounded-2xl py-5 font-display text-2xl font-bold uppercase tracking-widest"
            >
              {picksMade === 0 ? "🎰 Spin the wheel" : "Spin again"}
            </button>
          )}

          {phase === "idle" && rosterFull && (
            <div className="space-y-2">
              <div
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  guaranteed
                    ? "border-amber-400/70 bg-gradient-to-r from-amber-500/15 to-emerald-500/15"
                    : "border-line bg-panel"
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    Team Overall
                  </div>
                  <div className="font-display text-3xl font-black tabular-nums text-hoop2">
                    {preview.overall}
                  </div>
                </div>
                {guaranteed ? (
                  <div className="text-right">
                    <div className="font-display text-sm font-black uppercase tracking-wider text-amber-300">
                      🔒 Guaranteed 82-0
                    </div>
                    <div className="text-[11px] text-slate-400">This squad can't lose. Run it.</div>
                  </div>
                ) : (
                  sport.id === "basketball" && (
                    <div className="max-w-[55%] text-right text-[11px] text-slate-400">
                      Hit a <span className="font-bold text-slate-200">97</span> team overall to lock
                      in a guaranteed 82-0.
                    </div>
                  )
                )}
              </div>
              <button
                onClick={runSeason}
                className="w-full animate-flash rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-5 font-display text-2xl font-bold uppercase tracking-widest text-black transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98]"
              >
                🏆 {sport.simCta}
              </button>
            </div>
          )}

          {phase === "spinning" && (
            <div className="rounded-2xl border border-line bg-panel p-6 text-center text-slate-400">
              <span className="animate-floaty inline-block text-3xl">{sport.icon}</span>
              <div className="mt-1 text-sm">The wheel decides your fate…</div>
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
                <div className="flex items-center gap-1.5">
                  <RespinButton
                    label="Era"
                    title="Reroll the decade, keep the franchise"
                    left={respins.era}
                    enabled={eraRespinPossible}
                    onClick={() => doRespin("decade")}
                  />
                  <RespinButton
                    label="Team"
                    title="Reroll the franchise, keep the decade"
                    left={respins.team}
                    enabled={teamRespinPossible}
                    onClick={() => doRespin("team")}
                  />
                  <button
                    onClick={autoPick}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-300 hover:bg-panel2"
                  >
                    ✨ best fit
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {spin.players.map((p, i) => (
                  <div key={p.name} className="animate-slide-up" style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}>
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

          {history.length > 0 && phase !== "picking" && (
            <div className="rounded-2xl border border-line bg-panel p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                Draft history
              </div>
              <div className="space-y-1.5">
                {history.map((h) => (
                  <div key={h.round} className="flex items-center gap-2 text-xs text-slate-400">
                    <PlayerPhoto
                      name={h.player.name}
                      team={h.team}
                      className="h-7 w-7 flex-none rounded-md border border-white/10"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-slate-200">{h.player.name}</span>{" "}
                      → {sport.slotLabel(h.slot)}
                    </span>
                    <span className="flex-none text-slate-500">
                      R{h.round} · {h.decade} {teamMeta(h.team).abbr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Board
          roster={roster}
          placing={phase === "picking" ? selected : null}
          onPlace={handlePlace}
          onSwap={handleSwap}
          title="Your Squad"
        />
      </div>
    </div>
  );
}

function RespinButton({ label, title, left, enabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={left > 0 ? title : `${label} respin already used`}
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
        enabled
          ? "border-hoop/70 text-hoop2 hover:bg-hoop/15 active:scale-95"
          : "cursor-not-allowed border-line text-slate-600"
      }`}
    >
      ↻ {label}
      <span
        className={`rounded px-1 font-display text-[11px] ${
          left > 0 ? "bg-hoop/20 text-hoop2" : "bg-line/50 text-slate-600"
        }`}
      >
        ×{left}
      </span>
    </button>
  );
}
