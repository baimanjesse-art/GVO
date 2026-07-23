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
import { spinWheel, respinSpin, canRespin, bestPick, eraLineupSpin, decadeSpin, bestLineup } from "../shared/football/spin.js";
import { LEGENDS, randomLegend } from "../shared/football/legends.js";
import { dealPacks, PACK_SIZE, PREMIUM_FLOOR, ELITE_FLOOR } from "../shared/football/packs.js";

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

test("the wheel lands on a team-era with enough undrafted players", () => {
  const s = spinWheel({ rng: makeRng(3) });
  assert.ok(s, "a fresh wheel should always land somewhere");
  assert.equal(s.key, `${s.decade}|${s.team}`);
  assert.ok(s.players.length >= 4, "a landed pool has draftable depth");

  // Exhausting a decade's pools still eventually returns null, never a used key.
  const used = POOL_KEYS.slice();
  assert.equal(spinWheel({ usedPoolKeys: used }), null);
});

test("respins reroll one reel and best-fit fills an open slot sensibly", () => {
  // pick a decade/team known to have era-mates so respins have somewhere to go
  const s = spinWheel({ rng: makeRng(1) });
  const eraCanRespin = canRespin({ axis: "decade", decade: s.decade, team: s.team, usedPoolKeys: [], takenNames: [] });
  if (eraCanRespin) {
    const r = respinSpin({ axis: "decade", decade: s.decade, team: s.team, usedPoolKeys: [], takenNames: [], rng: makeRng(9) });
    assert.equal(r.team, s.team, "era respin keeps the franchise");
    assert.notEqual(r.decade, s.decade, "era respin changes the decade");
  }

  const chiefs = POOLS["2020s|Kansas City Chiefs"];
  const roster = { QB: null, RB: null, WR1: null, WR2: null, WR3: null, TE: null, FLEX: null };
  const pick = bestPick(chiefs, roster);
  assert.ok(pick && pick.player && pick.slot, "best-fit returns a player + slot");
  assert.equal(fitDistance(pick.player, pick.slot), 0, "best fit is a natural fit when one is available");
});

test("era-lineup deal fills all seven slots with eligible players", () => {
  for (let i = 0; i < 50; i++) {
    const s = eraLineupSpin({ usedDecades: [], takenNames: [], rng: makeRng(i + 1) });
    assert.ok(s, "a fresh era deal should always succeed");
    assert.equal(s.team, null);
    for (const slot of SLOTS) {
      const p = s.lineup[slot];
      assert.ok(p, `${slot} was not dealt`);
      assert.ok(SLOT_ELIGIBLE[slot].includes(p.position), `${p.name} can't fill ${slot}`);
    }
    // seven distinct players
    const names = new Set(SLOTS.map((sl) => s.lineup[sl].name));
    assert.equal(names.size, 7, "dealt players must be distinct");
  }
  // exhausting every decade returns null
  assert.equal(eraLineupSpin({ usedDecades: ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"] }), null);
});

test("every team-era is seven deep and bestLineup fields a full seven", () => {
  for (const [key, pool] of Object.entries(POOLS)) {
    assert.ok(pool.length >= 7, `${key} has only ${pool.length} — Historic needs 7`);
    const lineup = bestLineup(pool);
    assert.ok(lineup, `${key} could not field a lineup`);
    const names = new Set();
    for (const slot of SLOTS) {
      assert.ok(lineup[slot], `${key} left ${slot} empty`);
      names.add(lineup[slot].name);
    }
    assert.equal(names.size, 7, `${key} reused a player`);
    // the lone QB should land at QB, never out of position
    assert.equal(lineup.QB.position, "QB", `${key} put a non-QB under center`);
  }
});

test("every legendary squad is a valid, gradable full seven", () => {
  assert.ok(LEGENDS.length >= 6, `expected several legends, got ${LEGENDS.length}`);
  for (const L of LEGENDS) {
    assert.ok(L.name && L.record && L.color, `${L.id} missing display fields`);
    for (const slot of SLOTS) {
      const p = L.roster[slot];
      assert.ok(p, `${L.name} missing ${slot}`);
      assert.ok(SLOT_ELIGIBLE[slot].includes(p.position), `${L.name}: ${p.name} can't fill ${slot}`);
    }
    const ev = evaluateTeam(L.roster);
    assert.ok(ev.overall >= 75 && ev.overall <= 100, `${L.name} overall ${ev.overall} out of range`);
  }
  assert.ok(randomLegend(makeRng(1)), "randomLegend returns a squad");
});

test("decadeSpin stays inside its decade and can require open-slot fits", () => {
  const s = decadeSpin({ decade: "1990s", rng: makeRng(4) });
  assert.ok(s, "a decade with teams should spin");
  assert.ok(s.key.startsWith("1990s|"), "landed pool is in the locked decade");
  // require a pool that can fill a QB naturally
  const qbSpin = decadeSpin({ decade: "1990s", openSlots: ["QB"], rng: makeRng(7) });
  assert.ok(qbSpin.players.some((p) => p.position === "QB"), "openSlots QB filter yields a QB");
});

test("pack & play deals one pack per slot, premium is 88+/90+, no dupes", () => {
  const packs = dealPacks({ upgraded: "WR1" });
  assert.deepEqual(Object.keys(packs).sort(), [...SLOTS].sort());

  const seen = new Set();
  for (const slot of SLOTS) {
    const pack = packs[slot];
    assert.equal(pack.length, PACK_SIZE, `${slot} pack should have ${PACK_SIZE}`);
    for (const p of pack) {
      assert.ok(SLOT_ELIGIBLE[slot].includes(p.position), `${p.name} can't fill ${slot}`);
      assert.ok(!seen.has(p.name), `${p.name} appeared in two packs`);
      seen.add(p.name);
    }
  }
  // the upgraded pack: all 88+ (subject to floor relaxation only if truly thin)
  // and, for WR where the pool is deep, at least one 90+.
  const premium = packs.WR1;
  assert.ok(premium.every((p) => p.rating >= PREMIUM_FLOOR), "premium WR pack should be all 88+");
  assert.ok(premium.some((p) => p.rating >= ELITE_FLOOR), "premium WR pack should include a 90+");
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
