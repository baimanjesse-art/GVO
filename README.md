# 🏀 82-0 Arena

An enhanced take on the viral roster-drafting game **82-0**: spin a randomizer
that hands you a **decade + NBA franchise**, draft one real player from that
team's era, repeat until you've filled all five positions — then simulate a
full 82-game season and see how close to perfection your squad gets.

Built with **React + Tailwind (Vite)** on the front end and a **Node +
WebSocket** server for real-time head-to-head play.

## Game modes

### Solo Run
- 5 spins → 5 picks (PG / SG / SF / PF / C), each from a different
  decade/franchise pool.
- Any player can be slotted anywhere, but out-of-position picks cost you —
  the board shows *natural / stretch / out of position* fit as you place.
- The sim engine grades your season with a record, letter grade, component
  breakdown (talent, star power, fit, chemistry, scoring, playmaking,
  rebounding, depth) and strengths/weaknesses commentary.
- One **era respin** and one **team respin** per draft, and locked-in players
  can be **rearranged between positions** any time before you sim.

### Historic Battle
- Spin once to draw your opponent — a real decade/franchise squad, fielded as
  their strongest actual starting five.
- Their **era locks**: five team-only spins inside that decade to build the
  squad that can take them down, then a best-of-7 series decides it.

### All-Time Battle
- No era lock, but the opponent is a legend: every real **68+ win team**
  ('96 and '97 Bulls, '16 Warriors, '72 Lakers, '67 Sixers), the **1992
  Dream Team**, the **2008 Redeem Team**, or the all-time first team.
- Draft across all of history and try to survive seven games.

### Head-to-Head (real-time)
- Create a room, share the 4-letter code (or invite link `#/h2h/CODE`).
- Both players draft **from identical spins** — same decade, same team, same
  pool, at the same time. Picks are blind and revealed simultaneously each
  round, so duplicates are allowed (mirror draft).
- **40-second pick clock** per round; run out of time and the server
  auto-drafts best-fit for you (also covers disconnects — you can refresh and
  rejoin mid-match).
- Side-by-side draft boards fill in live, with a timestamped draft log and
  chat/emote panel during the draft.
- After round 5 both seasons are simulated **and** the teams collide in a
  best-of-7 series with per-game scores, a win-probability bar and a
  stat-by-stat edge breakdown.
- Ranked ladder: every H2H result updates a persistent Elo leaderboard.

### Sharing
- Any result (solo or H2H) can be published to a share link that renders a
  read-only results page.
- Solo results can also be exported as a 1080×1080 PNG card for social.

## Quick start

```bash
npm install
npm run dev        # vite (:5173) + ws/api server (:8787), proxied together
```

Open http://localhost:5173. For head-to-head locally, open two browser
windows.

Production:

```bash
npm run build      # builds client into dist/
npm start          # serves dist/ + API + WebSocket on :8787
```

Tests and smoke scripts:

```bash
npm test                        # sim engine + dataset integrity tests
node scripts/h2h-smoke.js       # scripted full H2H match over websockets
node scripts/timeout-smoke.js   # verifies pick-timer auto-draft (~45s)
```

(The smoke scripts expect a server on `PORT`, default 8788:
`PORT=8788 node server/index.js &`.)

## Project layout

```
shared/            # code shared by client + server
  constants.js     # positions, decades, timer, team colors
  data/d19XXs.js   # player dataset: decade -> team -> [name, pos, rating, stats]
  players.js       # pool assembly + spinWheel() + respins + decade spins
  legends.js       # All-Time Battle opponents (68+ win teams, Dream Team…)
  sim.js           # team evaluation, 82-game season sim, best-of-7 series sim
client/            # React + Tailwind app (Vite root)
  src/screens/     # Home, SoloGame, H2HGame, BattleGame, Leaderboard, SharedResult
  src/components/  # SpinReel, PlayerCard, RosterBoard, results views, chat…
server/            # Express + ws
  index.js         # HTTP API + websocket endpoint (+ static dist in prod)
  rooms.js         # room lifecycle, synced spins, pick timer, reveal, results
  store.js         # persistent leaderboard (Elo) + shared-result store
test/              # node:test suite
scripts/           # websocket smoke tests
```

## The dataset

`shared/data/` holds ~110 decade/team pools (1960s–2020s) with real players
per stint: primary/secondary **position**, approximate **peak-season
per-game stats** (pts/reb/ast) for that team+decade, and a subjective
**peak rating** (60–99) the sim uses as its talent input. Players who
starred for multiple teams/eras appear in multiple pools with era-appropriate
numbers (e.g. '86 Jordan vs '96 Jordan).

## How the sim works

Each roster gets component scores (0–100):

- **Talent** — star-weighted average of the five peak ratings.
- **Star power / depth** — best and worst player on the roster.
- **Position fit** — penalties for each slot's distance from a player's
  natural position(s).
- **Scoring / playmaking / rebounding** — summed per-game production vs
  league-shaped thresholds.
- **Chemistry** — a small bonus when teammates share franchise DNA. Mixing
  eras is never penalized: cross-generation super teams are the point of
  the game.

The weighted overall maps through a logistic curve to a per-game win
probability, jittered by nightly opponent strength, and the season is played
out game by game — so records vary run to run, and 82-0 is possible but
properly rare. Head-to-head series win probability comes from the overall
gap between the two teams; each game gets a simulated score.

## Notes

- Server state (rooms) is in-memory; leaderboard + shared results persist to
  `server/data/*.json` (gitignored).
- Mobile-first UI — the whole draft flow works one-handed on a phone.
