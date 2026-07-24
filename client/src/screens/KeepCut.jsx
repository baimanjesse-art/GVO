import { useMemo, useState } from "react";
import { useSport } from "../lib/sport.jsx";
import { dealDeck, scoreKeep, keepGrade, DECK_SIZE, KEEP, CUT } from "../../../shared/keepcut.js";
import PlayerPhoto from "../components/PlayerPhoto.jsx";
import { teamMetaAny } from "../lib/teamColors.js";

/**
 * Keep or Cut: eight players revealed one at a time. Keep three, cut five, no
 * takebacks. A fast gut-call game — you're graded on how close your three keeps
 * are to the best three in the deck.
 */
export default function KeepCut() {
  const sport = useSport();
  const bestKey = `keepcut-best-${sport.id}`;

  const [phase, setPhase] = useState("intro"); // intro | playing | results
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [kept, setKept] = useState([]);
  const [cut, setCut] = useState([]);
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestKey) || 0));

  function start() {
    setDeck(dealDeck({ pool: sport.allPlayers(), rng: Math.random }));
    setIdx(0);
    setKept([]);
    setCut([]);
    setPhase("playing");
  }

  const keepFull = kept.length >= KEEP;
  const cutFull = cut.length >= CUT;
  const current = deck[idx];

  function place(bucket) {
    if (!current) return;
    if (bucket === "keep") {
      if (keepFull) return;
      setKept((k) => [...k, current]);
    } else {
      if (cutFull) return;
      setCut((c) => [...c, current]);
    }
    const next = idx + 1;
    if (next >= DECK_SIZE) setPhase("results");
    setIdx(next);
  }

  const result = useMemo(() => (phase === "results" ? scoreKeep(kept, deck) : null), [phase, kept, deck]);

  if (phase === "results" && result) {
    if (result.score > best) {
      setBest(result.score);
      localStorage.setItem(bestKey, String(result.score));
    }
    const grade = keepGrade(result.score);
    const keptNames = new Set(kept.map((p) => p.name));
    const missedStuds = result.optimal.filter((p) => !keptNames.has(p.name));
    return (
      <div className="mx-auto max-w-2xl animate-slide-up space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">✂️ Keep or Cut</h1>

        <div className="rounded-2xl border border-line bg-panel p-5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Your grade</div>
          <div
            className={`my-1 font-display text-6xl font-black tabular-nums ${
              result.score >= 90 ? "text-emerald-400" : result.score >= 62 ? "text-amber-400" : "text-rose-400"
            }`}
          >
            {result.score}
          </div>
          <div className="font-display text-lg font-bold uppercase tracking-widest text-slate-200">
            {grade === "PERFECT" ? "🏆 Perfect — you kept the three best!" : `Grade ${grade}`}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Best: <span className="font-bold text-slate-200">{Math.max(best, result.score)}</span>
            {result.score >= best && (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                new best! 🎉
              </span>
            )}
          </div>
        </div>

        <Pile title="You kept" accent="#34d399" players={kept} />
        {missedStuds.length > 0 ? (
          <Pile
            title="You should have kept"
            accent="#fb7185"
            players={missedStuds}
            note="These graded out higher than someone you held onto."
          />
        ) : (
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-3 text-center text-sm text-emerald-300">
            Flawless — nobody better hit the cut pile.
          </div>
        )}

        <button
          onClick={start}
          className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest"
        >
          ✂️ Deal a new eight
        </button>
      </div>
    );
  }

  if (phase === "playing" && current) {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">✂️ Keep or Cut</h1>
          <span className="font-display text-sm font-bold text-slate-400">
            {idx + 1} / {DECK_SIZE}
          </span>
        </div>

        {/* bucket status */}
        <div className="mb-3 flex gap-2">
          <Meter label="KEEP" have={kept.length} total={KEEP} color="#34d399" />
          <Meter label="CUT" have={cut.length} total={CUT} color="#fb7185" />
        </div>

        {/* the player on the clock */}
        <RevealCard key={idx} player={current} sport={sport} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => place("keep")}
            disabled={keepFull}
            className={`rounded-2xl py-5 font-display text-2xl font-black uppercase tracking-widest transition active:scale-95 ${
              keepFull
                ? "cursor-not-allowed border border-line bg-panel text-slate-600"
                : "bg-gradient-to-b from-emerald-400 to-emerald-600 text-black hover:from-emerald-300 hover:to-emerald-500"
            }`}
          >
            ✓ Keep
          </button>
          <button
            onClick={() => place("cut")}
            disabled={cutFull}
            className={`rounded-2xl py-5 font-display text-2xl font-black uppercase tracking-widest transition active:scale-95 ${
              cutFull
                ? "cursor-not-allowed border border-line bg-panel text-slate-600"
                : "bg-gradient-to-b from-rose-500 to-rose-700 text-white hover:from-rose-400 hover:to-rose-600"
            }`}
          >
            ✕ Cut
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          {keepFull
            ? "Keep pile is full — everyone left gets cut."
            : cutFull
              ? "Cut pile is full — everyone left is safe."
              : "No takebacks. Choose before the next name drops."}
        </p>
      </div>
    );
  }

  // ----- intro -----
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">✂️ Keep or Cut</h1>
      <p className="mb-4 text-sm text-slate-400">
        Eight {sport.label.toLowerCase()} players, revealed one at a time. Keep{" "}
        <span className="font-bold text-emerald-400">three</span>, cut{" "}
        <span className="font-bold text-rose-400">five</span> — decide on the spot, no takebacks. You're
        graded on how close your three are to the best in the deck.
      </p>
      {best > 0 && (
        <div className="mb-4 rounded-xl border border-line bg-panel p-3 text-sm text-slate-400">
          Your best grade: <span className="font-bold text-hoop2">{best}</span> / 100
        </div>
      )}
      <button
        onClick={start}
        className="btn-ball w-full rounded-2xl py-5 font-display text-2xl font-bold uppercase tracking-widest"
      >
        ✂️ Deal eight
      </button>
    </div>
  );
}

