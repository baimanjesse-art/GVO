import { useState } from "react";
import { headshotUrl, initials } from "../../../shared/photos.js";
import { teamMeta } from "../../../shared/constants.js";

/**
 * Official NBA headshot with a styled initials fallback (team colors) for the
 * handful of vintage players the CDN has no photo for, or while offline.
 */
export default function PlayerPhoto({ name, team, className = "" }) {
  const [failed, setFailed] = useState(false);
  const url = headshotUrl(name);
  const meta = teamMeta(team);

  if (!url || failed) {
    return (
      <div
        className={`flex items-center justify-center font-display font-bold text-white/85 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${meta.color} 0%, #0b0e14 130%)`,
          fontSize: "min(2em, 1.5rem)",
        }}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover object-top ${className}`}
      style={{ background: `linear-gradient(160deg, ${meta.color}33 0%, transparent 70%)` }}
    />
  );
}
