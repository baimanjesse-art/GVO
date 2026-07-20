import { POSITIONS, POSITION_INDEX, DECADE_INDEX } from "./constants.js";

// ---------------------------------------------------------------------------
// RNG helpers (seedable so shared results can be replayed deterministically)
// ---------------------------------------------------------------------------

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
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pct = (x) => Math.round(clamp01(x) * 100);

// ---------------------------------------------------------------------------
// Team evaluation
// ---------------------------------------------------------------------------

// Penalty for playing a player N spots away from his natural position.
const OOP_PENALTY = [0, 6, 14, 22, 30];

const STAR_WEIGHTS = [0.26, 0.23, 0.2, 0.17, 0.14];

export function fitDistance(player, slot) {
  const slotIdx = POSITION_INDEX[slot];
  return Math.min(
    ...player.positions.map((p) => Math.abs(POSITION_INDEX[p] - slotIdx))
  );
}

/**
 * roster: { PG: player, SG: player, SF: player, PF: player, C: player }
 * Each player: { name, positions, rating, pts, reb, ast, team, decade }
 * Returns component scores (0-100), an overall rating, grade inputs and
 * strengths/weaknesses text for the breakdown screen.
 */
export function evaluateTeam(roster) {
  const players = POSITIONS.map((pos) => roster[pos]).filter(Boolean);
  if (players.length !== 5) {
    throw new Error("evaluateTeam requires a full 5-man roster");
  }

  // Talent: star-weighted average of peak ratings.
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const talentRaw = sorted.reduce(
    (sum, p, i) => sum + p.rating * STAR_WEIGHTS[i],
    0
  );
  const talent = pct((talentRaw - 66) / (97 - 66));

  const star = pct((sorted[0].rating - 72) / (99 - 72));
  const depth = pct((sorted[4].rating - 62) / (88 - 62));

  // Positional fit: penalize out-of-position minutes.
  let oopTotal = 0;
  const oopDetails = [];
  for (const pos of POSITIONS) {
    const dist = fitDistance(roster[pos], pos);
    oopTotal += OOP_PENALTY[dist];
    if (dist >= 2) oopDetails.push({ name: roster[pos].name, slot: pos });
  }
  const fit = Math.max(0, 100 - oopTotal);

  // Statistical balance.
  const totPts = players.reduce((s, p) => s + p.pts, 0);
  const totReb = players.reduce((s, p) => s + p.reb, 0);
  const totAst = players.reduce((s, p) => s + p.ast, 0);
  const scoring = pct((totPts - 75) / (125 - 75));
  const rebounding = pct((totReb - 22) / (48 - 22));
  const playmaking = pct((totAst - 12) / (30 - 12));

  // Chemistry: shared franchise culture helps. Mixing eras is the whole point
  // of the game, so cross-decade rosters are never penalized for it.
  const decadeIdxs = players.map((p) => DECADE_INDEX[p.decade]);
  const distinctDecades = new Set(decadeIdxs).size;
  const eraSpan = Math.max(...decadeIdxs) - Math.min(...decadeIdxs);
  const franchises = players.map((p) => p.team);
  let franchisePairs = 0;
  for (let i = 0; i < franchises.length; i++) {
    for (let j = i + 1; j < franchises.length; j++) {
      if (franchises[i] === franchises[j]) franchisePairs++;
    }
  }
  const franchiseBonus = Math.min(10, franchisePairs * 5);
  const chemistry = Math.min(100, 90 + franchiseBonus);

  const overall =
    0.4 * talent +
    0.13 * fit +
    0.12 * chemistry +
    0.09 * star +
    0.05 * depth +
    0.08 * scoring +
    0.07 * playmaking +
    0.06 * rebounding;

  const components = {
    talent,
    star,
    depth,
    fit,
    chemistry,
    scoring,
    playmaking,
    rebounding,
  };

  const { strengths, weaknesses } = describeTeam(components, {
    oopDetails,
    distinctDecades,
    eraSpan,
    franchisePairs,
    totPts,
    totReb,
    totAst,
  });

  return {
    overall: Math.round(overall * 10) / 10,
    components,
    strengths,
    weaknesses,
    totals: { pts: totPts, reb: totReb, ast: totAst },
    meta: { distinctDecades, eraSpan, franchisePairs, oopDetails },
  };
}

