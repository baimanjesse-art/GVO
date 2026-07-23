import { useState } from "react";
import GradeBadge from "./GradeBadge.jsx";
import FullCourt from "./FullCourt.jsx";
import Confetti from "./Confetti.jsx";
import RankBadge from "./RankBadge.jsx";
import { apiPost } from "../lib/api.js";
import { copyText } from "../lib/share.js";

/**
 * Head-to-head results: side-by-side rosters, season records, win probability,
 * stat edge breakdown and the simulated series.
 */
export default function H2HCompare({ payload, youId, players, onRematch, readOnly, sport }) {
  const r = payload?.h2h || payload;
  const [shareState, setShareState] = useState("");
  if (!r || !r.order) return null;
  const Versus = sport?.Versus || FullCourt;
  const singleGame = r.series.games.length === 1;

  const [idA, idB] = r.order;
  const nameA = r.names[idA];
  const nameB = r.names[idB];
  const seasonA = r.seasons[idA];
  const seasonB = r.seasons[idB];
  const winnerName = r.names[r.winnerId];
  const g0 = r.series.games[0];
  const seriesScore = singleGame
    ? `${Math.max(g0.a, g0.b)}-${Math.min(g0.a, g0.b)}`
    : `${Math.max(r.series.winsA, r.series.winsB)}-${Math.min(r.series.winsA, r.series.winsB)}`;
  const youWon = youId && r.winnerId === youId;

  async function shareLink() {
    try {
      setShareState("…");
      const { id } = await apiPost("/results", { mode: "h2h", h2h: r });
      const url = `${location.origin}${location.pathname}#/r/${id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "82-0 Arena H2H", text: `${winnerName} won the series ${seriesScore}!`, url });
          setShareState("shared!");
          return;
        } catch {
          /* fall back to clipboard */
        }
      }
      await copyText(url);
      setShareState("link copied!");
    } catch {
      setShareState("share failed");
    }
  }

  const rematchVotes = players?.filter((p) => p.rematch).map((p) => p.name) || [];

  return (
    <div className="animate-pop space-y-4">
      {youWon && <Confetti />}
      <div
        className={`rounded-2xl border p-5 text-center ${
          youId
            ? youWon
              ? "border-emerald-500/60 bg-emerald-950/40"
              : "border-rose-500/60 bg-rose-950/40"
            : "border-hoop/50 bg-hoop/10"
        }`}
      >
        <div className="text-xs uppercase tracking-widest text-slate-400">
          Series Result
        </div>
        <div className="mt-1 text-2xl font-black sm:text-3xl">
          {youId ? (youWon ? "🏆 YOU WIN" : "😤 YOU LOSE") : `🏆 ${winnerName} wins`}{" "}
          <span className="text-hoop2">{seriesScore}</span>
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {winnerName} takes the head-to-head series over{" "}
          {r.winnerId === idA ? nameB : nameA}
        </div>
      </div>

      {/* win probability bar */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-1 flex justify-between text-xs font-bold">
          <span className="text-sky-400">{nameA} · {r.series.winProbA}%</span>
          <span className="text-rose-400">{Math.round((100 - r.series.winProbA) * 10) / 10}% · {nameB}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-sky-500" style={{ width: `${r.series.winProbA}%` }} />
          <div className="flex-1 bg-rose-500" />
        </div>
        <div className="mt-1 text-center text-[10px] uppercase tracking-widest text-slate-500">
          per-game win probability
        </div>
      </div>

      {/* season records side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { id: idA, name: nameA, season: seasonA, accent: "#38bdf8" },
          { id: idB, name: nameB, season: seasonB, accent: "#fb7185" },
        ].map(({ id, name, season, accent }) => (
          <div key={id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
            <GradeBadge grade={season.grade} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold" style={{ color: accent }}>
                {name} {id === r.winnerId && "👑"}
              </div>
              <div className="text-xl font-black tabular-nums">
                {season.wins}-{season.losses}
              </div>
              <div className="text-[10px] text-slate-500">overall {season.overall}</div>
            </div>
          </div>
        ))}
      </div>

      {/* both squads on one board */}
      <Versus
        teamA={r.rosters[idA]}
        teamB={r.rosters[idB]}
        nameA={nameA}
        nameB={nameB}
        accentA="#38bdf8"
        accentB="#fb7185"
      />

      {/* stat edges */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
          Statistical Edge
        </h3>
        <div className="space-y-1.5">
          {r.edges.map((e) => (
            <div key={e.key} className="flex items-center gap-2 text-xs">
              <span
                className={`w-10 flex-none text-right font-black tabular-nums ${
                  e.edge === "A" ? "text-sky-400" : "text-slate-500"
                }`}
              >
                {e.a}
              </span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                <div className="flex w-1/2 justify-end">
                  <div
                    className="h-full rounded-l-full bg-sky-500"
                    style={{ width: `${e.a}%` }}
                  />
                </div>
                <div className="w-1/2">
                  <div
                    className="h-full rounded-r-full bg-rose-500"
                    style={{ width: `${e.b}%` }}
                  />
                </div>
              </div>
              <span
                className={`w-10 flex-none font-black tabular-nums ${
                  e.edge === "B" ? "text-rose-400" : "text-slate-500"
                }`}
              >
                {e.b}
              </span>
              <span className="w-20 flex-none text-slate-400">{e.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* series / game log */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          {singleGame
            ? `Final Score · ${winnerName}`
            : `Best-of-7 · ${winnerName} in ${r.series.games.length}`}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {r.series.games.map((g, i) => (
            <div
              key={i}
              className={`rounded-lg border p-2 text-center text-sm ${
                g.winner === "A"
                  ? "border-sky-700/60 bg-sky-950/40"
                  : "border-rose-700/60 bg-rose-950/40"
              }`}
            >
              <div className="text-[10px] uppercase text-slate-500">
                Game {i + 1}
                {g.ot ? " · OT" : ""}
              </div>
              <div className="font-black tabular-nums">
                <span className={g.winner === "A" ? "text-sky-300" : "text-slate-400"}>{g.a}</span>
                <span className="text-slate-600"> — </span>
                <span className={g.winner === "B" ? "text-rose-300" : "text-slate-400"}>{g.b}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ladder update */}
      {r.ladder && (
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Ranked ladder updated
          </h3>
          {Object.entries(r.ladder).map(([name, rec]) => (
            <div key={name} className="flex items-center justify-between gap-2 py-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{name}</span>
                <RankBadge elo={rec.elo} size="sm" />
              </span>
              <span className="flex-none tabular-nums text-slate-400">
                {rec.wins}W-{rec.losses}L · <span className="font-bold text-hoop2">{rec.elo}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onRematch && (
          <button
            onClick={onRematch}
            className="rounded-xl bg-hoop px-5 py-3 font-bold text-black transition hover:bg-hoop2 active:scale-95"
          >
            {rematchVotes.length > 0 ? `Rematch (${rematchVotes.length}/2 in)` : "Rematch"}
          </button>
        )}
        {!readOnly && (
          <button
            onClick={shareLink}
            className="rounded-xl border border-line bg-panel px-5 py-3 font-bold transition hover:bg-panel2 active:scale-95"
          >
            {shareState || "Share Result"}
          </button>
        )}
      </div>
    </div>
  );
}