function RevealCard({ player, sport }) {
  const meta = teamMetaAny(player.team);
  return (
    <div className="animate-pop overflow-hidden rounded-3xl border border-line bg-panel shadow-2xl shadow-black/50">
      <div className="relative" style={{ background: `linear-gradient(160deg, ${meta.color}44, transparent 75%)` }}>
        <div className="mx-auto w-40 pt-5">
          <PlayerPhoto
            name={player.name}
            team={player.team}
            className="aspect-square w-full rounded-full border-4"
          />
        </div>
        <span className="absolute right-3 top-3 rounded-lg bg-black/80 px-2 py-1 font-display text-2xl font-black text-hoop2">
          {player.rating}
        </span>
      </div>
      <div className="px-4 py-3 text-center">
        <div className="font-display text-2xl font-bold uppercase tracking-wide">{player.name}</div>
        <div className="mt-0.5 text-xs uppercase tracking-wider text-slate-400">
          <span style={{ color: meta.color }}>{meta.abbr}</span> · {player.decade} ·{" "}
          {sport.playerPositionLabel(player)}
        </div>
      </div>
    </div>
  );
}

function Meter({ label, have, total, color }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-panel px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
          {label}
        </span>
        <span className="font-display text-sm font-black tabular-nums text-slate-300">
          {have}/{total}
        </span>
      </div>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < have ? color : "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>
    </div>
  );
}

function Pile({ title, accent, players, note }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-2 font-display text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
        {title}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {players.map((p) => (
          <div key={p.name} className="flex flex-col items-center rounded-xl bg-black/20 p-2 text-center">
            <div
              className="aspect-square w-12 overflow-hidden rounded-full border-2"
              style={{ borderColor: teamMetaAny(p.team).color }}
            >
              <PlayerPhoto name={p.name} team={p.team} className="h-full w-full object-cover" />
            </div>
            <div className="mt-1 truncate text-[11px] font-bold text-slate-200">{p.name.split(" ").slice(-1)}</div>
            <div className="text-[10px] text-slate-500">{p.rating} OVR</div>
          </div>
        ))}
      </div>
      {note && <p className="mt-2 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}
