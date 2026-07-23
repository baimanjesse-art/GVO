import test from "node:test";
import assert from "node:assert/strict";
import { mergeRealtimeRow } from "../client/src/lib/realtimeMerge.js";

test("a null field in a new payload does not clobber a previously known value", () => {
  // e.g. draft_rooms.pool: TOASTed and unchanged by an UPDATE that only
  // touches `picks`, so realtime can broadcast pool: null even though the
  // real value is still 15 players in the database.
  const prev = { code: "ABCD", pool: [{ name: "LeBron James" }], picks: [] };
  const incoming = { code: "ABCD", pool: null, picks: [{ player: { name: "Jordan" }, by: 0 }] };
  const merged = mergeRealtimeRow(prev, incoming);
  assert.deepEqual(merged.pool, prev.pool, "pool should be preserved, not nulled out");
  assert.deepEqual(merged.picks, incoming.picks, "picks should update normally");
});

test("a field that was always null stays null", () => {
  const prev = { code: "ABCD", guest: null };
  const incoming = { code: "ABCD", guest: null };
  assert.equal(mergeRealtimeRow(prev, incoming).guest, null);
});

test("a real (non-null) incoming value always overwrites, even over another real value", () => {
  const prev = { status: "lobby" };
  const incoming = { status: "drafting" };
  assert.equal(mergeRealtimeRow(prev, incoming).status, "drafting");
});

test("a field newly set to a real value from null updates normally", () => {
  const prev = { guest: null };
  const incoming = { guest: "user-123" };
  assert.equal(mergeRealtimeRow(prev, incoming).guest, "user-123");
});

test("handles missing prev/incoming without throwing", () => {
  assert.deepEqual(mergeRealtimeRow(null, { a: 1 }), { a: 1 });
  assert.deepEqual(mergeRealtimeRow({ a: 1 }, null), { a: 1 }); // incoming falsy -> keep prev
  assert.deepEqual(mergeRealtimeRow({ a: 1 }, undefined), { a: 1 });
});
