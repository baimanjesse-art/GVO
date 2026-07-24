// Keep or Cut: eight players are revealed one at a time; keep three, cut five,
// with no takebacks. Pure logic (dealing + scoring), shared by both sports and
// the tests — the sport only supplies its unique player pool.

export const DECK_SIZE = 8;
export const KEEP = 3;
export const CUT = 5;

/**
 * Deal DECK_SIZE distinct players with a spread of ratings so the keep/cut
 * calls actually matter. `pool` is the sport's unique player list.
 */
export function dealDeck({ pool, rng = Math.random, min = 72, max = 99 } = {}) {
  let cands = pool.filter((p) => p.rating >= min && p.rating <= max);
  if (cands.length < DECK_SIZE) cands = pool.slice();
  const arr = cands.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, DECK_SIZE);
}

/**
 * Score the three you kept against the deck: 100 = you kept the three best,
 * 0 = you kept the three worst. Also returns the optimal keep so the results
 * screen can show what you should have held onto.
 */
export function scoreKeep(kept, deck) {
  const sum = (xs) => xs.reduce((s, p) => s + p.rating, 0);
  const byRating = [...deck].sort((a, b) => b.rating - a.rating);
  const optimal = byRating.slice(0, KEEP);
  const worst = byRating.slice(-KEEP);
  const keptSum = sum(kept);
  const optimalSum = sum(optimal);
  const worstSum = sum(worst);
  const span = optimalSum - worstSum;
  const score = span <= 0 ? 100 : Math.round(((keptSum - worstSum) / span) * 100);
  return {
    keptSum,
    optimalSum,
    worstSum,
    score: Math.max(0, Math.min(100, score)),
    perfect: keptSum >= optimalSum,
    optimal,
  };
}

export function keepGrade(score) {
  if (score >= 100) return "PERFECT";
  if (score >= 90) return "A";
  if (score >= 78) return "B";
  if (score >= 62) return "C";
  if (score >= 42) return "D";
  return "F";
}
