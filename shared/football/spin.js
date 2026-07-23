import { SLOTS, SLOT_ELIGIBLE, DECADES } from "./constants.js";
import { POOLS, POOL_KEYS } from "./players.js";
import { fitDistance } from "./sim.js";

// The football counterpart to shared/players.js's spin helpers. Same
// "decade|team" wheel and the same {key, decade, team, players} shape, so the
// Solo flow can drive either sport from one code path.

// Penalty (rating points) for slotting a player N steps from his natural spot.
// Mirrors the fit penalties inside evaluateTeam: 0 natural, 13 stretch, 44 OOP —
// so the best-fit helper steers hard away from out-of-position lineups.
const OOP_PENALTY = [0, 13, 44];

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
 * Era-lineup deal (All-Time Battle): the wheel lands on a decade and deals one
 * 88+ player for each of the seven slots (a QB at QB, backs/receivers/TE at
 * theirs, best skill leftover at FLEX) — deduped by name, natural fits only.
 * If an era runs thin at a slot the floor relaxes just enough to keep dealing.
 * Every decade can come up only once per draft.
 */
export function eraLineupSpin({ usedDecades = [], takenNames = [], rng = Math.random, minRating = 88 } = {}) {
  const used = new Set(usedDecades);
  const taken = new Set(takenNames);
  const candidates = DECADES.filter((d) => !used.has(d));
  if (candidates.length === 0) return null;
  const decade = candidates[Math.floor(rng() * candidates.length)];

  // Unique players in the era (highest-rated stint), minus anyone drafted.
  const byName = new Map();
  for (const key of POOL_KEYS) {
    if (!key.startsWith(`${decade}|`)) continue;
    for (const p of POOLS[key]) {
      if (taken.has(p.name)) continue;
      const prev = byName.get(p.name);
      if (!prev || p.rating > prev.rating) byName.set(p.name, p);
    }
  }
  const pool = [...byName.values()];

  const lineup = {};
  const chosen = new Set();
  for (const slot of SLOTS) {
    const eligible = SLOT_ELIGIBLE[slot];
    let pick = null;
    for (let floor = minRating; floor >= 55 && !pick; floor -= 2) {
      const options = pool.filter(
        (p) => !chosen.has(p.name) && eligible.includes(p.position) && p.rating >= floor
      );
      if (options.length > 0) pick = options[Math.floor(rng() * options.length)];
    }
    if (!pick) return null; // era too thin at this slot — spin again
    lineup[slot] = pick;
    chosen.add(pick.name);
  }
  return { key: decade, decade, team: null, lineup };
}

/**
 * Team-only spin inside a locked decade (Historic Battle): rerolls just the
 * franchise reel. `excludeKeys` drops specific pools (e.g. the opponent's).
 * When `openSlots` is given, only pools with an available player who naturally
 * fits one of those slots qualify, so a strict draft never dead-ends.
 */
export function decadeSpin({
  decade,
  usedPoolKeys = [],
  takenNames = [],
  excludeKeys = [],
  openSlots = null,
  rng = Math.random,
  minAvailable = 4,
} = {}) {
  const used = new Set([...usedPoolKeys, ...excludeKeys]);
  const taken = new Set(takenNames);
  const eligiblePositions = openSlots
    ? new Set(openSlots.flatMap((s) => SLOT_ELIGIBLE[s]))
    : null;
  const candidates = POOL_KEYS.filter((key) => {
    if (!key.startsWith(`${decade}|`)) return false;
    if (used.has(key)) return false;
    const avail = POOLS[key].filter((p) => !taken.has(p.name));
    if (avail.length < minAvailable) return false;
    if (eligiblePositions && !avail.some((p) => eligiblePositions.has(p.position))) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  const key = candidates[Math.floor(rng() * candidates.length)];
  const [d, team] = key.split("|");
  return { key, decade: d, team, players: POOLS[key].filter((p) => !taken.has(p.name)) };
}

/**
 * Field the strongest seven-man offense from a pool (a real team's roster in
 * Historic Battle): assign players to the seven slots to maximize rating minus
 * out-of-position penalties. Pools are small (~7), so exhaustive search is cheap.
 */
export function bestLineup(pool) {
  if (!pool || pool.length < SLOTS.length) return null;
  let best = null;
  const used = new Array(pool.length).fill(false);
  const assign = {};
  function place(slotIdx, value) {
    if (slotIdx === SLOTS.length) {
      if (!best || value > best.value) best = { value, roster: { ...assign } };
      return;
    }
    const slot = SLOTS[slotIdx];
    for (let i = 0; i < pool.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      assign[slot] = pool[i];
      place(slotIdx + 1, value + pool[i].rating - OOP_PENALTY[fitDistance(pool[i], slot)]);
      used[i] = false;
    }
    delete assign[slot];
  }
  place(0, 0);
  return best ? best.roster : null;
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
