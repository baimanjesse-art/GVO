import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { usePackRoom } from "../lib/packRoom.js";
import { evaluateTeam, simulateSeason, simulateSeries, statEdges, makeRng } from "../../../shared/sim.js";
import PackBuilder from "../components/PackBuilder.jsx";
import H2HCompare from "../components/H2HCompare.jsx";
import RankBadge from "../components/RankBadge.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import CourtBoard from "../components/CourtBoard.jsx";
import { copyText } from "../lib/share.js";

export default function PackVersus({ code: inviteCode, navigate }) {
  const { user, profile, loading, configured, refreshProfile } = useAuth();
  const pack = usePackRoom();
  const { room, error, busy } = pack;
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(inviteCode || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile?.username) setName(profile.username);
  }, [profile]);
  useEffect(() => {
    if (user && inviteCode && !room) pack.watch(inviteCode.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inviteCode]);

  if (!configured) return <Shell><AuthPanel /></Shell>;
  if (loading) return <Shell><Loading /></Shell>;
  if (!user)
    return (
      <Shell>
        <p className="mb-3 text-sm text-slate-400">Pack Versus is online — log in so your wins count toward your rank.</p>
        <AuthPanel note="Sign in to create or join a pack room." />
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
            onClick={() => pack.createRoom(name.trim())}
            className="w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? "…" : "Create a pack room"}
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
              onClick={() => pack.joinRoom(joinCode.toUpperCase(), name.trim())}
              className="flex-1 rounded-xl border border-line bg-panel2 font-bold text-slate-200 transition hover:border-hoop disabled:opacity-40"
            >
              Join room
            </button>
          </div>
        </div>
        {error && <ErrorNote msg={error} onClear={pack.clearError} />}
      </Shell>
    );
  }

  // ----- lobby: host waiting for a guest -----
  if (room.status === "lobby") {
    const link = `${location.origin}/#/packs/versus/${room.code}`;
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
          <p className="mt-4 text-sm text-slate-400">Waiting for a second player to join…</p>
        </div>
        <LeaveBtn onLeave={() => { pack.leave(); navigate("/packs/versus"); }} />
      </Shell>
    );
  }

  const yourRoster = youAreHost ? room.host_roster : room.guest_roster;
  const oppName = youAreHost ? room.guest_name : room.host_name;
  const bothIn = room.host_roster && room.guest_roster;

  // ----- done / both submitted → results -----
  if (room.status === "done" || bothIn) {
    return (
      <PackResult
        room={room}
        yourIndex={yourIndex}
        youAreHost={youAreHost}
        onFinish={(w, r) => pack.finishPack(room.code, w, r)}
        onProfileRefresh={refreshProfile}
        profile={profile}
        onLeave={() => { pack.leave(); navigate("/packs/versus"); }}
      />
    );
  }

  // ----- building -----
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">🎁 Pack Versus</h1>
        <div className="text-xs text-slate-400">vs {oppName || "…"}</div>
      </div>
      {yourRoster ? (
        <>
          <Loading label={`Locked in — waiting for ${oppName || "your opponent"} to open their packs…`} />
          <div className="mt-4">
            <CourtBoard roster={yourRoster} title="Your Pack Squad" />
          </div>
        </>
      ) : (
        <PackBuilder
          confirmLabel="🔒 Lock in my five"
          busy={busy}
          onComplete={(upgraded, roster) => pack.submitTeam(room.code, upgraded, roster)}
          intro={
            <p className="mb-4 text-xs text-slate-400">
              Open your packs blind and build your five. Pick{" "}
              <span className="text-hoop2">one position to upgrade</span> to a pack of 88+ (with a 90+ inside), then take
              one from each. Both lock in → you face off for Elo.
            </p>
          }
        />
      )}
      {error && <ErrorNote msg={error} onClear={pack.clearError} />}
      <LeaveBtn onLeave={() => { pack.leave(); navigate("/packs/versus"); }} />
    </div>
  );
}

function PackResult({ room, yourIndex, youAreHost, onFinish, onProfileRefresh, profile, onLeave }) {
  const finishedRef = useRef(false);

  const computed = useMemo(() => {
    const A = room.host_roster;
    const B = room.guest_roster;
    if (!A || !B) return null;
    const rng = makeRng(Number(room.seed) >>> 0);
    const evA = evaluateTeam(A);
    const evB = evaluateTeam(B);
    const series = simulateSeries(evA, evB, rng);
    const seasons = { host: simulateSeason(A, rng), guest: simulateSeason(B, rng) };
    return {
      winnerIndex: series.winner === "A" ? 0 : 1,
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
  }, [room]);

  // Host finalizes once (records result + Elo).
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

  if (!computed) return <Shell><Loading /></Shell>;

  const done = room.status === "done";
  const youWon = computed.winnerIndex === yourIndex;
  const eloGain = room.result?.eloGain ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">🎁 Pack Versus</h1>
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
        <Loading label="Simulating the matchup…" />
      )}
      <H2HCompare payload={computed.payload} youId={youAreHost ? "host" : "guest"} readOnly />
      <button onClick={onLeave} className="btn-ball w-full rounded-2xl py-4 font-display text-xl font-bold uppercase tracking-widest">
        🎁 New pack room
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Shell({ children }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">🎁 Pack Versus</h1>
      <p className="mb-3 text-xs text-slate-400">
        Online only — you and a friend each open your own packs, then face off for Elo.
      </p>
      {children}
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
