import { SLOTS } from "./constants.js";
import { POOLS, POOL_KEYS } from "./players.js";
import { fitDistance } from "./sim.js";

// The football counterpart to shared/players.js's spin helpers. Same
// "decade|team" wheel and the same {key, decade, team, players} shape, so the
// Solo flow can drive either sport from one code path.

// Penalty (rating points) for slotting a player N steps from his natural spot.
// Mirrors the fit penalties inside evaluateTeam: 0 natural, 8 stretch, 26 OOP.
const OOP_PENALTY = [0, 8, 26];

/**
 * Spin the wheel: land on a random decade+team pool, skipping used pools and
 * pools that can't field at least `minAvailable` undrafted players.
 */
export function spinWheel({ usedPoolKeys = [], takenNames = [], rng = Math.random, minAvailable = 4 } = {}) {
  const used = new Set(usedPoolKeys);
  const taken = new Set(takenNames);
  const candidates = POOL_KEYS.filter((key) => {
    if (used.has(key)) return false;
    const avail = POOLS[key].filter((p) => !taken.has(p.name));
    return avail.length >= minAvailable;
  });
  if (candidates.length === 0) return null;
  const key = candidates[Math.floor(rng() * candidates.length)];
  const [decade, team] = key.split("|");
  return {
    key,
    decade,
    team,
    players: POOLS[key].filter((p) => !taken.has(p.name)),
  };
}

// Respins: axis "decade" rerolls the era while keeping the franchise; axis
// "team" rerolls the franchise while keeping the era.
function respinCandidates({ axis, decade, team, usedPoolKeys = [], takenNames = [], minAvailable = 4 }) {
  const used = new Set(usedPoolKeys);
  const taken = new Set(takenNames);
  return POOL_KEYS.filter((key) => {
    const [d, t] = key.split("|");
    if (axis === "decade") {
      if (t !== team || d === decade) return false;
    } else {
      if (d !== decade || t === team) return false;
    }
    if (used.has(key)) return false;
    const avail = POOLS[key].filter((p) => !taken.has(p.name));
    return avail.length >= minAvailable;
  });
}

export function canRespin(opts) {
  return respinCandidates(opts).length > 0;
}

export function respinSpin({ rng = Math.random, ...opts }) {
  const candidates = respinCandidates(opts);
  if (candidates.length === 0) return null;
  const key = candidates[Math.floor(rng() * candidates.length)];
  const [decade, team] = key.split("|");
  const taken = new Set(opts.takenNames || []);
  return {
    key,
    decade,
    team,
    players: POOLS[key].filter((p) => !taken.has(p.name)),
  };
}

/**
 * Choose the best available player + open slot for a partially-filled roster.
 * Maximizes rating minus the out-of-position penalty. With `naturalOnly`, only
 * pairings where the player naturally fills the slot are considered.
 */
export function bestPick(pool, roster, { naturalOnly = false } = {}) {
  const openSlots = SLOTS.filter((slot) => !roster[slot]);
  if (openSlots.length === 0) return null;
  let best = null;
  for (const player of pool) {
    for (const slot of openSlots) {
      const dist = fitDistance(player, slot);
      if (naturalOnly && dist !== 0) continue;
      const value = player.rating - OOP_PENALTY[dist];
      if (!best || value > best.value) best = { player, slot, value };
    }
  }
  return best ? { player: best.player, slot: best.slot } : null;
}
