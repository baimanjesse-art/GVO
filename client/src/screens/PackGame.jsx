import { useState } from "react";
import { evaluateTeam } from "../../../shared/sim.js";
import CourtBoard from "../components/CourtBoard.jsx";
import PackBuilder from "../components/PackBuilder.jsx";
import { useAuth } from "../lib/auth.jsx";
import { supabase } from "../lib/supabase.js";

const BEST_KEY = "arena-pack-best";

export default function PackGame({ navigate }) {
  const { user, profile, refreshProfile } = useAuth();
  const [result, setResult] = useState(null);
  const [roster, setRoster] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const [key, setKey] = useState(0); // remount PackBuilder to reset it

  async function complete(_upgraded, builtRoster) {
    const ev = evaluateTeam(builtRoster);
    const overall = ev.overall;
    setRoster(builtRoster);
    setResult({ ev, overall });
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
    setResult(null);
    setRoster(null);
    setKey((k) => k + 1);
  }

  if (result && roster) {
    const displayBest = user && profile?.pack_best ? profile.pack_best : best;
    return (
      <div className="mx-auto max-w-3xl animate-slide-up space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">Pack &amp; Play</h1>
        <div className="rounded-2xl border border-line bg-panel p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Team Overall</div>
          <div className="my-1 font-display text-6xl font-black tabular-nums text-hoop2">{result.overall}</div>
          <div className="text-sm text-slate-400">
            Your best team overall:{" "}
            <span className="font-bold text-slate-200">{Math.max(displayBest, Math.round(result.overall))}</span>
            {Math.round(result.overall) >= displayBest && (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                new best! 🎉
              </span>
            )}
          </div>
          {result.ev.strengths?.[0] && <p className="mt-2 text-xs text-slate-500">{result.ev.strengths[0].text}</p>}
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">🎁 Pack &amp; Play</h1>
        <button
          onClick={() => navigate("/packs/versus")}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-hoop hover:text-hoop2"
        >
          ⚔️ Play a friend
        </button>
      </div>
      <PackBuilder
        key={key}
        confirmLabel="🏀 Reveal my team overall"
        onComplete={complete}
        intro={
          <p className="mb-4 text-xs text-slate-400">
            Five packs, one per position — each deals five 80+ players. First, pick{" "}
            <span className="text-hoop2">one position to upgrade</span>: that pack deals five 88+ stars, one of them
            90+. Then open, take one from each, and build your highest-overall five.
          </p>
        }
      />
    </div>
  );
}
