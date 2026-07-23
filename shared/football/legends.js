// Legendary opponents for football All-Time Battle: the perfect seasons, the
// record-setting offenses, and an all-time first team as the final boss. Each
// roster is a full seven — QB, RB, three WR, TE and a FLEX — with that season's
// (or era's) stat line. Player shape mirrors the dataset:
//   QB [passYds, passTD, rushYds] · RB [rushYds, rushTD, recYds] · WR/TE [recYds, recTD, rec]

function p(name, position, rating, s1, s2, s3, team, decade) {
  return { name, position, rating, s1, s2, s3, team, decade };
}

export const LEGENDS = [
  {
    id: "pats07",
    name: "2007 New England Patriots",
    record: "16-0",
    abbr: "NE",
    color: "#002244",
    tagline: "The only 16-0 regular season. Brady to Moss, 50 TD passes.",
    roster: {
      QB: p("Tom Brady", "QB", 97, 4806, 50, 98, "New England Patriots", "2000s"),
      RB: p("Laurence Maroney", "RB", 79, 835, 6, 194, "New England Patriots", "2000s"),
      WR1: p("Randy Moss", "WR", 98, 1493, 23, 98, "New England Patriots", "2000s"),
      WR2: p("Wes Welker", "WR", 90, 1175, 8, 112, "New England Patriots", "2000s"),
      WR3: p("Donte Stallworth", "WR", 78, 697, 3, 46, "New England Patriots", "2000s"),
      TE: p("Ben Watson", "TE", 76, 389, 6, 36, "New England Patriots", "2000s"),
      FLEX: p("Kevin Faulk", "RB", 74, 265, 0, 383, "New England Patriots", "2000s"),
    },
  },
  {
    id: "dolphins72",
    name: "1972 Miami Dolphins",
    record: "17-0 · perfect",
    abbr: "MIA",
    color: "#008E97",
    tagline: "The only perfect season in NFL history. Still undefeated.",
    roster: {
      QB: p("Bob Griese", "QB", 86, 1936, 11, 89, "Miami Dolphins", "1970s"),
      RB: p("Larry Csonka", "RB", 90, 1117, 6, 156, "Miami Dolphins", "1970s"),
      WR1: p("Paul Warfield", "WR", 90, 606, 3, 29, "Miami Dolphins", "1970s"),
      WR2: p("Howard Twilley", "WR", 74, 364, 3, 20, "Miami Dolphins", "1970s"),
      WR3: p("Marlin Briscoe", "WR", 74, 279, 4, 16, "Miami Dolphins", "1970s"),
      TE: p("Marv Fleming", "TE", 70, 331, 4, 26, "Miami Dolphins", "1970s"),
      FLEX: p("Mercury Morris", "RB", 84, 1000, 12, 168, "Miami Dolphins", "1970s"),
    },
  },
  {
    id: "rams99",
    name: "1999 St. Louis Rams",
    record: "Greatest Show on Turf",
    abbr: "STL",
    color: "#002244",
    tagline: "Warner from grocery bagger to MVP — the most electric offense ever.",
    roster: {
      QB: p("Kurt Warner", "QB", 95, 4353, 41, 92, "St. Louis Rams", "2000s"),
      RB: p("Marshall Faulk", "RB", 97, 1381, 7, 1048, "St. Louis Rams", "2000s"),
      WR1: p("Isaac Bruce", "WR", 90, 1165, 12, 77, "St. Louis Rams", "2000s"),
      WR2: p("Torry Holt", "WR", 88, 788, 6, 52, "St. Louis Rams", "2000s"),
      WR3: p("Az-Zahir Hakim", "WR", 78, 677, 8, 36, "St. Louis Rams", "2000s"),
      TE: p("Roland Williams", "TE", 68, 226, 3, 25, "St. Louis Rams", "2000s"),
      FLEX: p("Ricky Proehl", "WR", 76, 349, 0, 33, "St. Louis Rams", "2000s"),
    },
  },
  {
    id: "niners89",
    name: "1989 San Francisco 49ers",
    record: "Montana & Rice dynasty",
    abbr: "SF",
    color: "#AA0000",
    tagline: "Montana to Rice at the peak of the West Coast offense.",
    roster: {
      QB: p("Joe Montana", "QB", 97, 3521, 26, 227, "San Francisco 49ers", "1980s"),
      RB: p("Roger Craig", "RB", 88, 1054, 6, 473, "San Francisco 49ers", "1980s"),
      WR1: p("Jerry Rice", "WR", 99, 1483, 17, 82, "San Francisco 49ers", "1980s"),
      WR2: p("John Taylor", "WR", 85, 1077, 10, 60, "San Francisco 49ers", "1980s"),
      WR3: p("Mike Wilson", "WR", 70, 200, 2, 17, "San Francisco 49ers", "1980s"),
      TE: p("Brent Jones", "TE", 82, 500, 4, 40, "San Francisco 49ers", "1980s"),
      FLEX: p("Tom Rathman", "RB", 74, 305, 1, 616, "San Francisco 49ers", "1980s"),
    },
  },
  {
    id: "cowboys92",
    name: "1992 Dallas Cowboys",
    record: "The Triplets, champs",
    abbr: "DAL",
    color: "#003594",
    tagline: "Aikman, Emmitt and Irvin — a dynasty in its prime.",
    roster: {
      QB: p("Troy Aikman", "QB", 90, 3445, 23, 105, "Dallas Cowboys", "1990s"),
      RB: p("Emmitt Smith", "RB", 96, 1713, 18, 335, "Dallas Cowboys", "1990s"),
      WR1: p("Michael Irvin", "WR", 92, 1396, 7, 78, "Dallas Cowboys", "1990s"),
      WR2: p("Alvin Harper", "WR", 82, 562, 4, 35, "Dallas Cowboys", "1990s"),
      WR3: p("Kelvin Martin", "WR", 74, 359, 2, 32, "Dallas Cowboys", "1990s"),
      TE: p("Jay Novacek", "TE", 84, 630, 6, 68, "Dallas Cowboys", "1990s"),
      FLEX: p("Daryl Johnston", "RB", 72, 212, 2, 249, "Dallas Cowboys", "1990s"),
    },
  },
  {
    id: "broncos13",
    name: "2013 Denver Broncos",
    record: "606 points · record offense",
    abbr: "DEN",
    color: "#FB4F14",
    tagline: "Peyton's 55-TD masterpiece — the highest-scoring offense ever.",
    roster: {
      QB: p("Peyton Manning", "QB", 97, 5477, 55, 6, "Denver Broncos", "2010s"),
      RB: p("Knowshon Moreno", "RB", 80, 1038, 10, 548, "Denver Broncos", "2010s"),
      WR1: p("Demaryius Thomas", "WR", 91, 1430, 14, 92, "Denver Broncos", "2010s"),
      WR2: p("Eric Decker", "WR", 84, 1288, 11, 87, "Denver Broncos", "2010s"),
      WR3: p("Wes Welker", "WR", 82, 778, 10, 73, "Denver Broncos", "2010s"),
      TE: p("Julius Thomas", "TE", 82, 788, 12, 65, "Denver Broncos", "2010s"),
      FLEX: p("Montee Ball", "RB", 68, 559, 4, 145, "Denver Broncos", "2010s"),
    },
  },
  {
    id: "goat",
    name: "All-Time First Team",
    record: "The final boss",
    abbr: "GOAT",
    color: "#C9A227",
    tagline: "Mahomes. Rice. Moss. Barry. Gronk. Good luck.",
    roster: {
      QB: p("Patrick Mahomes", "QB", 99, 5000, 45, 350, "Kansas City Chiefs", "2020s"),
      RB: p("Barry Sanders", "RB", 99, 2053, 11, 305, "Detroit Lions", "1990s"),
      WR1: p("Jerry Rice", "WR", 99, 1848, 22, 112, "San Francisco 49ers", "1990s"),
      WR2: p("Randy Moss", "WR", 98, 1632, 17, 111, "Minnesota Vikings", "2000s"),
      WR3: p("Justin Jefferson", "WR", 97, 1809, 10, 128, "Minnesota Vikings", "2020s"),
      TE: p("Rob Gronkowski", "TE", 97, 1327, 17, 90, "New England Patriots", "2010s"),
      FLEX: p("Christian McCaffrey", "RB", 96, 1459, 14, 564, "San Francisco 49ers", "2020s"),
    },
  },
];

export function randomLegend(rng = Math.random) {
  return LEGENDS[Math.floor(rng() * LEGENDS.length)];
}
