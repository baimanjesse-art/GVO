import test from "node:test";
import assert from "node:assert/strict";
import { SLOTS, POSITIONS, SLOT_ELIGIBLE, ROUNDS } from "../shared/football/constants.js";
import { POOLS, POOL_KEYS, allPlayersUnique, positionCounts } from "../shared/football/players.js";
import {
  evaluateTeam,
  simulateSeason,
  simulateSeries,
  statEdges,
  fitDistance,
  makeRng,
  SEASON_GAMES,
} from "../shared/football/sim.js";

test("roster is 7 slots incl a FLEX that takes RB/WR/TE", () => {
  assert.equal(SLOTS.length, 7);
  assert.equal(ROUNDS, 7);
  assert.deepEqual(SLOTS, ["QB", "RB", "WR1", "WR2", "WR3", "TE", "FLEX"]);
  assert.deepEqual(SLOT_ELIGIBLE.FLEX, ["RB", "WR", "TE"]);
  assert.deepEqual(SLOT_ELIGIBLE.QB, ["QB"]);
});

test("every pool has valid rows and known positions", () => {
  assert.ok(POOL_KEYS.length >= 15, `expected several team-eras, got ${POOL_KEYS.length}`);
  for (const [key, pool] of Object.entries(POOLS)) {
    assert.ok(pool.length >= 5, `${key} has only ${pool.length}`);
    for (const p of pool) {
      assert.ok(POSITIONS.includes(p.position), `${p.name} bad position ${p.position}`);
      assert.ok(p.rating >= 50 && p.rating <= 99, `${p.name} rating ${p.rating} out of range`);
      assert.equal(typeof p.name, "string");
    }
  }
});

test("the pool covers every position with enough depth to draft", () => {
  const counts = positionCounts();
  for (const pos of POSITIONS) {
    assert.ok(counts[pos] >= 5, `${pos}: only ${counts[pos]} players`);
  }
});

test("fitDistance: natural, stretch (skill mismatch), OOP (QB)", () => {
  const qb = { position: "QB" };
  const wr = { position: "WR" };
  const rb = { position: "RB" };
  const te = { position: "TE" };
  assert.equal(fitDistance(qb, "QB"), 0);
  assert.equal(fitDistance(wr, "WR1"), 0);
  assert.equal(fitDistance(wr, "FLEX"), 0);
  assert.equal(fitDistance(rb, "FLEX"), 0);
  assert.equal(fitDistance(te, "FLEX"), 0);
  assert.equal(fitDistance(rb, "WR2"), 1, "RB at WR = stretch");
  assert.equal(fitDistance(te, "WR2"), 1, "TE at WR = stretch");
  assert.equal(fitDistance(qb, "WR1"), 2, "QB anywhere but QB = OOP");
  assert.equal(fitDistance(wr, "QB"), 2, "non-QB at QB = OOP");
});

function starterRoster() {
  // A loaded, well-fit modern squad from the pool (all natural positions).
  const chiefs = POOLS["2020s|Kansas City Chiefs"];
  const find = (n) => chiefs.find((p) => p.name === n);
  return {
    QB: find("Patrick Mahomes"),
    RB: find("Isiah Pacheco"),
    WR1: find("Tyreek Hill"),
    WR2: find("Rashee Rice"),
    WR3: find("JuJu Smith-Schuster"),
    TE: find("Travis Kelce"),
    FLEX: POOLS["2020s|Cincinnati Bengals"].find((p) => p.name === "Ja'Marr Chase"),
  };
}

test("evaluateTeam grades a loaded roster highly and reacts to the QB", () => {
  const roster = starterRoster();
  const ev = evaluateTeam(roster);
  assert.ok(ev.overall >= 85, `loaded squad should be elite, got ${ev.overall}`);
  for (const key of ["talent", "passing", "receiving", "rushing", "fit", "chemistry"]) {
    assert.ok(key in ev.components, `missing component ${key}`);
  }
  // swap in a scrub QB → passing + overall should drop a lot
  const weak = { ...roster, QB: { name: "Backup", position: "QB", rating: 55, team: "X", decade: "2020s" } };
  const evWeak = evaluateTeam(weak);
  assert.ok(evWeak.overall < ev.overall - 4, "a bad QB should tank the overall");
  assert.ok(evWeak.components.passing < ev.components.passing, "passing should fall with the QB");
});

test("a QB stuck at WR is penalized on scheme fit", () => {
  const roster = starterRoster();
  const good = evaluateTeam(roster).components.fit;
  const broken = { ...roster, WR3: roster.QB, QB: { name: "Backup", position: "QB", rating: 70, team: "X", decade: "2020s" } };
  const bad = evaluateTeam(broken).components.fit;
  assert.ok(bad < good, "a QB out at WR should hurt fit");
});

test("season sim returns 0..17 wins and a grade; a perfect year is possible but rare", () => {
  const roster = starterRoster();
  let perfect = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const res = simulateSeason(roster, makeRng((Math.random() * 2 ** 31) >>> 0));
    assert.ok(res.wins >= 0 && res.wins <= SEASON_GAMES);
    assert.equal(res.wins + res.losses, SEASON_GAMES);
    if (res.wins === SEASON_GAMES) perfect++;
  }
  assert.ok(perfect > 0, "an elite team should go 17-0 at least sometimes");
  assert.ok(perfect / N < 0.5, "but not most of the time");
});

test("head-to-head produces one football-scored game and a winner", () => {
  const a = evaluateTeam(starterRoster());
  const b = evaluateTeam({
    ...starterRoster(),
    QB: { name: "Weak", position: "QB", rating: 60, team: "X", decade: "2020s" },
  });
  const series = simulateSeries(a, b, makeRng(5));
  assert.ok(["A", "B"].includes(series.winner));
  assert.equal(series.winsA + series.winsB, 1, "football is a single game");
  const g = series.games[0];
  assert.ok(g.a >= 3 && g.a <= 80 && g.b >= 3 && g.b <= 80, "realistic football score");
  const edges = statEdges(a, b);
  assert.equal(edges.length, 8);
  assert.ok(edges.every((e) => "label" in e && "a" in e && "b" in e));
});
