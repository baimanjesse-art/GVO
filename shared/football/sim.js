import { SLOTS, SLOT_ELIGIBLE, DECADE_INDEX, teamMeta } from "./constants.js";

// Seedable RNG (mulberry32) — same as the basketball engine so replays are
// deterministic and shareable.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const SEASON_GAMES = 17;

/**
 * How far a player is from naturally filling a slot.
 *   0 = natural (position eligible, or a skill player at FLEX)
 *   1 = stretch (a skill player at the wrong skill slot, e.g. RB at WR)
 *   2 = out of position (a QB anywhere but QB, or a non-QB at QB)
 */
export function fitDistance(player, slot) {
  if (!player) return 0;
  const eligible = SLOT_ELIGIBLE[slot];
  if (eligible.includes(player.position)) return 0;
  if (slot === "QB" || player.position === "QB") return 2;
  return 1; // both are skill positions, just the wrong one
}

// Receiving/rushing production, from stats when present, otherwise inferred
// from the rating so the sim still works before the dataset is fully fleshed.
function recProd(p) {
  // p.s1 = receiving yards (season) for WR/TE/RB
  const fromStat = p.s1 ? clamp((p.s1 - 300) / 11, 0, 100) : null; // ~1400yd -> 100
  return fromStat != null ? 0.5 * fromStat + 0.5 * p.rating : p.rating;
}
function rushProd(p) {
  const fromStat = p.s1 ? clamp((p.s1 - 300) / 11, 0, 100) : null; // rush yards
  return fromStat != null ? 0.5 * fromStat + 0.5 * p.rating : p.rating;
}

/**
 * Grade a seven-man roster. Football is a passing game, so the QB and the
 * receiving corps dominate. Returns the same shape as the basketball engine
 * (overall + components + strengths/weaknesses + totals) so the shared
 * results UI works unchanged.
 */
export function evaluateTeam(roster) {
  const players = SLOTS.map((s) => roster[s]).filter(Boolean);
  if (players.length === 0) {
    return { overall: 0, components: {}, strengths: [], weaknesses: [], totals: {}, meta: {} };
  }
  const qb = roster.QB;
  const receivers = ["WR1", "WR2", "WR3", "TE"].map((s) => roster[s]).filter(Boolean);
  const flex = roster.FLEX;
  const rb = roster.RB;

  const ratings = players.map((p) => p.rating);
  const sorted = [...ratings].sort((a, b) => b - a);

  // talent — QB weighted heavily, then a star-weighted skill average
  const skillRatings = players.filter((p) => p.position !== "QB").map((p) => p.rating);
  const skillSorted = [...skillRatings].sort((a, b) => b - a);
  const skillWeights = [0.26, 0.22, 0.18, 0.14, 0.12, 0.08];
  let skillAvg = 0, wsum = 0;
  skillSorted.forEach((r, i) => {
    const w = skillWeights[i] ?? 0.05;
    skillAvg += r * w;
    wsum += w;
  });
  skillAvg = wsum ? skillAvg / wsum : 0;
  const talent = clamp(0.45 * (qb?.rating ?? 60) + 0.55 * skillAvg, 0, 100);

  const star = Math.max(...ratings);
  const depth = Math.min(...ratings);

  // passing — the aerial attack: QB + the best receivers
  const topRec = receivers.map((p) => p.rating).sort((a, b) => b - a).slice(0, 3);
  const passing = clamp(0.55 * (qb?.rating ?? 55) + 0.45 * avg(topRec.length ? topRec : [55]), 0, 100);

  // receiving — big-play production from the pass catchers
  const recCatchers = [...receivers, flex].filter((p) => p && p.position !== "RB");
  const receiving = clamp(avg(recCatchers.map(recProd)), 0, 100);

  // rushing — RB (+ FLEX if it's a back)
  const backs = [rb, flex && flex.position === "RB" ? flex : null].filter(Boolean);
  const rushing = clamp(backs.length ? avg(backs.map(rushProd)) : 45, 0, 100);

  // fit — penalties for players out of their natural slot
  let fitPenalty = 0;
  const oopDetails = [];
  for (const slot of SLOTS) {
    const p = roster[slot];
    if (!p) continue;
    const d = fitDistance(p, slot);
    if (d === 1) {
      // a skill player at the wrong skill spot (RB split wide, WR in the slot
      // he can't run) — a real but survivable stretch
      fitPenalty += 13;
      oopDetails.push({ slot, name: p.name, kind: "stretch" });
    } else if (d === 2) {
      // a QB lined up at receiver, or a non-QB taking snaps under center — a
      // scheme disaster, punished hard
      fitPenalty += 44;
      oopDetails.push({ slot, name: p.name, kind: "oop" });
    }
  }
  const fit = clamp(100 - fitPenalty, 0, 100);

  // chemistry — shared team/era DNA, and a QB↔receiver "connection" bonus
  let franchisePairs = 0;
  let qbConnections = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      if (a.team && a.team === b.team && a.decade === b.decade) {
        franchisePairs++;
        if (a.position === "QB" || b.position === "QB") qbConnections++;
      }
    }
  }
  const chemistry = clamp(90 + Math.min(8, franchisePairs * 2) + Math.min(6, qbConnections * 3), 0, 100);

  const decadeIdxs = players.map((p) => DECADE_INDEX[p.decade] ?? 0);
  const eraSpan = Math.max(...decadeIdxs) - Math.min(...decadeIdxs);
  const distinctDecades = new Set(players.map((p) => p.decade)).size;

  const overall =
    0.34 * talent +
    0.22 * passing +
    0.12 * fit +
    0.1 * chemistry +
    0.09 * receiving +
    0.08 * rushing +
    0.03 * star +
    0.02 * depth;

  const components = {
    talent: Math.round(talent),
    passing: Math.round(passing),
    receiving: Math.round(receiving),
    rushing: Math.round(rushing),
    fit: Math.round(fit),
    chemistry: Math.round(chemistry),
    star: Math.round(star),
    depth: Math.round(depth),
  };
  const { strengths, weaknesses } = describe(components, { oopDetails, eraSpan, distinctDecades, qb });

  return {
    overall: Math.round(overall * 10) / 10,
    components,
    strengths,
    weaknesses,
    totals: { passing: Math.round(passing), rushing: Math.round(rushing), receiving: Math.round(receiving) },
    meta: { eraSpan, distinctDecades, franchisePairs, oopDetails },
  };
}

