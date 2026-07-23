// Football (7-on-7) constants — the sport-specific counterpart to the
// basketball constants. Roster is seven slots: QB, RB, three WR, TE, and a
// FLEX that takes any RB/WR/TE.

// The four player types.
export const POSITIONS = ["QB", "RB", "WR", "TE"];

// The seven roster slots (object keys — WR is tripled, so WR1/WR2/WR3).
export const SLOTS = ["QB", "RB", "WR1", "WR2", "WR3", "TE", "FLEX"];

// Which player positions can naturally fill each slot.
export const SLOT_ELIGIBLE = {
  QB: ["QB"],
  RB: ["RB"],
  WR1: ["WR"],
  WR2: ["WR"],
  WR3: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
};

// Display label for a slot (the three WR slots all read "WR").
export const SLOT_LABEL = {
  QB: "QB",
  RB: "RB",
  WR1: "WR",
  WR2: "WR",
  WR3: "WR",
  TE: "TE",
  FLEX: "FLEX",
};

export const DECADES = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
export const DECADE_INDEX = Object.fromEntries(DECADES.map((d, i) => [d, i]));

export const ROUNDS = SLOTS.length; // 7

// Team display metadata (primary colors). Historical franchise names get their
// own entries so era-accurate teams show the right identity.
export const TEAM_META = {
  "Green Bay Packers": { abbr: "GB", color: "#203731" },
  "San Francisco 49ers": { abbr: "SF", color: "#AA0000" },
  "Dallas Cowboys": { abbr: "DAL", color: "#003594" },
  "Pittsburgh Steelers": { abbr: "PIT", color: "#FFB612" },
  "New England Patriots": { abbr: "NE", color: "#002244" },
  "Kansas City Chiefs": { abbr: "KC", color: "#E31837" },
  "Indianapolis Colts": { abbr: "IND", color: "#002C5F" },
  "Baltimore Colts": { abbr: "BAL", color: "#13294B" },
  "Denver Broncos": { abbr: "DEN", color: "#FB4F14" },
  "Miami Dolphins": { abbr: "MIA", color: "#008E97" },
  "Buffalo Bills": { abbr: "BUF", color: "#00338D" },
  "Baltimore Ravens": { abbr: "BAL", color: "#241773" },
  "New Orleans Saints": { abbr: "NO", color: "#D3BC8D" },
  "Seattle Seahawks": { abbr: "SEA", color: "#002244" },
  "Los Angeles Rams": { abbr: "LAR", color: "#003594" },
  "St. Louis Rams": { abbr: "STL", color: "#002244" },
  "Minnesota Vikings": { abbr: "MIN", color: "#4F2683" },
  "Atlanta Falcons": { abbr: "ATL", color: "#A71930" },
  "Cincinnati Bengals": { abbr: "CIN", color: "#FB4F14" },
  "Chicago Bears": { abbr: "CHI", color: "#0B162A" },
  "Oakland Raiders": { abbr: "OAK", color: "#A5ACAF" },
  "Los Angeles Raiders": { abbr: "LARD", color: "#A5ACAF" },
  "Las Vegas Raiders": { abbr: "LV", color: "#000000" },
  "Washington Redskins": { abbr: "WAS", color: "#5A1414" },
  "Washington Commanders": { abbr: "WAS", color: "#5A1414" },
  "New York Giants": { abbr: "NYG", color: "#0B2265" },
  "Philadelphia Eagles": { abbr: "PHI", color: "#004C54" },
  "Detroit Lions": { abbr: "DET", color: "#0076B6" },
  "Cleveland Browns": { abbr: "CLE", color: "#FF3C00" },
  "Houston Oilers": { abbr: "HOU", color: "#4B92DB" },
  "Tennessee Titans": { abbr: "TEN", color: "#0C2340" },
  "Carolina Panthers": { abbr: "CAR", color: "#0085CA" },
  "Tampa Bay Buccaneers": { abbr: "TB", color: "#D50A0A" },
  "Arizona Cardinals": { abbr: "ARI", color: "#97233F" },
  "San Diego Chargers": { abbr: "SD", color: "#0080C6" },
  "Los Angeles Chargers": { abbr: "LAC", color: "#0080C6" },
  "New York Jets": { abbr: "NYJ", color: "#125740" },
  "Jacksonville Jaguars": { abbr: "JAX", color: "#006778" },
};

export function teamMeta(team) {
  return TEAM_META[team] || { abbr: team.slice(0, 3).toUpperCase(), color: "#555" };
}
