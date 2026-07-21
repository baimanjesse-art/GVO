import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useDraftRoom } from "../lib/draftRoom.js";
import {
  draftPool,
  rosterFromPicks,
  whoseTurn,
  SNAKE_ORDER,
  TOTAL_PICKS,
  PICKS_PER_PLAYER,
} from "../../../shared/draft.js";
import {
  evaluateTeam,
  simulateSeason,
  simulateSeries,
  statEdges,
  makeRng,
} from "../../../shared/sim.js";
import { POSITIONS } from "../../../shared/constants.js";
import PlayerCard from "../components/PlayerCard.jsx";
import CourtBoard from "../components/CourtBoard.jsx";
import H2HCompare from "../components/H2HCompare.jsx";
import RankBadge from "../components/RankBadge.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import { copyText } from "../lib/share.js";

export default function DraftGame({ code: inviteCode, navigate }) {
  const { user, profile, loading, configured, refreshProfile } = useAuth();
  const draft = useDraftRoom();
  const { room, error, busy } = draft;

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(inviteCode || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile?.username) setName(profile.username);
  }, [profile]);

  // Auto-watch a room passed via invite link once logged in.
  useEffect(() => {
    if (user && inviteCode && !room) draft.watch(inviteCode.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inviteCode]);

  // ----- gates -----
  if (!configured) {
    return (
      <Shell>
        <AuthPanel />
      </Shell>
    );
  }
  if (loading) {
    return <Shell><Loading /></Shell>;
  }
  if (!user) {
    return (
      <Shell>
        <p className="mb-3 text-sm text-slate-400">
          Draft is online only — log in so your wins count toward your rank.
        </p>
        <AuthPanel note="Sign in to create or join a draft room." />
      </Shell>
    );
  }

  const youAreHost = room && room.host === user.id;
  const yourIndex = youAreHost ? 0 : 1;

  // ----- lobby entry (no room yet) -----
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
            onClick={() => draft.createRoom(name.trim())}
            className="w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? "…" : "Create a draft room"}
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
              onClick={() => draft.joinRoom(joinCode.toUpperCase(), name.trim())}
              className="flex-1 rounded-xl border border-line bg-panel2 font-bold text-slate-200 transition hover:border-hoop disabled:opacity-40"
            >
              Join room
            </button>
          </div>
        </div>
        {error && <ErrorNote msg={error} onClear={draft.clearError} />}
      </Shell>
    );
  }

  const yourName = youAreHost ? room.host_name : room.guest_name;
  const oppName = youAreHost ? room.guest_name : room.host_name;

  // ----- lobby: waiting / start -----
  if (room.status === "lobby") {
    const link = `${location.origin}/#/draft/${room.code}`;
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-panel p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Room code</div>
          <div className="my-2 font-display text-5xl font-black tracking-[0.3em] text-hoop2">
            {room.code}
          </div>
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
                const pool = draftPool({ rng: Math.random });
                draft.startDraft(room.code, pool, seed);
              }}
              className="mt-4 w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
            >
              {room.guest ? "Start the draft" : "Waiting for a second player…"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Waiting for the host to start…</p>
          )}
        </div>
        <LeaveBtn onLeave={() => { draft.leave(); navigate("/draft"); }} />
        {error && <ErrorNote msg={error} onClear={draft.clearError} />}
      </Shell>
    );
  }

  // ----- drafting -----
  if (room.status === "drafting") {
    return (
      <DraftBoard
        room={room}
        yourIndex={yourIndex}
        yourName={yourName}
        oppName={oppName}
        onPick={(player) => draft.makePick(room.code, player)}
        busy={busy}
        error={error}
        clearError={draft.clearError}
        onLeave={() => { draft.leave(); navigate("/draft"); }}
      />
    );
  }

  // ----- placing + results -----
  return (
    <PlaceAndResult
      room={room}
      yourIndex={yourIndex}
      youAreHost={youAreHost}
      onSubmitRoster={(r) => draft.submitRoster(room.code, r)}
      onFinish={(winner, summary) => draft.finishDraft(room.code, winner, summary)}
      onProfileRefresh={refreshProfile}
      profile={profile}
      busy={busy}
      error={error}
      clearError={draft.clearError}
      onLeave={() => { draft.leave(); navigate("/draft"); }}
    />
  );
}

