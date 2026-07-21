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
      <div className="relative overflow-hidden py-10 text-center sm:py-14">
        {/* center-court circle behind the hero */}
        <svg
          viewBox="0 0 100 60"
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto w-full max-w-xl -translate-y-1/2 opacity-25"
          aria-hidden="true"
        >
          <g stroke="#f3e3c3" strokeWidth="0.35" fill="none">
            <circle cx="50" cy="30" r="24" />
            <circle cx="50" cy="30" r="4.5" fill="#f97316" fillOpacity="0.35" />
            <line x1="50" y1="0" x2="50" y2="60" />
          </g>
        </svg>

        {/* the starting five, huddled on the center circle */}
        <div className="mb-5 flex items-end justify-center">
          {MARQUEE.map((p, i) => (
            <div
              key={p.name}
              className="animate-slide-up -ml-3 first:ml-0"
              style={{
                animationDelay: `${i * 90}ms`,
                animationFillMode: "backwards",
                zIndex: 10 - i,
                transform: `translateY(${[8, 3, 0, 3, 8][i]}px)`,
              }}
            >
              <PlayerPhoto
                name={p.name}
                team={p.team}
                className="h-14 w-14 rounded-full border-2 border-[#3a2917] shadow-[0_6px_16px_rgba(0,0,0,0.6)] sm:h-16 sm:w-16"
              />
            </div>
          ))}
        </div>

        <h1
          className="font-display text-6xl font-bold uppercase leading-none tracking-tight sm:text-8xl"
          style={{ textShadow: "0 6px 0 rgba(0,0,0,0.45), 0 14px 34px rgba(249,115,22,0.25)" }}
        >
          <span className="led tabular-nums">82-0</span>{" "}
          <span className="text-slate-100">Arena</span>
        </h1>
        <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-gradient-to-r from-transparent via-hoop to-transparent" />
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
          Spin the wheel. Get a decade and a franchise. Put one legend on the
          floor per spin until your five are set — then sim a full 82-game
          season. Chase perfection.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigate("/solo")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
        >
          <div className="text-3xl">🏀</div>
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
          onClick={() => navigate("/draft")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98] sm:col-span-2"
          style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">🎯</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            Draft <span className="text-hoop">· Online</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Create a room, share the code. Fifteen stars spawn in and you snake-draft
            five apiece — pick 2 & 3 go to whoever's second, so nobody's punished for
            drawing the back end. Sim it out; the winner climbs the ranked ladder.
          </p>
        </button>
        <button
          onClick={() => navigate("/battle/historic")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">🕰️</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            Historic Battle
          </div>
          <p className="mt-1 text-sm text-slate-400">
            One spin draws a real team and locks their era. Beat the actual
            squad with their own decade's players — everyone at his natural
            position.
          </p>
        </button>
        <button
          onClick={() => navigate("/battle/alltime")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98]"
          style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <div className="text-3xl">🐐</div>
          <div className="mt-2 font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
            All-Time Battle
          </div>
          <p className="mt-1 text-sm text-slate-400">
            The 72-10 Bulls, the 73-9 Warriors, even the Dream Team — every
            era spin deals five random 88+ stars. Take one per spin and slay
            a legend.
          </p>
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="group animate-slide-up rounded-2xl border border-line bg-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-hoop hover:bg-panel2 hover:shadow-xl hover:shadow-hoop/10 active:scale-[0.98] sm:col-span-2"
          style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="font-display text-2xl font-bold uppercase tracking-wide group-hover:text-hoop2">
                Rankings
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Climb seven Elo tiers — Rookie to Hall of Famer — online in H2H
                and offline in the battle modes.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-panel/60 p-4 text-xs text-slate-500">
        <span className="font-bold text-slate-400">How the sim works:</span>{" "}
        every player carries a 2K-legends-calibrated overall plus scoring,
        rebounding and playmaking numbers. Your record comes from weighted
        talent, star power, positional fit and lineup balance. Mixing eras is
        the whole point — build the cross-generation super team the debates
        are made of.
      </div>
    </div>
  );
}