const COMPONENT_TEXT = {
  talent: {
    label: "Talent",
    strong: "Loaded top to bottom — this roster's raw peak talent is elite.",
    weak: "Light on high-end talent; too many role players in the lineup.",
  },
  star: {
    label: "Star Power",
    strong: "A true franchise cornerstone who takes over games.",
    weak: "No alpha. Nobody here demands a double-team in crunch time.",
  },
  depth: {
    label: "Depth",
    strong: "No weak link — even the fifth option would start elsewhere.",
    weak: "The bottom of the roster is a liability every night.",
  },
  fit: {
    label: "Position Fit",
    strong: "Everyone plays their natural spot — clean rotations all season.",
    weak: "Players stuck out of position are bleeding efficiency.",
  },
  chemistry: {
    label: "Chemistry",
    strong: "Shared roots and meshing styles — this group plays like they've met before.",
    weak: "A locker room still finding its identity — no shared history to lean on.",
  },
  scoring: {
    label: "Scoring",
    strong: "Buckets everywhere — this offense can win shootouts.",
    weak: "Points are hard to come by; possessions die in the halfcourt.",
  },
  playmaking: {
    label: "Playmaking",
    strong: "The ball moves — creators set the table for everyone.",
    weak: "Not enough creation; expect a lot of contested isos.",
  },
  rebounding: {
    label: "Rebounding",
    strong: "Dominant on the glass at both ends.",
    weak: "Gets hammered on the boards; second chances pile up.",
  },
};

