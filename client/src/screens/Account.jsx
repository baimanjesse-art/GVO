import { useAuth } from "../lib/auth.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import RankBadge from "../components/RankBadge.jsx";

export default function Account({ navigate }) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel p-6 text-sm text-slate-400">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Your Account
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Log in to save your rank forever and play online Draft. Your Elo
            follows you across every device.
          </p>
        </div>
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        Your Account
      </h1>
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-xl font-bold text-slate-100">
              {profile?.username || user.email}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <RankBadge elo={profile?.elo ?? 1000} size="lg" />
        </div>
        <div className="mt-4 flex gap-5 text-sm tabular-nums">
          <Stat label="Rating" value={Math.round(profile?.elo ?? 1000)} accent="text-hoop2" />
          <Stat label="Won" value={profile?.wins ?? 0} accent="text-emerald-400" />
          <Stat label="Lost" value={profile?.losses ?? 0} accent="text-rose-400" />
          <Stat label="Peak" value={Math.round(profile?.best_elo ?? 1000)} accent="text-slate-200" />
        </div>
        <div className="mt-4">
          <RankBadge elo={profile?.elo ?? 1000} size="md" progress />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate("/draft")}
          className="flex-1 rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98]"
        >
          🎯 Play Draft
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="flex-1 rounded-xl border border-line bg-panel2 py-3 font-bold text-slate-200 transition hover:border-hoop active:scale-[0.98]"
        >
          🏆 Leaderboard
        </button>
      </div>
      <button
        onClick={signOut}
        className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-slate-400 transition hover:border-rose-700 hover:text-rose-300"
      >
        Sign out
      </button>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className={`font-display text-xl font-black ${accent}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
