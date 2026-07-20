import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/leaderboard")
      .then((data) => setRows(data.leaderboard))
      .catch(() =>
        setError(
          "The ranked ladder lives on the live game server, which isn't running here. Solo mode works everywhere — head-to-head and rankings need the Node server."
        )
      );
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-black sm:text-2xl">🏆 H2H Leaderboard</h1>
      <p className="mb-4 text-xs text-slate-400">
        Ranked by rating (Elo). Win head-to-head matches to climb.
      </p>
      {error && (
        <div className="rounded-xl border border-line bg-panel p-4 text-sm text-slate-400">
          {error}
        </div>
      )}
      {!rows && !error && (
        <div className="rounded-xl border border-line bg-panel p-4 text-sm text-slate-400">
          Loading…
        </div>
      )}
      {rows && rows.length === 0 && (
        <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-slate-400">
          No ranked matches yet. Play a head-to-head game to get on the board!
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel2 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">W</th>
                <th className="px-3 py-2 text-right">L</th>
                <th className="px-3 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="bg-panel">
              {rows.map((r, i) => (
                <tr key={r.name} className="border-t border-line/50">
                  <td className="px-3 py-2 font-bold text-slate-500">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-400">
                    {r.wins}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-400">
                    {r.losses}
                  </td>
                  <td className="px-3 py-2 text-right font-black tabular-nums text-hoop2">
                    {Math.round(r.elo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
