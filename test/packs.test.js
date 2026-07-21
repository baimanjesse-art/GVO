import test from "node:test";
import assert from "node:assert/strict";
import {
  PACK_SIZE,
  NORMAL_FLOOR,
  PREMIUM_FLOOR,
  ELITE_FLOOR,
  openPack,
  dealPacks,
} from "../shared/packs.js";
import { POSITIONS } from "../shared/constants.js";
import { makeRng } from "../shared/sim.js";

test("a normal pack is five eligible 80+ players at that position", () => {
  for (const pos of POSITIONS) {
    const pack = openPack({ position: pos, upgraded: false, rng: makeRng(pos.charCodeAt(0)) });
    assert.equal(pack.length, PACK_SIZE, `${pos} normal pack should have 5`);
    assert.equal(new Set(pack.map((p) => p.name)).size, PACK_SIZE, "distinct players");
    for (const p of pack) {
      assert.ok(p.rating >= NORMAL_FLOOR, `${p.name} (${p.rating}) below 80`);
      assert.ok(p.positions.includes(pos), `${p.name} doesn't play ${pos}`);
    }
  }
});

test("a premium pack is five 88+ players with at least one 90+", () => {
  for (const pos of POSITIONS) {
    const pack = openPack({ position: pos, upgraded: true, rng: makeRng(pos.charCodeAt(0) + 7) });
    assert.equal(pack.length, PACK_SIZE, `${pos} premium pack should have 5`);
    assert.equal(new Set(pack.map((p) => p.name)).size, PACK_SIZE);
    for (const p of pack) {
      assert.ok(p.rating >= PREMIUM_FLOOR, `${p.name} (${p.rating}) below 88 in premium`);
      assert.ok(p.positions.includes(pos));
    }
    assert.ok(
      pack.some((p) => p.rating >= ELITE_FLOOR),
      `${pos} premium pack should include a 90+`
    );
  }
});

test("dealPacks gives one pack per position; the upgraded one is premium", () => {
  const upgraded = "SF";
  const packs = dealPacks({ upgradedPosition: upgraded, rng: makeRng(42) });
  assert.deepEqual(Object.keys(packs).sort(), [...POSITIONS].sort());
  for (const pos of POSITIONS) {
    assert.equal(packs[pos].length, PACK_SIZE);
  }
  // upgraded pack: all 88+, one 90+
  assert.ok(packs[upgraded].every((p) => p.rating >= PREMIUM_FLOOR));
  assert.ok(packs[upgraded].some((p) => p.rating >= ELITE_FLOOR));
});

test("no player appears in two of your packs", () => {
  const packs = dealPacks({ upgradedPosition: "PG", rng: makeRng(99) });
  const seen = new Set();
  for (const pos of POSITIONS) {
    for (const p of packs[pos]) {
      assert.ok(!seen.has(p.name), `${p.name} appears in more than one pack`);
      seen.add(p.name);
    }
  }
  assert.equal(seen.size, PACK_SIZE * POSITIONS.length);
});

test("deals are deterministic per seed (so an online room can persist them)", () => {
  const a = dealPacks({ upgradedPosition: "C", rng: makeRng(7) });
  const b = dealPacks({ upgradedPosition: "C", rng: makeRng(7) });
  const flat = (packs) => POSITIONS.flatMap((pos) => packs[pos].map((p) => p.name));
  assert.deepEqual(flat(a), flat(b));
});
