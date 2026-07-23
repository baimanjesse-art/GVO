import { DECADES, POSITIONS } from "./constants.js";
import d1960s from "./data/d1960s.js";
import d1970s from "./data/d1970s.js";
import d1980s from "./data/d1980s.js";
import d1990s from "./data/d1990s.js";
import d2000s from "./data/d2000s.js";
import d2010s from "./data/d2010s.js";
import d2020s from "./data/d2020s.js";

const RAW = {
  "1960s": d1960s,
  "1970s": d1970s,
  "1980s": d1980s,
  "1990s": d1990s,
  "2000s": d2000s,
  "2010s": d2010s,
  "2020s": d2020s,
};

/**
 * POOLS: "decade|team" -> [{ name, position, rating, s1, s2, s3, team, decade }]
 * s1/s2/s3 are position-specific season stats (see the data files).
 */
export const POOLS = {};
for (const [decade, teams] of Object.entries(RAW)) {
  for (const [team, entries] of Object.entries(teams)) {
    POOLS[`${decade}|${team}`] = entries.map(([name, position, rating, s1, s2, s3]) => ({
      name,
      position,
      rating,
      s1,
      s2,
      s3,
      team,
      decade,
    }));
  }
}

export const POOL_KEYS = Object.keys(POOLS);

// Every player as one best-rated entry (a star who suited up for several
// teams/eras appears once, at his highest-rated stint).
let _unique = null;
export function allPlayersUnique() {
  if (_unique) return _unique;
  const byName = new Map();
  for (const key of POOL_KEYS) {
    for (const p of POOLS[key]) {
      const prev = byName.get(p.name);
      if (!prev || p.rating > prev.rating) byName.set(p.name, p);
    }
  }
  _unique = [...byName.values()];
  return _unique;
}

export function playersAt(position) {
  return allPlayersUnique().filter((p) => p.position === position);
}

// Sanity: how many distinct players per position exist in the pool.
export function positionCounts() {
  const counts = Object.fromEntries(POSITIONS.map((p) => [p, 0]));
  for (const p of allPlayersUnique()) counts[p.position] = (counts[p.position] || 0) + 1;
  return counts;
}