function describeTeam(components, meta) {
  const entries = Object.entries(components).map(([key, score]) => ({
    key,
    label: COMPONENT_TEXT[key].label,
    score,
  }));
  const desc = [...entries].sort((a, b) => b.score - a.score);

  const strengths = desc
    .filter((e) => e.score >= 72)
    .slice(0, 3)
    .map((e) => ({ ...e, text: COMPONENT_TEXT[e.key].strong }));
  if (strengths.length === 0) {
    const best = desc[0];
    strengths.push({ ...best, text: COMPONENT_TEXT[best.key].strong });
  }

  const weaknesses = desc
    .filter((e) => e.score <= 50)
    .reverse()
    .slice(0, 3)
    .map((e) => ({ ...e, text: COMPONENT_TEXT[e.key].weak }));
  if (weaknesses.length === 0) {
    const worst = desc[desc.length - 1];
    weaknesses.push({ ...worst, text: COMPONENT_TEXT[worst.key].weak });
  }

  // Flavor extras.
  if (meta.distinctDecades === 1) {
    strengths.unshift({
      key: "era",
      label: "Era Lock",
      score: 100,
      text: "All five stars from the same decade — instant on-court telepathy.",
    });
  } else if (meta.eraSpan >= 4) {
    strengths.unshift({
      key: "era",
      label: "Time Machine",
      score: 95,
      text: `Legends spanning ${meta.eraSpan + 1} decades of basketball — the super team fans only get to argue about.`,
    });
  }
  if (meta.franchisePairs > 0) {
    strengths.push({
      key: "franchise",
      label: "Franchise DNA",
      score: 80,
      text: "Teammates share franchise roots — built-in trust and identity.",
    });
  }

  return { strengths: strengths.slice(0, 3), weaknesses: weaknesses.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Season simulation
// ---------------------------------------------------------------------------

export function winProbability(overall) {
  return 1 / (1 + Math.exp(-(overall - 52) / 14));
}

export function gradeForWins(wins) {
  if (wins === 82) return "82-0";
  if (wins >= 75) return "S+";
  if (wins >= 70) return "S";
  if (wins >= 65) return "A+";
  if (wins >= 60) return "A";
  if (wins >= 55) return "A-";
  if (wins >= 50) return "B+";
  if (wins >= 45) return "B";
  if (wins >= 41) return "B-";
  if (wins >= 37) return "C+";
  if (wins >= 33) return "C";
  if (wins >= 29) return "C-";
  if (wins >= 24) return "D+";
  if (wins >= 18) return "D";
  return "F";
}

/**
 * Simulate an 82-game season for a completed roster.
 */
export function simulateSeason(roster, rng = Math.random) {
  const evaluation = evaluateTeam(roster);
  const { overall } = evaluation;

  let wins = 0;
  let streak = 0;
  let bestStreak = 0;
  let worstSkid = 0;
  let skid = 0;
  const games = []; // per-game W/L so the UI can play the season back
  for (let g = 0; g < 82; g++) {
    const oppQuality = gauss(rng); // league opponents vary night to night
    const p = 1 / (1 + Math.exp(-((overall - 52) / 14 - 0.55 * oppQuality)));
    const won = rng() < p;
    games.push(won);
    if (won) {
      wins++;
      streak++;
      skid = 0;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      skid++;
      streak = 0;
      worstSkid = Math.max(worstSkid, skid);
    }
  }

  const expectedWins = Math.round(winProbability(overall) * 82);

  return {
    ...evaluation,
    wins,
    losses: 82 - wins,
    games,
    expectedWins,
    bestStreak,
    worstSkid,
    grade: gradeForWins(wins),
  };
}

// ---------------------------------------------------------------------------
// Head-to-head series simulation
// ---------------------------------------------------------------------------

export function seriesWinProbability(overallA, overallB) {
  return 1 / (1 + Math.exp(-(overallA - overallB) / 9));
}

/**
 * Simulate a best-of-7 series between two evaluated teams.
 */
export function simulateSeries(evalA, evalB, rng = Math.random) {
  const pA = seriesWinProbability(evalA.overall, evalB.overall);
  const games = [];
  let winsA = 0;
  let winsB = 0;

  while (winsA < 4 && winsB < 4) {
    const aWins = rng() < pA;
    const loserOverall = aWins ? evalB.overall : evalA.overall;
    const loserScore = Math.round(92 + (loserOverall - 45) * 0.3 + gauss(rng) * 6);
    const margin = Math.max(1, Math.round(Math.abs(gauss(rng) * 7 + 6)));
    const winnerScore = loserScore + margin;
    const ot = margin <= 2 && rng() < 0.35;
    games.push({
      a: aWins ? winnerScore : loserScore,
      b: aWins ? loserScore : winnerScore,
      winner: aWins ? "A" : "B",
      ot,
    });
    if (aWins) winsA++;
    else winsB++;
  }

  return {
    games,
    winsA,
    winsB,
    winner: winsA === 4 ? "A" : "B",
    winProbA: Math.round(pA * 1000) / 10,
  };
}

/**
 * Component-by-component edge breakdown for the H2H results screen.
 */
export function statEdges(evalA, evalB) {
  return Object.keys(evalA.components).map((key) => ({
    key,
    label: COMPONENT_TEXT[key].label,
    a: evalA.components[key],
    b: evalB.components[key],
    edge:
      evalA.components[key] === evalB.components[key]
        ? "even"
        : evalA.components[key] > evalB.components[key]
          ? "A"
          : "B",
  }));
}

// ---------------------------------------------------------------------------
// Auto-pick (used for H2H pick-timer expiry and "best fit" hints)
// ---------------------------------------------------------------------------

/**
 * Build the strongest starting five from a pool: brute-force the assignment
 * of players to the five slots that maximizes rating minus out-of-position
 * penalties. Pools are small (≤ ~10), so exhaustive search is cheap.
 * Used to field the "actual team" opponents in the battle modes.
 */
export function bestLineup(pool) {
  if (pool.length < POSITIONS.length) return null;
  let best = null;
  const used = new Array(pool.length).fill(false);
  const assign = {};
  function place(slotIdx, value) {
    if (slotIdx === POSITIONS.length) {
      if (!best || value > best.value) best = { value, roster: { ...assign } };
      return;
    }
    const slot = POSITIONS[slotIdx];
    for (let i = 0; i < pool.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      assign[slot] = pool[i];
      place(
        slotIdx + 1,
        value + pool[i].rating - OOP_PENALTY[fitDistance(pool[i], slot)]
      );
      used[i] = false;
    }
    delete assign[slot];
  }
  place(0, 0);
  return best ? best.roster : null;
}

/**
 * Choose the best available player + open slot for a partially-filled roster.
 */
export function bestPick(pool, roster) {
  const openSlots = POSITIONS.filter((pos) => !roster[pos]);
  if (openSlots.length === 0) return null;
  let best = null;
  for (const player of pool) {
    for (const slot of openSlots) {
      const dist = fitDistance(player, slot);
      const value = player.rating - OOP_PENALTY[dist];
      if (!best || value > best.value) {
        best = { player, slot, value };
      }
    }
  }
  return best ? { player: best.player, slot: best.slot } : null;
}
