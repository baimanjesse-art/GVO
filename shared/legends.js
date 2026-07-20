// Legendary opponents for All-Time Battle: every real team that won 68+
// games, plus the squads that never lost — Olympic super teams and the
// all-time starting five. Rosters are the actual starting fives with that
// season's (or era's) stats.

function p(name, positions, rating, pts, reb, ast, team, decade) {
  return { name, positions: positions.split("/"), rating, pts, reb, ast, team, decade };
}

export const LEGENDS = [
  {
    id: "bulls96",
    name: "1995-96 Chicago Bulls",
    record: "72-10",
    abbr: "CHI",
    color: "#CE1141",
    tagline: "The gold standard. Jordan's revenge tour ended 72-10 with a ring.",
    roster: {
      PG: p("Ron Harper", "PG/SG", 80, 7.4, 2.7, 2.6, "Chicago Bulls", "1990s"),
      SG: p("Michael Jordan", "SG", 99, 30.4, 6.6, 4.3, "Chicago Bulls", "1990s"),
      SF: p("Scottie Pippen", "SF", 95, 19.4, 6.4, 5.9, "Chicago Bulls", "1990s"),
      PF: p("Dennis Rodman", "PF", 89, 5.5, 14.9, 2.5, "Chicago Bulls", "1990s"),
      C: p("Luc Longley", "C", 77, 9.1, 5.1, 1.9, "Chicago Bulls", "1990s"),
    },
  },
  {
    id: "bulls97",
    name: "1996-97 Chicago Bulls",
    record: "69-13",
    abbr: "CHI",
    color: "#CE1141",
    tagline: "The encore. Back-to-back 69 wins and the flu game finish.",
    roster: {
      PG: p("Ron Harper", "PG/SG", 79, 6.3, 2.5, 2.5, "Chicago Bulls", "1990s"),
      SG: p("Michael Jordan", "SG", 98, 29.6, 5.9, 4.3, "Chicago Bulls", "1990s"),
      SF: p("Scottie Pippen", "SF", 94, 20.2, 6.5, 5.7, "Chicago Bulls", "1990s"),
      PF: p("Dennis Rodman", "PF", 88, 5.7, 16.1, 3.1, "Chicago Bulls", "1990s"),
      C: p("Luc Longley", "C", 76, 9.1, 4.9, 1.8, "Chicago Bulls", "1990s"),
    },
  },
  {
    id: "warriors16",
    name: "2015-16 Golden State Warriors",
    record: "73-9",
    abbr: "GSW",
    color: "#1D428A",
    tagline: "73 wins, a unanimous MVP, and an offense from the future.",
    roster: {
      PG: p("Stephen Curry", "PG", 99, 30.1, 5.4, 6.7, "Golden State Warriors", "2010s"),
      SG: p("Klay Thompson", "SG", 91, 22.1, 3.8, 2.1, "Golden State Warriors", "2010s"),
      SF: p("Harrison Barnes", "SF/PF", 79, 11.7, 4.9, 1.8, "Golden State Warriors", "2010s"),
      PF: p("Draymond Green", "PF/C", 90, 14.0, 9.5, 7.4, "Golden State Warriors", "2010s"),
      C: p("Andrew Bogut", "C", 78, 5.4, 7.0, 2.3, "Golden State Warriors", "2010s"),
    },
  },
  {
    id: "lakers72",
    name: "1971-72 Los Angeles Lakers",
    record: "69-13",
    abbr: "LAL",
    color: "#552583",
    tagline: "33 straight wins — a streak nobody has touched in 50 years.",
    roster: {
      PG: p("Jerry West", "PG/SG", 97, 25.8, 4.2, 9.7, "Los Angeles Lakers", "1970s"),
      SG: p("Gail Goodrich", "SG/PG", 88, 25.9, 3.8, 4.5, "Los Angeles Lakers", "1970s"),
      SF: p("Jim McMillian", "SF", 79, 18.8, 6.5, 2.6, "Los Angeles Lakers", "1970s"),
      PF: p("Happy Hairston", "PF", 78, 13.1, 13.1, 2.7, "Los Angeles Lakers", "1970s"),
      C: p("Wilt Chamberlain", "C", 96, 14.8, 19.2, 4.0, "Los Angeles Lakers", "1970s"),
    },
  },
  {
    id: "sixers67",
    name: "1966-67 Philadelphia 76ers",
    record: "68-13",
    abbr: "PHI",
    color: "#006BB6",
    tagline: "Wilt at his most unstoppable — the first 68-win season ever.",
    roster: {
      PG: p("Wali Jones", "PG", 76, 13.2, 2.9, 3.6, "Philadelphia 76ers", "1960s"),
      SG: p("Hal Greer", "SG/PG", 89, 22.1, 5.3, 3.8, "Philadelphia 76ers", "1960s"),
      SF: p("Chet Walker", "SF", 86, 19.3, 8.1, 2.3, "Philadelphia 76ers", "1960s"),
      PF: p("Luke Jackson", "PF/C", 78, 12.0, 8.9, 1.4, "Philadelphia 76ers", "1960s"),
      C: p("Wilt Chamberlain", "C", 99, 24.1, 24.2, 7.8, "Philadelphia 76ers", "1960s"),
    },
  },
  {
    id: "dream92",
    name: "1992 Dream Team",
    record: "8-0 in Barcelona",
    abbr: "USA",
    color: "#0A3161",
    tagline: "The greatest collection of talent ever assembled. Average margin: +44.",
    roster: {
      PG: p("Magic Johnson", "PG", 98, 19.5, 7.2, 11.2, "Los Angeles Lakers", "1980s"),
      SG: p("Michael Jordan", "SG", 99, 30.1, 6.2, 5.3, "Chicago Bulls", "1990s"),
      SF: p("Larry Bird", "SF/PF", 97, 24.3, 10.0, 6.3, "Boston Celtics", "1980s"),
      PF: p("Charles Barkley", "PF", 96, 22.1, 11.7, 3.9, "Phoenix Suns", "1990s"),
      C: p("Patrick Ewing", "C", 95, 21.0, 9.8, 1.9, "New York Knicks", "1990s"),
    },
  },
  {
    id: "redeem08",
    name: "2008 Redeem Team",
    record: "8-0 in Beijing",
    abbr: "USA",
    color: "#B31942",
    tagline: "Kobe, LeBron and D-Wade on a gold-medal mission.",
    roster: {
      PG: p("Jason Kidd", "PG", 87, 10.8, 6.5, 10.1, "New Jersey Nets", "2000s"),
      SG: p("Kobe Bryant", "SG", 98, 28.3, 6.3, 5.4, "Los Angeles Lakers", "2000s"),
      SF: p("LeBron James", "PG/SG/SF/PF/C", 99, 30.0, 7.9, 7.2, "Cleveland Cavaliers", "2000s"),
      PF: p("Carmelo Anthony", "PF/SF", 91, 25.7, 7.4, 3.4, "Denver Nuggets", "2000s"),
      C: p("Dwight Howard", "C", 93, 20.7, 14.2, 1.3, "Orlando Magic", "2000s"),
    },
  },
  {
    id: "goat",
    name: "All-Time First Team",
    record: "The final boss",
    abbr: "GOAT",
    color: "#C9A227",
    tagline: "Magic. Jordan. LeBron. Bird. Kareem. Good luck.",
    roster: {
      PG: p("Magic Johnson", "PG", 99, 23.9, 6.3, 12.8, "Los Angeles Lakers", "1980s"),
      SG: p("Michael Jordan", "SG", 99, 35.0, 5.5, 5.9, "Chicago Bulls", "1990s"),
      SF: p("LeBron James", "PG/SG/SF/PF/C", 99, 27.1, 7.5, 7.4, "Cleveland Cavaliers", "2010s"),
      PF: p("Larry Bird", "PF/SF", 98, 28.7, 9.3, 6.6, "Boston Celtics", "1980s"),
      C: p("Kareem Abdul-Jabbar", "C", 99, 34.8, 16.6, 4.6, "Milwaukee Bucks", "1970s"),
    },
  },
];

export function randomLegend(rng = Math.random) {
  return LEGENDS[Math.floor(rng() * LEGENDS.length)];
}
