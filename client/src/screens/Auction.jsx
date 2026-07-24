import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useSport } from "../lib/sport.jsx";
import { getSport } from "../lib/sports.js";
import { useAuctionRoom } from "../lib/auctionRoom.js";
import {
  initAuction,
  bid,
  pass,
  canRaise,
  currentPlayer,
  openSlots,
  START_BUDGET,
} from "../../../shared/auction.js";
import H2HCompare from "../components/H2HCompare.jsx";
import RankBadge from "../components/RankBadge.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import PlayerPhoto from "../components/PlayerPhoto.jsx";
import { teamMetaAny } from "../lib/teamColors.js";
import { copyText } from "../lib/share.js";

export default function Auction({ code: inviteCode, navigate }) {
  const { user, profile, loading, configured, refreshProfile } = useAuth();
  const activeSport = useSport();
  const auction = useAuctionRoom();
  const { room, error, busy } = auction;
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(inviteCode || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile?.username) setName(profile.username);
  }, [profile]);
  useEffect(() => {
    if (user && inviteCode && !room) auction.watch(inviteCode.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inviteCode]);

  const sport = room?.sport ? getSport(room.sport) : activeSport;

  if (!configured) return <Shell><AuthPanel /></Shell>;
  if (loading) return <Shell><Loading /></Shell>;
  if (!user)
    return (
      <Shell>
        <p className="mb-3 text-sm text-slate-400">The Auction is online — log in so your wins count toward your rank.</p>
        <AuthPanel note="Sign in to create or join an auction room." />
      </Shell>
    );

  const youAreHost = room && room.host === user.id;
  const yourIndex = youAreHost ? 0 : 1;

  // ----- lobby entry -----
  if (!room) {
    return (
      <Shell>
        <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Playing as
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="mt-1 w-full rounded-xl border border-line bg-court px-3 py-2.5 text-base font-semibold text-slate-100 outline-none focus:border-hoop"
            />
          </label>
          <button
            disabled={!name.trim() || busy}
            onClick={() => auction.createRoom(name.trim(), activeSport.id)}
            className="w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? "…" : `Create a ${activeSport.label.toLowerCase()} auction`}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-px flex-1 bg-line" /> or join <div className="h-px flex-1 bg-line" />
          </div>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="CODE"
              className="w-28 rounded-xl border border-line bg-court px-3 py-2.5 text-center font-mono text-lg font-black tracking-widest outline-none focus:border-hoop"
            />
            <button
              disabled={!name.trim() || joinCode.length !== 4 || busy}
              onClick={() => auction.joinRoom(joinCode.toUpperCase(), name.trim())}
              className="flex-1 rounded-xl border border-line bg-panel2 font-bold text-slate-200 transition hover:border-hoop disabled:opacity-40"
            >
              Join room
            </button>
          </div>
        </div>
        {error && <ErrorNote msg={error} onClear={auction.clearError} />}
      </Shell>
    );
  }

  // ----- lobby: waiting / start -----
  if (room.status === "lobby") {
    const link = `${location.origin}/#/auction/${room.code}`;
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-panel p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Room code</div>
          <div className="my-2 font-display text-5xl font-black tracking-[0.3em] text-hoop2">{room.code}</div>
          <button
            onClick={async () => {
              await copyText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-slate-300 hover:bg-panel2"
          >
            {copied ? "Link copied ✓" : "Copy invite link"}
          </button>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <Seat name={room.host_name} label="Host" ready />
            <span className="text-slate-600">vs</span>
            <Seat name={room.guest_name} label="Guest" ready={Boolean(room.guest)} />
          </div>
          {youAreHost ? (
            <button
              disabled={!room.guest || busy}
              onClick={() => {
                const seed = Math.floor(Math.random() * 2 ** 31);
                const queue = sport.auctionQueue({ rng: Math.random });
                const state = initAuction({ rosterSize: sport.slots.length, queue });
                auction.startAuction(room.code, queue, seed, state);
              }}
              className="mt-4 w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
            >
              {room.guest ? "Start the auction — $20 each" : "Waiting for a second player…"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Waiting for the host to start…</p>
          )}
        </div>
        <LeaveBtn onLeave={() => { auction.leave(); navigate("/auction"); }} />
        {error && <ErrorNote msg={error} onClear={auction.clearError} />}
      </Shell>
    );
  }

  const state = room.state;
  const bothNames = [room.host_name, room.guest_name];
  const oppName = bothNames[1 - yourIndex];

  // ----- auction complete → sim + results -----
  if (state && state.status === "done") {
    return (
      <AuctionResult
        room={room}
        sport={sport}
        yourIndex={yourIndex}
        youAreHost={youAreHost}
        onFinish={(w, r) => auction.finishAuction(room.code, w, r)}
        onProfileRefresh={refreshProfile}
        profile={profile}
        onLeave={() => { auction.leave(); navigate("/auction"); }}
      />
    );
  }

  // ----- bidding -----
  const lot = state ? currentPlayer(state) : null;
  const myTurn = state && state.turn === yourIndex;
  const holderName = state ? bothNames[state.highBidder] : "";
  const iCanRaise = state && myTurn && canRaise(state, yourIndex);

  function act(kind) {
    if (!state || !myTurn || busy) return;
    const next = kind === "raise" ? bid(state, yourIndex) : pass(state, yourIndex);
    if (next === state) return; // illegal / no-op
    auction.submitAction(room.code, next, room.version);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">💰 Auction</h1>
        <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-500">
          lot {state.index + 1}
        </span>
      </div>

      {/* budgets */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <BudgetCard name={bothNames[0]} you={yourIndex === 0} state={state} who={0} rosterSize={sport.slots.length} />
        <BudgetCard name={bothNames[1]} you={yourIndex === 1} state={state} who={1} rosterSize={sport.slots.length} />
      </div>

      {/* the lot on the block */}
      {lot && <LotCard player={lot} sport={sport} />}

      {/* price + turn */}
      <div className="mt-3 rounded-2xl border border-line bg-panel p-3 text-center">
        <div className="text-xs text-slate-400">
          Held by <span className="font-bold" style={{ color: state.highBidder === yourIndex ? "#38bdf8" : "#fb7185" }}>
            {state.highBidder === yourIndex ? "you" : holderName}
          </span>{" "}
          at <span className="font-display text-lg font-black text-hoop2">${state.currentBid}</span>
        </div>
      </div>

      {/* actions */}
      {myTurn ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => act("raise")}
            disabled={!iCanRaise || busy}
            className={`rounded-2xl py-5 font-display text-xl font-black uppercase tracking-wider transition active:scale-95 ${
              iCanRaise && !busy
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-black hover:from-emerald-300 hover:to-emerald-500"
                : "cursor-not-allowed border border-line bg-panel text-slate-600"
            }`}
          >
            ⬆ Bid ${state.currentBid + 1}
          </button>
          <button
            onClick={() => act("pass")}
            disabled={busy}
            className="rounded-2xl border border-line bg-panel2 py-5 font-display text-xl font-black uppercase tracking-wider text-slate-200 transition hover:border-rose-500 hover:text-rose-300 active:scale-95"
          >
            ✕ Let {state.highBidder === yourIndex ? "him go" : "'em have him"}
          </button>
        </div>
      ) : (
        <Loading label={`${oppName || "Opponent"} is deciding on ${lot?.name || "the player"}…`} />
      )}
      {!iCanRaise && myTurn && (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          You can't raise (budget reserved to fill your other spots) — concede this one.
        </p>
      )}

      {error && <ErrorNote msg={error} onClear={auction.clearError} />}
      <LeaveBtn onLeave={() => { auction.leave(); navigate("/auction"); }} />
    </div>
  );
}

function AuctionResult({ room, sport, yourIndex, youAreHost, onFinish, onProfileRefresh, profile, onLeave }) {
  const finishedRef = useRef(false);
  const state = room.state;

  const computed = useMemo(() => {
    const A = sport.rosterFromPicks(state.won[0]);
    const B = sport.rosterFromPicks(state.won[1]);
    const rng = sport.makeRng(Number(room.seed) >>> 0);
    const evA = sport.evaluateTeam(A);
    const evB = sport.evaluateTeam(B);
    const series = sport.simulateSeries(evA, evB, rng);
    const seasons = { host: sport.simulateSeason(A, rng), guest: sport.simulateSeason(B, rng) };
    return {
      winnerIndex: series.winner === "A" ? 0 : 1,
      payload: {
        order: ["host", "guest"],
        names: { host: room.host_name, guest: room.guest_name },
        seasons,
        rosters: { host: A, guest: B },
        series,
        edges: sport.statEdges(evA, evB),
        winnerId: series.winner === "A" ? "host" : "guest",
      },
    };
  }, [room, sport, state]);

  useEffect(() => {
    if (!computed || room.status === "done" || !youAreHost || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(computed.winnerIndex, {
      winner: computed.winnerIndex,
      winsA: computed.payload.series.winsA,
      winsB: computed.payload.series.winsB,
    });
  }, [computed, room.status, youAreHost, onFinish]);

  useEffect(() => {
    if (room.status === "done") onProfileRefresh?.();
  }, [room.status, onProfileRefresh]);

  const done = room.status === "done";
  const youWon = computed.winnerIndex === yourIndex;
  const eloGain = room.result?.eloGain ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">💰 Auction</h1>
      {done ? (
        <div className={`rounded-2xl border p-4 text-center ${youWon ? "border-emerald-500/50 bg-emerald-500/10" : "border-line bg-panel"}`}>
          <div className="font-display text-2xl font-black uppercase tracking-wide">{youWon ? "🏆 You win!" : "You lost"}</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm">
            <RankBadge elo={profile?.elo ?? 1000} size="sm" />
            <span className={youWon ? "font-bold text-emerald-400" : "text-slate-500"}>
              {youWon ? `+${eloGain} Elo` : "No Elo lost"}
            </span>
          </div>
        </div>
      ) : (
        <Loading label="Both rosters set — simulating the matchup…" />
      )}
      <H2HCompare payload={computed.payload} youId={youAreHost ? "host" : "guest"} readOnly sport={sport} />
      <button onClick={onLeave} className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest">
        💰 New auction
      </button>
    </div>
  );
}

function BudgetCard({ name, you, state, who, rosterSize }) {
  const accent = who === 0 ? "#38bdf8" : "#fb7185";
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="truncate font-display text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>
          {name}{you ? " (you)" : ""}
        </span>
        <span className="font-display text-lg font-black tabular-nums text-emerald-300">${state.budgets[who]}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {Array.from({ length: rosterSize }).map((_, i) => {
          const p = state.won[who][i];
          return (
            <span
              key={i}
              title={p ? `${p.name} · ${p.rating}` : "open"}
              className="flex h-6 min-w-[1.6rem] items-center justify-center rounded px-1 text-[10px] font-bold"
              style={{
                background: p ? "rgba(255,255,255,0.08)" : "transparent",
                border: p ? "none" : "1px dashed rgba(255,255,255,0.18)",
                color: p ? "#e2e8f0" : "rgba(255,255,255,0.3)",
              }}
            >
              {p ? p.rating : "—"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function LotCard({ player, sport }) {
  const meta = teamMetaAny(player.team);
  return (
    <div className="animate-pop overflow-hidden rounded-3xl border border-line bg-panel shadow-xl shadow-black/40">
      <div className="relative flex items-center gap-3 p-3" style={{ background: `linear-gradient(120deg, ${meta.color}33, transparent 70%)` }}>
        <div className="aspect-square w-20 flex-none overflow-hidden rounded-full border-2" style={{ borderColor: meta.color }}>
          <PlayerPhoto name={player.name} team={player.team} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-2xl font-bold uppercase tracking-wide">{player.name}</div>
          <div className="text-xs uppercase tracking-wider text-slate-400">
            <span style={{ color: meta.color }}>{meta.abbr}</span> · {player.decade} · {sport.playerPositionLabel(player)}
          </div>
        </div>
        <span className="ml-auto rounded-lg bg-black/80 px-2 py-1 font-display text-2xl font-black text-hoop2">
          {player.rating}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Shell({ children }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">💰 Auction</h1>
      <p className="mb-3 text-xs text-slate-400">
        Online only — you and a friend each get $20 and bid, one player at a time, to build your rosters. Then the squads sim.
      </p>
      {children}
    </div>
  );
}
function Seat({ name, label, ready }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ready ? "border-hoop/60 bg-hoop/10" : "border-line bg-panel2"}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-display font-bold text-slate-100">{name || "…"}</div>
    </div>
  );
}
function Loading({ label = "Loading…" }) {
  return (
    <div className="mt-3 rounded-2xl border border-line bg-panel p-6 text-center text-slate-400">
      <span className="animate-floaty inline-block text-3xl">💰</span>
      <div className="mt-1 text-sm">{label}</div>
    </div>
  );
}
function ErrorNote({ msg, onClear }) {
  return (
    <div className="mt-3 rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-300">
      {msg} <button onClick={onClear} className="underline">dismiss</button>
    </div>
  );
}
function LeaveBtn({ onLeave }) {
  return (
    <button onClick={onLeave} className="mt-4 text-xs font-semibold text-slate-500 underline hover:text-slate-300">
      Leave room
    </button>
  );
}
