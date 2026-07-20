import { useHashRoute } from "./lib/router.js";
import Home from "./screens/Home.jsx";
import SoloGame from "./screens/SoloGame.jsx";
import H2HGame from "./screens/H2HGame.jsx";
import Leaderboard from "./screens/Leaderboard.jsx";
import SharedResult from "./screens/SharedResult.jsx";

export default function App() {
  const [segments, navigate] = useHashRoute();
  const [page, param] = segments;

  let screen;
  if (!page) screen = <Home navigate={navigate} />;
  else if (page === "solo") screen = <SoloGame />;
  else if (page === "h2h") screen = <H2HGame inviteCode={param} />;
  else if (page === "leaderboard") screen = <Leaderboard />;
  else if (page === "r" && param) screen = <SharedResult id={param} navigate={navigate} />;
  else screen = <Home navigate={navigate} />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-court/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="font-display text-2xl font-bold uppercase tracking-wide"
          >
            🏀 82-0 <span className="text-hoop">Arena</span>
          </button>
          <nav className="flex gap-1 text-sm font-bold">
            <NavBtn onClick={() => navigate("/solo")} active={page === "solo"}>
              Solo
            </NavBtn>
            <NavBtn onClick={() => navigate("/h2h")} active={page === "h2h"}>
              H2H
            </NavBtn>
            <NavBtn
              onClick={() => navigate("/leaderboard")}
              active={page === "leaderboard"}
            >
              <span className="sm:hidden">🏆</span>
              <span className="hidden sm:inline">Leaderboard</span>
            </NavBtn>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 pb-16 sm:py-6">{screen}</main>
    </div>
  );
}

function NavBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 transition ${
        active ? "bg-panel2 text-hoop2" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
