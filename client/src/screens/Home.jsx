import PlayerPhoto from "../components/PlayerPhoto.jsx";

const MARQUEE = [
  { name: "Michael Jordan", team: "Chicago Bulls" },
  { name: "Magic Johnson", team: "Los Angeles Lakers" },
  { name: "Wilt Chamberlain", team: "Philadelphia 76ers" },
  { name: "Stephen Curry", team: "Golden State Warriors" },
  { name: "Nikola Jokic", team: "Denver Nuggets" },
];

export default function Home({ navigate }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="py-8 text-center sm:py-12">
        <div className="mb-4 flex items-center justify-center">
          {MARQUEE.map((p, i) => (
            <div
              key={p.name}
              className="animate-slide-up -ml-3 first:ml-0"
              style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards", zIndex: 10 - i }}
            >
              <PlayerPhoto
                name={p.name}
                team={p.team}
                className="h-14 w-14 rounded-full border-2 border-court shadow-lg sm:h-16 sm:w-16"
              />
            </div>
          ))}
        </div>
        <h1 className="font-display text-6xl font-bold uppercase tracking-tight sm:text-8xl">
          82-0 <span className="text-hoop">Arena</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
          Spin the wheel. Get a decade and a franchise. Draft one legend per
          spin until your five-man squad is set — then sim a full 82-game
          season. Chase perfection.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigate("/solo")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
        >
          <div className="text-3xl">🎰</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            Solo Run
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Five spins, five picks, one season. How close to 82-0 can you get?
          </p>
        </button>
        <button
          onClick={() => navigate("/h2h")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">⚔️</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            Head-to-Head
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Live draft vs a friend from identical spins, on a pick clock — then
            your squads collide in a best-of-7.
          </p>
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98] sm:col-span-2"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
                Leaderboard
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Ranked head-to-head records — climb the ladder.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-panel/60 p-4 text-xs text-slate-500">
        <span className="font-bold text-slate-400">How the sim works:</span>{" "}
        every player carries a 2K-legends-calibrated overall plus scoring,
        rebounding and playmaking numbers. Your record comes from weighted
        talent, star power, positional fit, lineup balance — and chemistry
        penalties when you mix eras that never shared a court.
      </div>
    </div>
  );
}