const LABELS = {
  talent: "Talent",
  passing: "Passing",
  receiving: "Receiving",
  rushing: "Rushing",
  fit: "Scheme Fit",
  chemistry: "Chemistry",
  star: "Star Power",
  depth: "Depth",
};

function describe(c, { oopDetails, eraSpan, distinctDecades, qb }) {
  const strengths = [];
  const weaknesses = [];
  const entries = Object.entries(c).sort((a, b) => b[1] - a[1]);
  for (const [key, val] of entries.slice(0, 3)) {
    if (val >= 88) strengths.push({ key, text: `Elite ${LABELS[key].toLowerCase()} — ${Math.round(val)} rating.` });
  }
  for (const [key, val] of entries.slice(-3)) {
    if (val <= 68) weaknesses.push({ key, text: `Shaky ${LABELS[key].toLowerCase()} — only ${Math.round(val)}.` });
  }
  if (qb && qb.rating >= 95) strengths.unshift({ key: "qb", text: `${qb.name} under center — a franchise QB.` });
  if (oopDetails.some((o) => o.kind === "oop"))
    weaknesses.unshift({ key: "oop", text: "Someone's badly out of position." });
  if (eraSpan >= 4 && distinctDecades >= 4)
    strengths.unshift({ key: "eras", text: "A cross-era all-time roster." });
  return { strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4) };
}

export function winProbability(overall) {
  return 1 / (1 + Math.exp(-(overall - 52) / 14));
}

export function gradeForWins(wins) {
  if (wins === SEASON_GAMES) return `${SEASON_GAMES}-0`;
  const pct = wins / SEASON_GAMES;
  if (pct >= 0.94) return "S+";
  if (pct >= 0.82) return "S";
  if (pct >= 0.76) return "A+";
  if (pct >= 0.7) return "A";
  if (pct >= 0.64) return "A-";
  if (pct >= 0.58) return "B+";
  if (pct >= 0.52) return "B";
  if (pct >= 0.46) return "B-";
  if (pct >= 0.4) return "C+";
  if (pct >= 0.34) return "C";
  if (pct >= 0.28) return "C-";
  if (pct >= 0.2) return "D+";
  if (pct >= 0.12) return "D";
  return "F";
}

export function simulateSeason(roster, rng = Math.random) {
  const evaluation = evaluateTeam(roster);
  const { overall } = evaluation;
  let wins = 0, streak = 0, bestStreak = 0, worstSkid = 0, skid = 0;
  const games = [];
  for (let g = 0; g < SEASON_GAMES; g++) {
    const oppQuality = gauss(rng);
    const p = 1 / (1 + Math.exp(-((overall - 52) / 14 - 0.55 * oppQuality)));
    const won = rng() < p;
    games.push(won);
    if (won) { wins++; streak++; skid = 0; bestStreak = Math.max(bestStreak, streak); }
    else { skid++; streak = 0; worstSkid = Math.max(worstSkid, skid); }
  }
  return {
    ...evaluation,
    wins,
    losses: SEASON_GAMES - wins,
    games,
    expectedWins: Math.round(winProbability(overall) * SEASON_GAMES),
    bestStreak,
    worstSkid,
    grade: gradeForWins(wins),
  };
}

export function gameWinProbability(overallA, overallB) {
  return 1 / (1 + Math.exp(-(overallA - overallB) / 9));
}

/**
 * A single head-to-head game (football is one-and-done, not a best-of-7). Kept
 * in the same {winner, winsA, winsB, games[]} shape the shared results UI reads.
 */
export function simulateSeries(evalA, evalB, rng = Math.random) {
  const pA = gameWinProbability(evalA.overall, evalB.overall);
  const aWins = rng() < pA;
  const loserOverall = aWins ? evalB.overall : evalA.overall;
  const winnerOverall = aWins ? evalA.overall : evalB.overall;
  const loserScore = clamp(Math.round(10 + (loserOverall - 45) * 0.4 + gauss(rng) * 6), 3, 45);
  const margin = Math.max(1, Math.round(Math.abs(gauss(rng) * 6 + 4 + (winnerOverall - loserOverall) * 0.15)));
  const winnerScore = loserScore + margin;
  const ot = margin <= 3 && rng() < 0.3;
  const game = {
    a: aWins ? winnerScore : loserScore,
    b: aWins ? loserScore : winnerScore,
    winner: aWins ? "A" : "B",
    ot,
  };
  return {
    winner: aWins ? "A" : "B",
    winsA: aWins ? 1 : 0,
    winsB: aWins ? 0 : 1,
    games: [game],
    winProbA: Math.round(pA * 1000) / 10,
    winProbB: Math.round((1 - pA) * 1000) / 10,
  };
}

export function statEdges(evalA, evalB) {
  const keys = ["talent", "passing", "receiving", "rushing", "fit", "chemistry", "star", "depth"];
  return keys.map((key) => {
    const a = Math.round(evalA.components[key] ?? 0);
    const b = Math.round(evalB.components[key] ?? 0);
    return { key, label: LABELS[key], a, b, winner: a === b ? null : a > b ? "A" : "B" };
  });
}
