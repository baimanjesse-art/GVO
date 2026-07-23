// Sport registry — one config bundle per sport so a single game flow (Solo,
// results, playback) can drive either basketball or football. Everything that
// differs between the two sports is resolved through the active sport's entry
// here, keeping the screens sport-agnostic.

import * as bballConst from "../../../shared/constants.js";
import * as bballSim from "../../../shared/sim.js";
import * as bballSpin from "../../../shared/players.js";
import { randomLegend as bballRandomLegend } from "../../../shared/legends.js";
import { dealPacks as bballDealPacks } from "../../../shared/packs.js";
import * as bballDraft from "../../../shared/draft.js";
import { encodeSolo } from "./shareCode.js";
import CourtBoard from "../components/CourtBoard.jsx";
import FullCourt from "../components/FullCourt.jsx";

import * as fbConst from "../../../shared/football/constants.js";
import * as fbSim from "../../../shared/football/sim.js";
import * as fbSpin from "../../../shared/football/spin.js";
import * as fbPlayers from "../../../shared/football/players.js";
import { randomLegend as fbRandomLegend } from "../../../shared/football/legends.js";
import { dealPacks as fbDealPacks } from "../../../shared/football/packs.js";
import * as fbDraft from "../../../shared/football/draft.js";
import FieldBoard from "../components/FieldBoard.jsx";
import FieldVersus from "../components/FieldVersus.jsx";

function emptyFrom(slots) {
  return Object.fromEntries(slots.map((s) => [s, null]));
}

// Football per-player box-score labels depend on his position (see the data
// files: QB rows are passYds/passTD/rushYds, RB rushYds/rushTD/recYds, and
// WR/TE recYds/recTD/receptions).
function footballStats(p) {
  const [s1, s2, s3] = [p.s1, p.s2, p.s3];
  if (p.position === "QB") return [[s1, "YDS"], [s2, "TD"], [s3, "RUN"]];
  if (p.position === "RB") return [[s1, "RUSH"], [s2, "TD"], [s3, "REC"]];
  return [[s1, "YDS"], [s2, "TD"], [s3, "CATCH"]];
}

const basketball = {
  id: "basketball",
  label: "Basketball",
  icon: "🏀",
  // roster
  slots: bballConst.POSITIONS,
  rounds: bballConst.ROUNDS,
  emptyRoster: () => emptyFrom(bballConst.POSITIONS),
  slotLabel: (slot) => slot,
  // wheel
  decades: bballConst.DECADES,
  teams: Object.keys(bballConst.TEAM_META),
  teamMeta: bballConst.teamMeta,
  spinWheel: bballSpin.spinWheel,
  respinSpin: bballSpin.respinSpin,
  canRespin: bballSpin.canRespin,
  // sim
  simulateSeason: bballSim.simulateSeason,
  makeRng: bballSim.makeRng,
  bestPick: bballSim.bestPick,
  fitDistance: bballSim.fitDistance,
  evaluateTeam: bballSim.evaluateTeam,
  simulateSeries: bballSim.simulateSeries,
  statEdges: bballSim.statEdges,
  // battle modes
  eraLineupSpin: bballSpin.eraLineupSpin,
  decadeSpin: bballSpin.decadeSpin,
  pools: bballSpin.POOLS,
  bestLineup: bballSim.bestLineup,
  randomLegend: bballRandomLegend,
  supportsHistoric: true,
  supportsAllTime: true,
  // NBA decades have 20-30 teams, so a Historic draft takes one player per team.
  historicUniqueTeams: true,
  seriesLabel: "best-of-7",
  // pack & play
  dealPacks: (opts) => bballDealPacks({ upgradedPosition: opts.upgraded, rng: opts.rng }),
  packSlotName: {
    PG: "Point Guard",
    SG: "Shooting Guard",
    SF: "Small Forward",
    PF: "Power Forward",
    C: "Center",
  },
  packBestKey: "arena-pack-best",
  supportsPackOnline: true,
  // online draft
  draftPool: bballDraft.draftPool,
  rosterFromPicks: bballDraft.rosterFromPicks,
  whoseTurn: bballDraft.whoseTurn,
  snakeOrder: bballDraft.SNAKE_ORDER,
  totalPicks: bballDraft.TOTAL_PICKS,
  picksPerPlayer: bballDraft.PICKS_PER_PLAYER,
  draftPoolSize: bballDraft.DRAFT_POOL_SIZE,
  supportsDraftOnline: true,
  // season framing
  seasonGames: 82,
  seasonLabel: "82-game season",
  simCta: "Sim the 82-game season",
  confettiWins: 60,
  // UI
  Board: CourtBoard,
  Versus: FullCourt,
  // solo share codes (basketball only for now)
  supportsShare: true,
  encodeSolo,
  // player-card rendering
  playerPositionLabel: (p) => (p.positions ? p.positions.join("/") : p.position),
  playerStats: (p) => [[p.pts, "PPG"], [p.reb, "RPG"], [p.ast, "APG"]],
};

