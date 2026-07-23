import { useEffect, useRef, useState } from "react";
import {
  DECADES as BBALL_DECADES,
  TEAM_META as BBALL_TEAM_META,
  teamMeta as bballTeamMeta,
} from "../../../shared/constants.js";

/**
 * Two-reel slot-machine spinner. Pass `result` ({decade, team}) and a changing
 * `spinId` to start a spin; onDone fires when both reels settle. The reels
 * shake while spinning, tick down like a real wheel, and lock with a
 * team-colored glow. `decades`, `teams` and `teamMeta` default to basketball
 * so existing screens keep working; Solo passes the active sport's values.
 */
export default function SpinReel({
  result,
  spinId,
  onDone,
  decades = BBALL_DECADES,
  teams = Object.keys(BBALL_TEAM_META),
  teamMeta = bballTeamMeta,
}) {
  const DECADES = decades;
  const ALL_TEAMS = teams;
  const [decadeText, setDecadeText] = useState("——");
  const [teamText, setTeamText] = useState("Spin to draft");
  const [locked, setLocked] = useState({ decade: false, team: false });
  const [spinning, setSpinning] = useState(false);
  const timers = useRef([]);

  // reset the reel face when there's no active spin (e.g. between rounds)
  useEffect(() => {
    if (!result && !spinning) {
      setDecadeText("——");
      setTeamText("Spin to draft");
      setLocked({ decade: false, team: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!result || !spinId) return;
    timers.current.forEach(clearInterval);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLocked({ decade: false, team: false });
    setSpinning(true);

    let decadeSettled = false;
    let elapsed = 0;
    // decelerating ticks: fast blur -> slow clunks, like a real prize wheel
    const tick = () => {
      if (!decadeSettled) {
        setDecadeText(DECADES[Math.floor(Math.random() * DECADES.length)]);
      }
      setTeamText(ALL_TEAMS[Math.floor(Math.random() * ALL_TEAMS.length)]);
      elapsed += 1;
      const delay = elapsed < 12 ? 65 : elapsed < 20 ? 100 : 150;
      timers.current.push(setTimeout(tick, delay));
    };
    tick();

    const t1 = setTimeout(() => {
      decadeSettled = true;
      setDecadeText(result.decade);
      setLocked((l) => ({ ...l, decade: true }));
    }, 1100);
    const t2 = setTimeout(() => {
      timers.current.forEach(clearTimeout);
      setDecadeText(result.decade);
      setTeamText(result.team || "Every Franchise");
      setLocked({ decade: true, team: true });
      setSpinning(false);
      onDone?.();
    }, 2100);
    timers.current.push(t1, t2);

    return () => {
      timers.current.forEach(clearInterval);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  // Era-only spins (team == null) lock the franchise reel on the whole era.
  const meta =
    locked.team && result
      ? result.team
        ? teamMeta(result.team)
        : { abbr: "ALL", color: "#f97316" }
      : null;

  return (
    <div className="flex items-stretch gap-2 sm:gap-3">
      <div
        className={`flex-none rounded-2xl border px-4 py-3 text-center transition-all sm:px-6 ${
          locked.decade
            ? "border-hoop bg-panel2 animate-flash"
            : spinning
              ? "border-line bg-panel animate-reel-shake"
              : "border-line bg-panel"
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
          Decade
        </div>
        <div
          className={`font-display text-2xl font-bold tabular-nums text-hoop2 sm:text-3xl ${
            spinning && !locked.decade ? "opacity-80 blur-[0.5px]" : ""
          } ${locked.decade ? "animate-pop" : ""}`}
        >
          {decadeText}
        </div>
      </div>
      <div
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-center transition-all sm:px-6 ${
          locked.team
            ? "bg-panel2 animate-flash"
            : spinning
              ? "border-line bg-panel animate-reel-shake"
              : "border-line bg-panel"
        }`}
        style={
          meta
            ? { borderColor: meta.color, boxShadow: `0 0 24px ${meta.color}55` }
            : undefined
        }
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
          Franchise
        </div>
        <div
          className={`truncate font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl ${
            spinning && !locked.team ? "opacity-80 blur-[0.5px]" : ""
          } ${locked.team ? "animate-pop" : ""}`}
        >
          {meta && (
            <span
              className="mr-2 inline-block rounded px-1.5 align-middle font-display text-base font-bold"
              style={{ background: meta.color }}
            >
              {meta.abbr}
            </span>
          )}
          {teamText}
        </div>
      </div>
    </div>
  );
}
