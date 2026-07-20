import { POOLS } from "../../../shared/players.js";
import { simulateSeason, makeRng } from "../../../shared/sim.js";

// Solo results are shared as a self-contained code in the URL: the five picks
// plus the sim seed. The viewer's browser rebuilds the roster and replays the
// exact same season deterministically — no backend needed.

function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * picks: [{ key: poolKey, player: {name}, slot }], seed: int
 * Returns a compact code prefixed with "s." for the #/r/ route.
 */
export function encodeSolo(picks, seed) {
  const payload = {
    v: 1,
    s: seed,
    p: picks.map((pk) => [pk.key, pk.player.name, pk.slot]),
  };
  return "s." + b64urlEncode(JSON.stringify(payload));
}

/**
 * Returns { roster, result } or null if the code is invalid.
 */
export function decodeSolo(code) {
  try {
    if (!code.startsWith("s.")) return null;
    const payload = JSON.parse(b64urlDecode(code.slice(2)));
    if (payload.v !== 1 || !Array.isArray(payload.p)) return null;
    const roster = { PG: null, SG: null, SF: null, PF: null, C: null };
    for (const [poolKey, name, slot] of payload.p) {
      const player = (POOLS[poolKey] || []).find((p) => p.name === name);
      if (!player || !(slot in roster)) return null;
      roster[slot] = player;
    }
    if (Object.values(roster).some((p) => !p)) return null;
    const result = simulateSeason(roster, makeRng(payload.s >>> 0));
    return { roster, result };
  } catch {
    return null;
  }
}
