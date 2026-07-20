import playerIds from "./data/playerIds.js";

/**
 * Official NBA.com headshot URL for a player, or null if we have no ID.
 * Loaded by the visitor's browser straight from the NBA CDN.
 */
export function headshotUrl(name, size = "260x190") {
  const id = playerIds[name];
  return id ? `https://cdn.nba.com/headshots/nba/latest/${size}/${id}.png` : null;
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w))
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}