// ---------------------------------------------------------------------------
function DraftBoard({ room, yourIndex, yourName, oppName, onPick, busy, error, clearError, onLeave }) {
  const picks = room.picks || [];
  const pickCount = picks.length;
  const turnIndex = whoseTurn(pickCount);
  const isMyTurn = turnIndex === yourIndex;
  const taken = useMemo(
    () => new Map(picks.map((p) => [p.player.name, p.by])),
    [picks]
  );
  const myPicks = picks.filter((p) => p.by === yourIndex).map((p) => p.player);
  const oppPicks = picks.filter((p) => p.by !== yourIndex).map((p) => p.player);

  return (
    <div className="mx-auto max-w-5xl">
      <Header />
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-2.5">
        <div className="text-sm">
          <span className="font-display uppercase tracking-wide text-slate-200">{yourName}</span>{" "}
          <span className="text-slate-500">vs</span>{" "}
          <span className="font-display uppercase tracking-wide text-slate-400">{oppName}</span>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            isMyTurn ? "animate-pulse bg-hoop text-black" : "bg-panel2 text-slate-400"
          }`}
        >
          {turnIndex === null ? "Draft complete" : isMyTurn ? "Your pick" : `${oppName} picking…`}
        </div>
      </div>

      <SnakeTracker order={SNAKE_ORDER} pickCount={pickCount} yourIndex={yourIndex} />

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            The pool · take one when it's your turn
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {(room.pool || []).map((p) => {
              const by = taken.get(p.name);
              const isTaken = by !== undefined;
              return (
                <div key={p.name} className="relative">
                  <div className={isTaken ? "opacity-30 grayscale" : ""}>
                    <PlayerCard
                      player={p}
                      onClick={() => isMyTurn && !isTaken && !busy && onPick(p)}
                    />
                  </div>
                  {isTaken && (
                    <span
                      className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-md bg-black/80 py-1 text-center font-display text-xs font-bold uppercase tracking-wider"
                      style={{ color: by === yourIndex ? "#38bdf8" : "#fb7185" }}
                    >
                      {by === yourIndex ? "Yours" : "Taken"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <PickColumn title={`${yourName} (you)`} picks={myPicks} accent="#38bdf8" />
          <PickColumn title={oppName} picks={oppPicks} accent="#fb7185" />
        </div>
      </div>
      <LeaveBtn onLeave={onLeave} />
      {error && <ErrorNote msg={error} onClear={clearError} />}
    </div>
  );
}

function PickColumn({ title, picks, accent }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {picks.length}/{PICKS_PER_PLAYER}
        </span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: PICKS_PER_PLAYER }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {picks[i] ? (
              <>
                <span className="font-bold text-slate-200">{picks[i].name}</span>
                <span className="text-slate-500">· {picks[i].rating} OVR</span>
              </>
            ) : (
              <span className="text-slate-600">— empty —</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SnakeTracker({ order, pickCount, yourIndex }) {
  return (
    <div className="flex flex-wrap gap-1">
      {order.map((who, i) => {
        const done = i < pickCount;
        const current = i === pickCount;
        const mine = who === yourIndex;
        return (
          <span
            key={i}
            title={`Pick ${i + 1}: ${mine ? "you" : "opponent"}`}
            className={`h-2.5 w-6 rounded-full ${
              current ? "animate-pulse ring-2 ring-hoop" : ""
            }`}
            style={{
              background: done
                ? mine
                  ? "#38bdf8"
                  : "#fb7185"
                : mine
                  ? "#38bdf855"
                  : "#fb718555",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
function PlaceAndResult({
  room,
  yourIndex,
  youAreHost,
  onSubmitRoster,
  onFinish,
  onProfileRefresh,
  profile,
  busy,
  error,
  clearError,
  onLeave,
}) {
  const myPicks = (room.picks || []).filter((p) => p.by === yourIndex).map((p) => p.player);
  const [roster, setRoster] = useState(() => rosterFromPicks(myPicks));
  const submittedRef = useRef(false);
  const finishedRef = useRef(false);

  const mySubmitted = youAreHost ? room.host_roster : room.guest_roster;
  const bothSubmitted = room.host_roster && room.guest_roster;

  // Deterministic sim (same seed → both clients agree on the winner).
  const computed = useMemo(() => {
    if (!bothSubmitted) return null;
    const A = room.host_roster;
    const B = room.guest_roster;
    const rng = makeRng(Number(room.seed) >>> 0);
    const evA = evaluateTeam(A);
    const evB = evaluateTeam(B);
    const series = simulateSeries(evA, evB, rng);
    const seasons = { host: simulateSeason(A, rng), guest: simulateSeason(B, rng) };
    const winnerIndex = series.winner === "A" ? 0 : 1;
    return {
      winnerIndex,
      payload: {
        order: ["host", "guest"],
        names: { host: room.host_name, guest: room.guest_name },
        seasons,
        rosters: { host: A, guest: B },
        series,
        edges: statEdges(evA, evB),
        winnerId: series.winner === "A" ? "host" : "guest",
      },
    };
  }, [bothSubmitted, room]);

  // Host finalizes once (writes result + Elo); avoids a double-write race.
  useEffect(() => {
    if (!computed || room.status !== "placing") return;
    if (!youAreHost || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(computed.winnerIndex, {
      winner: computed.winnerIndex,
      winsA: computed.payload.series.winsA,
      winsB: computed.payload.series.winsB,
    });
  }, [computed, room.status, youAreHost, onFinish]);

  // Refresh the header rank once the match is recorded.
  useEffect(() => {
    if (room.status === "done") onProfileRefresh?.();
  }, [room.status, onProfileRefresh]);

  // ----- results -----
  if (room.status === "done" && computed) {
    const youWon = computed.winnerIndex === yourIndex;
    const eloGain = room.result?.eloGain ?? 0;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Header />
        <div
          className={`rounded-2xl border p-4 text-center ${
            youWon ? "border-emerald-500/50 bg-emerald-500/10" : "border-line bg-panel"
          }`}
        >
          <div className="font-display text-2xl font-black uppercase tracking-wide">
            {youWon ? "🏆 You win!" : "You lost"}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm">
            <RankBadge elo={profile?.elo ?? 1000} size="sm" />
            <span className={youWon ? "font-bold text-emerald-400" : "text-slate-500"}>
              {youWon ? `+${eloGain} Elo` : "No Elo lost"}
            </span>
          </div>
        </div>
        <H2HCompare payload={computed.payload} youId={youAreHost ? "host" : "guest"} readOnly />
        <button
          onClick={onLeave}
          className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest"
        >
          🎯 New draft
        </button>
      </div>
    );
  }

  // ----- placing -----
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Header />
      <div className="rounded-2xl border border-line bg-panel p-3 text-sm text-slate-300">
        Draft's done — arrange your five, then lock in. Both squads sim the moment
        you're both ready.
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div className="rounded-2xl border border-line bg-panel p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Your draft picks
          </div>
          <div className="space-y-1.5">
            {myPicks.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-slate-200">{p.name}</span>
                <span className="text-slate-500">
                  · {p.rating} OVR · {p.positions.join("/")}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {mySubmitted
              ? "Locked in — waiting for your opponent…"
              : "Tap two spots on the court to swap players into their best positions."}
          </div>
        </div>
        <CourtBoard
          roster={roster}
          onSwap={
            mySubmitted
              ? undefined
              : (a, b) => setRoster((r) => ({ ...r, [a]: r[b], [b]: r[a] }))
          }
          title="Your Squad"
        />
      </div>
      {!mySubmitted && (
        <button
          disabled={busy || POSITIONS.some((pos) => !roster[pos])}
          onClick={() => {
            submittedRef.current = true;
            onSubmitRoster(roster);
          }}
          className="w-full animate-flash rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 font-display text-xl font-bold uppercase tracking-widest text-black transition hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] disabled:opacity-40"
        >
          🔒 Lock in lineup
        </button>
      )}
      {mySubmitted && !bothSubmitted && <Loading label="Waiting for your opponent to lock in…" />}
      <LeaveBtn onLeave={onLeave} />
      {error && <ErrorNote msg={error} onClear={clearError} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Shell({ children }) {
  return (
    <div className="mx-auto max-w-md">
      <Header />
      {children}
    </div>
  );
}
function Header() {
  return (
    <div className="mb-3">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        🎯 Draft
      </h1>
      <p className="text-xs text-slate-400">
        Snake-draft five from a shared pool of fifteen, then sim it out. Win and
        climb — online only.
      </p>
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
    <div className="rounded-2xl border border-line bg-panel p-6 text-center text-slate-400">
      <span className="animate-floaty inline-block text-3xl">🏀</span>
      <div className="mt-1 text-sm">{label}</div>
    </div>
  );
}
function ErrorNote({ msg, onClear }) {
  return (
    <div className="mt-3 rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-300">
      {msg}{" "}
      <button onClick={onClear} className="underline">dismiss</button>
    </div>
  );
}
function LeaveBtn({ onLeave }) {
  return (
    <button
      onClick={onLeave}
      className="mt-4 text-xs font-semibold text-slate-500 underline hover:text-slate-300"
    >
      Leave room
    </button>
  );
}
