import { SLOTS, SLOT_ELIGIBLE } from "./constants.js";
import { allPlayersUnique } from "./players.js";

/**
 * Football Pack & Play: one pack per roster slot (QB, RB, three WR, TE, FLEX).
 * A normal pack is five 80+ players eligible for that slot; upgrade ONE slot and
 * that pack is five players all 88+ with at least one 90+. Take one from each to
 * fill the seven-man offense. Mirrors shared/packs.js so the shared PackBuilder
 * and the tests can drive either sport.
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

// Players who can naturally fill `slot` at or above `minRating`.
function eligible(slot, minRating) {
  const positions = SLOT_ELIGIBLE[slot];
  return allPlayersUnique().filter((p) => positions.includes(p.position) && p.rating >= minRating);
}

// Draw up to `n` distinct players, skipping taken names and relaxing the floor
// if the slot is thin, so a pack is always full.
function draw(slot, n, floor, taken, rng) {
  const out = [];
  for (let f = floor; out.length < n && f >= 55; f -= 2) {
    const pool = eligible(slot, f).filter((p) => !taken.has(p.name) && !out.some((o) => o.name === p.name));
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
 * Open one pack of five players for `slot`.
 *   upgraded → 1 player 90+ and 4 more 88+ (all distinct, all 88+).
 *   normal   → 5 players 80+.
 * `taken` (a Set of names) is mutated so a player never lands in two of your packs.
 */
export function openPack({ slot, upgraded, taken = new Set(), rng = Math.random }) {
  if (upgraded) {
    const elite = draw(slot, 1, ELITE_FLOOR, taken, rng);
    const rest = draw(slot, PACK_SIZE - elite.length, PREMIUM_FLOOR, taken, rng);
    return [...elite, ...rest];
  }
  return draw(slot, PACK_SIZE, NORMAL_FLOOR, taken, rng);
}

/**
 * Deal all seven packs for one player. `upgraded` gets the premium pack; the
 * rest are normal. No player appears in two of your packs.
 */
export function dealPacks({ upgraded, rng = Math.random }) {
  const taken = new Set();
  const packs = {};
  for (const slot of SLOTS) {
    packs[slot] = openPack({ slot, upgraded: slot === upgraded, taken, rng });
  }
  return packs;
}
