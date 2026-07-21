import { POOLS, POOL_KEYS } from "./players.js";
import { bestLineup } from "./sim.js";

/**
 * Draft mode: two players snake-draft five apiece from a shared pool of
 * fifteen, then their squads sim a game. Pure logic only — no networking —
 * so it's the same on the client and inside tests.
 *
 * Player index 0 = the host (created the room, picks first), 1 = the guest.
 * The order snakes so the second picker isn't punished for going second:
 *
 *   pick #:  1  2  3  4  5  6  7  8  9 10
 *   player:  0  1  1  0  0  1  1  0  0  1
 *
 * i.e. P2 takes picks 2 & 3, P1 takes pick 4, and it keeps reversing each
 * round. Both end with five; five of the fifteen go undrafted.
 */
export const DRAFT_POOL_SIZE = 15;
export const PICKS_PER_PLAYER = 5;
export const TOTAL_PICKS = PICKS_PER_PLAYER * 2; // 10

// Snake order over the ten picks (0 = host, 1 = guest).
export const SNAKE_ORDER = buildSnakeOrder();

function buildSnakeOrder() {
  const order = [];
  for (let round = 0; round < PICKS_PER_PLAYER; round++) {
    // even rounds go 0,1 — odd rounds reverse to 1,0
    order.push(round % 2 === 0 ? 0 : 1, round % 2 === 0 ? 1 : 0);
  }
  return order; // [0,1, 1,0, 0,1, 1,0, 0,1]
}

/** Which player (0 or 1) is on the clock after `pickCount` picks — null if done. */
export function whoseTurn(pickCount) {
  if (pickCount < 0 || pickCount >= TOTAL_PICKS) return null;
  return SNAKE_ORDER[pickCount];
}

/** True once all ten picks are in. */
export function draftComplete(pickCount) {
  return pickCount >= TOTAL_PICKS;
}

// Every player as a single best-rated entry (a star who suited up in several
// eras appears once, at his highest-rated stint), cached after first build.
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

/**
 * Build the fifteen-man draft pool: distinct players, strong enough to make a
 * real game of it (rating floor), shuffled by the given rng. Seed the rng and
 * both clients get the identical pool.
 */
export function draftPool({ rng = Math.random, size = DRAFT_POOL_SIZE, minRating = 80 } = {}) {
  let base = allPlayersUnique().filter((p) => p.rating >= minRating);
  if (base.length < size) base = allPlayersUnique();
  const arr = base.slice();
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, size);
}

/**
 * Turn a player's five drafted picks into a court roster {PG,SG,SF,PF,C},
 * placing them at their best-fit positions (the player can still rearrange
 * on the court before the sim). Fewer than five returns a partial roster.
 */
export function rosterFromPicks(picks) {
  const empty = { PG: null, SG: null, SF: null, PF: null, C: null };
  if (!picks || picks.length === 0) return empty;
  if (picks.length >= 5) return bestLineup(picks) || fallbackRoster(picks);
  return fallbackRoster(picks);
}

function fallbackRoster(picks) {
  const POS = ["PG", "SG", "SF", "PF", "C"];
  const roster = { PG: null, SG: null, SF: null, PF: null, C: null };
  picks.slice(0, 5).forEach((p, i) => {
    roster[POS[i]] = p;
  });
  return roster;
}
