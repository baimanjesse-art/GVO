// Auction mode: two players each get $20 to build their roster. Players come up
// one at a time; you bid the price up and whoever stops first lets the other
// have him at the standing price. When both rosters are full the squads sim.
//
// Model (guarantees both rosters always fill, budgets never go negative):
//  - Each lot has a default "holder" (the nominator) at the current price. The
//    other player may RAISE (price+1, becomes holder) or PASS (concede — the
//    holder wins at the current price). Every lot sells to someone.
//  - The nominator alternates each lot. A player whose roster is full drops out.
//  - Budget reservation: you can never bid so much you couldn't still afford $1
//    for each of your other open slots, so you can always complete your roster.
//
// Pure logic — the same on both clients, the server, and the tests. `who` is 0
// (host) or 1 (guest). State is a plain JSON object so it round-trips through
// the realtime room as-is.

export const START_BUDGET = 20;

// Queue length: exactly 2*rosterSize lots fill both rosters (no lot goes
// unsold), plus a little slack.
export function queueSize(rosterSize) {
  return rosterSize * 2 + 6;
}

export function initAuction({ rosterSize, queue }) {
  const s = {
    rosterSize,
    budgets: [START_BUDGET, START_BUDGET],
    won: [[], []],
    queue,
    index: 0,
    currentBid: 0,
    highBidder: 0, // the nominator holds at $0 to start
    firstActor: 0,
    turn: 1, // the other player decides whether to raise
    log: [],
    status: "bidding",
  };
  return settle(s);
}

function clone(s) {
  return JSON.parse(JSON.stringify(s));
}

export function openSlots(s, who) {
  return s.rosterSize - s.won[who].length;
}
export function complete(s) {
  return s.won[0].length >= s.rosterSize && s.won[1].length >= s.rosterSize;
}

// Most a player may bid on the current lot: keep $1 in reserve for each of his
// other still-open slots so he can always finish his roster.
export function maxBid(s, who) {
  const open = openSlots(s, who);
  if (open <= 0) return 0;
  return Math.max(0, s.budgets[who] - (open - 1));
}
export function canRaise(s, who) {
  return openSlots(s, who) > 0 && maxBid(s, who) >= s.currentBid + 1;
}

export function currentPlayer(s) {
  return s.queue[s.index] || null;
}

function advance(s) {
  s.index += 1;
  s.currentBid = 0;
  s.firstActor = 1 - s.firstActor;
  const ff = s.firstActor;
  // the nominator holds unless his roster is already full
  s.highBidder = openSlots(s, ff) > 0 ? ff : 1 - ff;
  s.turn = 1 - s.highBidder;
}

function award(s) {
  const who = s.highBidder;
  const player = s.queue[s.index];
  s.budgets[who] -= s.currentBid;
  s.won[who].push(player);
  s.log.push({ player, who, price: s.currentBid });
  advance(s);
}

// Auto-resolve any turn where the player on the clock can't act (full roster),
// then hand back to a human when a real decision is needed.
function settle(s) {
  let guard = 0;
  while (guard++ < 5000) {
    if (complete(s) || s.index >= s.queue.length) {
      s.status = complete(s) ? "done" : "done";
      return s;
    }
    // A full player can only concede — award the lot to the current holder.
    if (openSlots(s, s.turn) <= 0) {
      award(s);
      continue;
    }
    return s; // waiting on a human to raise or pass
  }
  return s;
}

/** The player on the clock raises the price by $1 and becomes the holder. */
export function bid(state, who) {
  if (state.status !== "bidding" || state.turn !== who || !canRaise(state, who)) return state;
  const s = clone(state);
  s.currentBid += 1;
  s.highBidder = who;
  s.turn = 1 - who;
  return settle(s);
}

/** The player on the clock concedes — the current holder wins at the standing price. */
export function pass(state, who) {
  const s = clone(state);
  if (s.status !== "bidding" || s.turn !== who) return state;
  award(s);
  return settle(s);
}

// Final rosters (arrays of the players each side won), for the sim.
export function wonPlayers(s, who) {
  return s.won[who];
}
