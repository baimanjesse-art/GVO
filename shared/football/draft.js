import { allPlayersUnique } from "./players.js";
import { bestLineup } from "./spin.js";
import { SLOTS } from "./constants.js";

/**
 * Football Draft: two players snake-draft seven apiece from a shared pool of
 * eighteen, then their offenses play a game. Pure logic (no networking), shared
 * by the client and the tests. Player 0 = host (picks first), 1 = guest; the
 * order snakes so the second picker isn't punished:
 *
 *   pick #:  1 2 3 4 5 6 7 8 9 ...
 *   player:  0 1 1 0 0 1 1 0 0 ...
 */
export const DRAFT_POOL_SIZE = 18;
export const PICKS_PER_PLAYER = SLOTS.length; // 7
export const TOTAL_PICKS = PICKS_PER_PLAYER * 2; // 14

export const SNAKE_ORDER = buildSnakeOrder();
function buildSnakeOrder() {
  const order = [];
  for (let round = 0; round < PICKS_PER_PLAYER; round++) {
    order.push(round % 2 === 0 ? 0 : 1, round % 2 === 0 ? 1 : 0);
  }
  return order;
}

export function whoseTurn(pickCount) {
  if (pickCount < 0 || pickCount >= TOTAL_PICKS) return null;
  return SNAKE_ORDER[pickCount];
}
export function draftComplete(pickCount) {
  return pickCount >= TOTAL_PICKS;
}

// Positional quotas so both players can always build a real offense — enough
// QBs and TEs to go around, the rest skill players. Sums to DRAFT_POOL_SIZE.
const QUOTA = { QB: 3, RB: 5, WR: 7, TE: 3 };

/**
 * Build the eighteen-man draft pool: strong players (rating floor), with a
 * guaranteed spread across positions, shuffled by the given rng. Seed the rng
 * and both clients get the identical pool.
 */
export function draftPool({ rng = Math.random, minRating = 80 } = {}) {
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const out = [];
  const unique = allPlayersUnique();
  for (const [pos, n] of Object.entries(QUOTA)) {
    let cands = unique.filter((p) => p.position === pos && p.rating >= minRating);
    if (cands.length < n) cands = unique.filter((p) => p.position === pos);
    shuffle(cands);
    out.push(...cands.slice(0, n));
  }
  return shuffle(out);
}

/**
 * Turn a player's seven picks into a field roster, placing them at their
 * best-fit slots (the player can still rearrange before the sim). Fewer than
 * seven returns a partial roster.
 */
export function rosterFromPicks(picks) {
  const empty = Object.fromEntries(SLOTS.map((s) => [s, null]));
  if (!picks || picks.length === 0) return empty;
  if (picks.length >= SLOTS.length) return bestLineup(picks) || fallbackRoster(picks);
  return fallbackRoster(picks);
}

function fallbackRoster(picks) {
  const roster = Object.fromEntries(SLOTS.map((s) => [s, null]));
  picks.slice(0, SLOTS.length).forEach((p, i) => {
    roster[SLOTS[i]] = p;
  });
  return roster;
}
