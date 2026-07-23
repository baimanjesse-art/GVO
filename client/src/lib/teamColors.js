// A combined team-color lookup across both sports. NBA and NFL franchise names
// don't collide, so a merged map is unambiguous — and this module imports only
// plain constants (no components), so shared leaf components like PlayerPhoto
// can use it without risking an import cycle.
import { TEAM_META as BBALL_TEAM_META } from "../../../shared/constants.js";
import { TEAM_META as FBALL_TEAM_META } from "../../../shared/football/constants.js";

const ALL = { ...BBALL_TEAM_META, ...FBALL_TEAM_META };

export function teamMetaAny(team) {
  if (team && ALL[team]) return ALL[team];
  return { abbr: (team || "").slice(0, 3).toUpperCase() || "TBD", color: "#555" };
}