const football = {
  id: "football",
  label: "Football",
  icon: "🏈",
  slots: fbConst.SLOTS,
  rounds: fbConst.ROUNDS,
  emptyRoster: () => emptyFrom(fbConst.SLOTS),
  slotLabel: (slot) => fbConst.SLOT_LABEL[slot] || slot,
  decades: fbConst.DECADES,
  teams: Object.keys(fbConst.TEAM_META),
  teamMeta: fbConst.teamMeta,
  spinWheel: fbSpin.spinWheel,
  respinSpin: fbSpin.respinSpin,
  canRespin: fbSpin.canRespin,
  simulateSeason: fbSim.simulateSeason,
  makeRng: fbSim.makeRng,
  bestPick: fbSpin.bestPick,
  fitDistance: fbSim.fitDistance,
  evaluateTeam: fbSim.evaluateTeam,
  simulateSeries: fbSim.simulateSeries,
  statEdges: fbSim.statEdges,
  eraLineupSpin: fbSpin.eraLineupSpin,
  decadeSpin: fbSpin.decadeSpin,
  pools: fbPlayers.POOLS,
  bestLineup: fbSpin.bestLineup,
  randomLegend: fbRandomLegend,
  supportsHistoric: true,
  supportsAllTime: true,
  // NFL decades have only ~7-9 teams here, so one player per team can't field a
  // seven-man squad — a team's pool can be drawn from more than once.
  historicUniqueTeams: false,
  seriesLabel: "single game",
  dealPacks: (opts) => fbDealPacks({ upgraded: opts.upgraded, rng: opts.rng }),
  packSlotName: {
    QB: "Quarterback",
    RB: "Running Back",
    WR1: "Wide Receiver",
    WR2: "Wide Receiver",
    WR3: "Wide Receiver",
    TE: "Tight End",
    FLEX: "Flex · RB/WR/TE",
  },
  packBestKey: "arena-pack-best-football",
  supportsPackOnline: true,
  draftPool: fbDraft.draftPool,
  rosterFromPicks: fbDraft.rosterFromPicks,
  whoseTurn: fbDraft.whoseTurn,
  snakeOrder: fbDraft.SNAKE_ORDER,
  totalPicks: fbDraft.TOTAL_PICKS,
  picksPerPlayer: fbDraft.PICKS_PER_PLAYER,
  draftPoolSize: fbDraft.DRAFT_POOL_SIZE,
  supportsDraftOnline: true,
  seasonGames: 17,
  seasonLabel: "17-game season",
  simCta: "Sim the 17-game season",
  confettiWins: 17,
  Board: FieldBoard,
  Versus: FieldVersus,
  supportsShare: false,
  encodeSolo: null,
  playerPositionLabel: (p) => p.position,
  playerStats: footballStats,
};

export const SPORTS = { basketball, football };
export const SPORT_LIST = [basketball, football];
export const DEFAULT_SPORT_ID = "basketball";

export function getSport(id) {
  return SPORTS[id] || SPORTS[DEFAULT_SPORT_ID];
}

// Resolve a sport from a player's shape — basketball players carry a
// `positions` array, football players a single `position` string. Lets shared
// components (PlayerCard) render correctly regardless of the active toggle.
export function sportForPlayer(player) {
  return player && Array.isArray(player.positions) ? basketball : football;
}
