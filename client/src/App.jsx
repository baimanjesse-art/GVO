import { useHashRoute } from "./lib/router.js";
import Home from "./screens/Home.jsx";
import SoloGame from "./screens/SoloGame.jsx";
import H2HGame from "./screens/H2HGame.jsx";
import BattleGame from "./screens/BattleGame.jsx";
import DraftGame from "./screens/DraftGame.jsx";
import PackGame from "./screens/PackGame.jsx";
import PackVersus from "./screens/PackVersus.jsx";
import Leaderboard from "./screens/Leaderboard.jsx";
import SharedResult from "./screens/SharedResult.jsx";
import Account from "./screens/Account.jsx";
import { useAuth } from "./lib/auth.jsx";
import { useSportControls } from "./lib/sport.jsx";
import RankBadge from "./components/RankBadge.jsx";

export default function App() {
  const [segments, navigate] = useHashRoute();
  const [page, param] = segments;
  const sportCtl = useSportControls();
  const sportId = sportCtl?.sportId || "basketball";
  const isFootball = sportId === "football";

  let screen;
  if (!page) screen = <Home navigate={navigate} sportId={sportId} />;
  else if (page === "solo") screen = <SoloGame key={sportId} />;
  else if (page === "h2h") screen = <H2HGame inviteCode={param} />;
  else if (page === "draft") screen = <DraftGame code={param} navigate={navigate} />;
  else if (page === "packs")
    screen =
      param === "versus" ? (
        <PackVersus code={segments[2]} navigate={navigate} />
      ) : (
        <PackGame navigate={navigate} />
      );
  else if (page === "battle")
    screen = <BattleGame key={param || "pick"} mode={param} navigate={navigate} />;
  else if (page === "leaderboard") screen = <Leaderboard />;
  else if (page === "account") screen = <Account navigate={navigate} />;
  else if (page === "r" && param) screen = <SharedResult id={param} navigate={navigate} />;
  else screen = <Home navigate={navigate} />;

  return (
    <div className="min-h-screen">
      <header className="scoreboard sticky top-0 z-20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide"
          >
            <span className="ball-icon" aria-hidden="true" />
            <span>
              <span className="led tabular-nums">82-0</span>{" "}
              <span className="text-slate-200">Arena</span>
            </span>
          </button>
          <nav className="flex items-center gap-1 text-sm font-bold">
            {sportCtl && (
              <SportToggle
                sportId={sportId}
                onPick={(id) => {
                  sportCtl.setSport(id);
                  // Only Solo is wired for football today — send the user there
                  // when they flip sports off a basketball-only screen.
                  if (id === "football" && !["", "solo"].includes(page)) navigate("/solo");
                }}
              />
            )}
            <NavBtn onClick={() => navigate("/solo")} active={page === "solo"}>
              Solo
            </NavBtn>
            {!isFootball && (
              <>
                <NavBtn onClick={() => navigate("/draft")} active={page === "draft"}>
                  <span className="sm:hidden">🎯</span>
                  <span className="hidden sm:inline">Draft</span>
                </NavBtn>
                <NavBtn onClick={() => navigate("/battle")} active={page === "battle"}>
                  <span className="sm:hidden">⚔️</span>
                  <span className="hidden sm:inline">Battles</span>
                </NavBtn>
                <NavBtn
                  onClick={() => navigate("/leaderboard")}
                  active={page === "leaderboard"}
                >
                  <span className="sm:hidden">🏆</span>
                  <span className="hidden sm:inline">Ranks</span>
                </NavBtn>
              </>
            )}
            <AccountChip navigate={navigate} active={page === "account"} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 pb-16 sm:py-6">{screen}</main>
    </div>
  );
}

function AccountChip({ navigate, active }) {
  const { user, profile, configured, loading } = useAuth();
  if (!configured) return null;
  const ring = active ? "border-hoop" : "border-line hover:border-hoop/60";
  if (loading) {
    return <span className={`ml-1 rounded-full border ${ring} px-3 py-1.5 text-slate-500`}>…</span>;
  }
  if (!user) {
    return (
      <button
        onClick={() => navigate("/account")}
        className={`ml-1 rounded-full border ${ring} bg-panel2 px-3 py-1.5 font-display uppercase tracking-wider text-slate-300 transition`}
      >
        Sign in
      </button>
    );
  }
  return (
    <button
      onClick={() => navigate("/account")}
      title={profile?.username || "Account"}
      className={`ml-1 flex items-center gap-1.5 rounded-full border ${ring} bg-panel2 px-2 py-1 transition`}
    >
      <span className="hidden max-w-[7rem] truncate font-display text-xs uppercase tracking-wider text-slate-200 sm:block">
        {profile?.username || "You"}
      </span>
      <RankBadge elo={profile?.elo ?? 1000} size="sm" />
    </button>
  );
}

function SportToggle({ sportId, onPick }) {
  const opts = [
    { id: "basketball", icon: "🏀", label: "Basketball" },
    { id: "football", icon: "🏈", label: "Football" },
  ];
  return (
    <div className="mr-1 flex items-center rounded-full border border-line bg-panel2 p-0.5">
      {opts.map((o) => {
        const active = sportId === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            title={o.label}
            aria-pressed={active}
            className={`rounded-full px-2 py-1 text-base leading-none transition ${
              active
                ? "bg-hoop/20 ring-1 ring-hoop/60"
                : "opacity-55 grayscale hover:opacity-90 hover:grayscale-0"
            }`}
          >
            <span>{o.icon}</span>
            <span className="ml-1 hidden align-middle font-display text-[11px] uppercase tracking-wider sm:inline">
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NavBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border-b-2 px-3 py-1.5 font-display uppercase tracking-wider transition ${
        active
          ? "border-hoop bg-white/5 text-hoop2"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
