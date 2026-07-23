// Offline battle career: a persistent Elo rating for the single-player
// Historic and All-Time battles, stored in localStorage on the device. Same
// theory as the online H2H ladder — win and climb, lose and drop — but the
// opponent's Elo comes from how loaded their squad is, so slaying a legend is
// worth far more than beating a weak historic team. This is what makes the
// offline rank skill-based rather than a participation counter.

import { BASE_ELO, eloUpdate, overallToElo, rankFor } from "../../../shared/ranks.js";

// Basketball keeps the original key; each other sport gets its own ladder so
// football and basketball offline ranks never mix.
function keyFor(sport) {
  return !sport || sport === "basketball" ? "arena-career-v1" : `arena-career-${sport}-v1`;
}

function blank() {
  return { elo: BASE_ELO, wins: 0, losses: 0, best: BASE_ELO, games: 0 };
}

export function getCareer(sport) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(sport)));
    if (saved && typeof saved.elo === "number") return { ...blank(), ...saved };
  } catch {
    /* ignore */
  }
  return blank();
}

function save(career, sport) {
  try {
    localStorage.setItem(keyFor(sport), JSON.stringify(career));
  } catch {
    /* ignore */
  }
}

/**
 * Record a finished battle and persist the new rating.
 *   won         — did you take the series?
 *   oppOverall  — the opponent squad's sim overall (sets the stakes)
 *   mode        — "historic" | "alltime" (for the log line / label)
 * Returns a summary the results screen can render:
 *   { before, after, delta, rankBefore, rankAfter, promoted, demoted, ...career }
 */
export function recordBattle({ won, oppOverall, mode, sport }) {
  const career = getCareer(sport);
  const before = Math.round(career.elo);
  const rankBefore = rankFor(career.elo);
  const oppElo = overallToElo(oppOverall);

  const { elo, delta } = eloUpdate(career.elo, oppElo, won);
  career.elo = Math.max(0, elo);
  career.games += 1;
  if (won) career.wins += 1;
  else career.losses += 1;
  career.best = Math.max(career.best, career.elo);
  save(career, sport);

  const after = Math.round(career.elo);
  const rankAfter = rankFor(career.elo);
  return {
    mode,
    won,
    oppElo,
    before,
    after,
    delta: after - before,
    rankBefore,
    rankAfter,
    promoted: rankAfter.index > rankBefore.index,
    demoted: rankAfter.index < rankBefore.index,
    elo: career.elo,
    wins: career.wins,
    losses: career.losses,
    best: Math.round(career.best),
  };
}

export function resetCareer() {
  save(blank());
  return blank();
}
