import test from "node:test";
import assert from "node:assert/strict";
import {
  SNAKE_ORDER,
  TOTAL_PICKS,
  DRAFT_POOL_SIZE,
  PICKS_PER_PLAYER,
  whoseTurn,
  draftComplete,
  draftPool,
  allPlayersUnique,
  rosterFromPicks,
} from "../shared/draft.js";
import { makeRng } from "../shared/sim.js";
import { POSITIONS } from "../shared/constants.js";

test("snake order is the balanced P1,P2,P2,P1,P1,P2,P2,P1,P1,P2", () => {
  assert.deepEqual(SNAKE_ORDER, [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
  assert.equal(SNAKE_ORDER.length, TOTAL_PICKS);
  // exactly five picks each
  const p0 = SNAKE_ORDER.filter((x) => x === 0).length;
  const p1 = SNAKE_ORDER.filter((x) => x === 1).length;
  assert.equal(p0, PICKS_PER_PLAYER);
  assert.equal(p1, PICKS_PER_PLAYER);
  // the specifics the design calls for
  assert.equal(SNAKE_ORDER[1], 1, "guest takes pick 2");
  assert.equal(SNAKE_ORDER[2], 1, "guest takes pick 3");
  assert.equal(SNAKE_ORDER[3], 0, "host takes pick 4");
});

test("whoseTurn tracks the clock and stops when the draft is full", () => {
  assert.equal(whoseTurn(0), 0);
  assert.equal(whoseTurn(1), 1);
  assert.equal(whoseTurn(9), 1);
  assert.equal(whoseTurn(TOTAL_PICKS), null);
  assert.equal(whoseTurn(-1), null);
  assert.ok(!draftComplete(9));
  assert.ok(draftComplete(10));
});

test("draftPool deals fifteen distinct, strong players", () => {
  const pool = draftPool({ rng: makeRng(123) });
  assert.equal(pool.length, DRAFT_POOL_SIZE);
  const names = new Set(pool.map((p) => p.name));
  assert.equal(names.size, DRAFT_POOL_SIZE, "no duplicate players in the pool");
  for (const p of pool) {
    assert.ok(p.rating >= 80, `${p.name} (${p.rating}) below the pool floor`);
    assert.ok(Array.isArray(p.positions) && p.positions.length >= 1);
  }
});

test("draftPool is deterministic for a given seed (both clients match)", () => {
  const a = draftPool({ rng: makeRng(999) }).map((p) => p.name);
  const b = draftPool({ rng: makeRng(999) }).map((p) => p.name);
  const c = draftPool({ rng: makeRng(1000) }).map((p) => p.name);
  assert.deepEqual(a, b, "same seed => same pool");
  assert.notDeepEqual(a, c, "different seed => (almost surely) different pool");
});

test("the unique player set is large enough to draft from", () => {
  const all = allPlayersUnique();
  assert.ok(all.length >= 100, `only ${all.length} unique players`);
  // deduped by name
  assert.equal(new Set(all.map((p) => p.name)).size, all.length);
});

test("rosterFromPicks places five drafted players across the five spots", () => {
  const picks = draftPool({ rng: makeRng(7) }).slice(0, 5);
  const roster = rosterFromPicks(picks);
  for (const pos of POSITIONS) assert.ok(roster[pos], `${pos} should be filled`);
  const placed = POSITIONS.map((pos) => roster[pos].name).sort();
  assert.deepEqual(placed, picks.map((p) => p.name).sort(), "all five, no dupes/drops");
});
