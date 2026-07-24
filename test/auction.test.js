import test from "node:test";
import assert from "node:assert/strict";
import {
  initAuction,
  bid,
  pass,
  canRaise,
  maxBid,
  openSlots,
  complete,
  currentPlayer,
  queueSize,
  START_BUDGET,
} from "../shared/auction.js";

function makeQueue(n) {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i}`, rating: 70 + (i % 30) }));
}

test("auction resolves every lot and fills both rosters without overspending", () => {
  for (const rosterSize of [5, 7]) {
    for (let seed = 0; seed < 300; seed++) {
      let rng = mulberry(seed + 1);
      let s = initAuction({ rosterSize, queue: makeQueue(queueSize(rosterSize)) });
      let guard = 0;
      while (s.status === "bidding" && guard++ < 500) {
        const who = s.turn;
        // random strategy: raise if allowed ~55% of the time, else concede
        if (canRaise(s, who) && rng() < 0.55) s = bid(s, who);
        else s = pass(s, who);
      }
      assert.equal(s.status, "done", `did not finish (rosterSize ${rosterSize}, seed ${seed})`);
      assert.ok(complete(s), "both rosters should be full");
      for (const who of [0, 1]) {
        assert.equal(s.won[who].length, rosterSize, `player ${who} roster not full`);
        assert.ok(s.budgets[who] >= 0, `player ${who} overspent to ${s.budgets[who]}`);
        assert.ok(s.budgets[who] <= START_BUDGET, "budget can't grow");
        const spent = START_BUDGET - s.budgets[who];
        assert.ok(spent >= 0 && spent <= START_BUDGET);
      }
      // nobody won the same player twice / both won distinct players
      const all = [...s.won[0], ...s.won[1]].map((p) => p.name);
      assert.equal(new Set(all).size, all.length, "a player was awarded twice");
    }
  }
});

test("budget reservation always leaves enough to finish the roster", () => {
  const rosterSize = 5;
  let s = initAuction({ rosterSize, queue: makeQueue(queueSize(rosterSize)) });
  // whoever is on the clock always raises to the max — the reservation must
  // still let both sides fill five slots.
  let guard = 0;
  while (s.status === "bidding" && guard++ < 500) {
    const who = s.turn;
    // the max a player may bid always keeps $1 per other open slot
    const open = openSlots(s, who);
    if (open > 0) assert.ok(maxBid(s, who) <= s.budgets[who] - (open - 1));
    if (canRaise(s, who)) s = bid(s, who);
    else s = pass(s, who);
  }
  assert.ok(complete(s));
  for (const who of [0, 1]) assert.ok(s.budgets[who] >= 0);
});

test("a raise flips the turn and a concede awards the holder", () => {
  const s0 = initAuction({ rosterSize: 5, queue: makeQueue(queueSize(5)) });
  assert.ok(currentPlayer(s0));
  assert.equal(s0.turn, 1, "nominator (0) holds, guest (1) decides first");
  const s1 = bid(s0, 1); // guest raises
  assert.equal(s1.currentBid, 1);
  assert.equal(s1.highBidder, 1);
  assert.equal(s1.turn, 0, "turn flips back to host");
  const s2 = pass(s1, 0); // host concedes → guest wins P0 for $1
  assert.equal(s2.won[1][0].name, "P0");
  assert.equal(s2.budgets[1], START_BUDGET - 1);
  assert.equal(s2.index, 1, "moved to the next lot");
});

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
