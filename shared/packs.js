import { POSITIONS } from "./constants.js";
import { allPlayersUnique } from "./draft.js";

/**
 * Pack & Play: each player gets five packs, one per position. A normal pack is
 * five 80+ players who play that position (natural OR secondary). Before
 * opening, a player upgrades ONE position — that pack is five players who are
 * all 88+, at least one of them 90+. Pick one from each pack to fill a starting
 * five, then face off.
 *
 * Pure logic, shared by the offline and online modes and the tests.
 */

export const PACK_SIZE = 5;
export const NORMAL_FLOOR = 80;
export const PREMIUM_FLOOR = 88;
export const ELITE_FLOOR = 90;

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Players who play `pos` (natural or secondary) at or above `minRating`.
function eligible(pos, minRating) {
  return allPlayersUnique().filter((p) => p.positions.includes(pos) && p.rating >= minRating);
}

// Draw up to `n` distinct players from a pool, skipping already-taken names and
// relaxing the rating floor if the pool is thin, so a pack is always full.
function draw(pos, n, floor, taken, rng) {
  const out = [];
  for (let f = floor; out.length < n && f >= 60; f -= 2) {
    const pool = eligible(pos, f).filter((p) => !taken.has(p.name) && !out.some((o) => o.name === p.name));
    shuffle(pool, rng);
    for (const p of pool) {
      if (out.length >= n) break;
      out.push(p);
    }
  }
  out.forEach((p) => taken.add(p.name));
  return out;
}

/**
 * Open one pack of five players for `position`.
 *   upgraded → 1 player 90+ and 4 more 88+ (all distinct, all 88+).
 *   normal   → 5 players 80+.
 * `taken` (a Set of names) is mutated so a player never lands in two of your
 * packs.
 */
export function openPack({ position, upgraded, taken = new Set(), rng = Math.random }) {
  if (upgraded) {
    const elite = draw(position, 1, ELITE_FLOOR, taken, rng);
    const rest = draw(position, PACK_SIZE - elite.length, PREMIUM_FLOOR, taken, rng);
    return [...elite, ...rest];
  }
  return draw(position, PACK_SIZE, NORMAL_FLOOR, taken, rng);
}

/**
 * Deal all five packs for one player. `upgradedPosition` gets the premium pack;
 * the rest are normal. No player appears in two of your packs.
 */
export function dealPacks({ upgradedPosition, rng = Math.random }) {
  const taken = new Set();
  const packs = {};
  for (const pos of POSITIONS) {
    packs[pos] = openPack({ position: pos, upgraded: pos === upgradedPosition, taken, rng });
  }
  return packs;
}
