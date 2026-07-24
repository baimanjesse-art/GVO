import test from "node:test";
import assert from "node:assert/strict";
import { dealDeck, scoreKeep, keepGrade, DECK_SIZE, KEEP, CUT } from "../shared/keepcut.js";
import { allPlayersUnique } from "../shared/draft.js";
import { allPlayersUnique as fbPlayers } from "../shared/football/players.js";

test("keep-or-cut shape: keep 3, cut 5, from a deck of 8", () => {
  assert.equal(DECK_SIZE, 8);
  assert.equal(KEEP, 3);
  assert.equal(CUT, 5);
  assert.equal(KEEP + CUT, DECK_SIZE);
});

for (const [name, pool] of [["basketball", allPlayersUnique()], ["football", fbPlayers()]]) {
  test(`${name}: dealDeck returns 8 distinct players`, () => {
    const deck = dealDeck({ pool });
    assert.equal(deck.length, 8);
    assert.equal(new Set(deck.map((p) => p.name)).size, 8, "no duplicates");
  });
}

test("scoreKeep: keeping the three best is a perfect 100, the three worst is 0", () => {
  const deck = [95, 92, 90, 84, 80, 78, 74, 70].map((r, i) => ({ name: `P${i}`, rating: r }));
  const byRating = [...deck].sort((a, b) => b.rating - a.rating);

  const best = scoreKeep(byRating.slice(0, 3), deck);
  assert.equal(best.score, 100);
  assert.ok(best.perfect);
  assert.equal(keepGrade(best.score), "PERFECT");

  const worst = scoreKeep(byRating.slice(-3), deck);
  assert.equal(worst.score, 0);
  assert.ok(!worst.perfect);

  // a middling keep lands in between
  const mid = scoreKeep([byRating[0], byRating[3], byRating[6]], deck);
  assert.ok(mid.score > 0 && mid.score < 100);
});

test("keepGrade ladder is monotonic", () => {
  const grades = [100, 95, 80, 65, 45, 20].map(keepGrade);
  assert.deepEqual(grades, ["PERFECT", "A", "B", "C", "D", "F"]);
});
