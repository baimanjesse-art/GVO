import { useEffect, useMemo, useState } from "react";

const COLORS = ["#f97316", "#fdba74", "#34d399", "#38bdf8", "#f472b6", "#facc15"];

/**
 * One-shot celebratory confetti burst. Renders ~70 pieces falling from the
 * top of the viewport, then removes itself.
 */
export default function Confetti({ pieces = 70, duration = 3200 }) {
  const [gone, setGone] = useState(false);

  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        fall: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        tilt: Math.random() * 360,
        sway: Math.random() < 0.5 ? -1 : 1,
      })),
    [pieces]
  );

  useEffect(() => {
    const t = setTimeout(() => setGone(true), duration + 1200);
    return () => clearTimeout(t);
  }, [duration]);

  if (gone) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          className="absolute top-[-3vh] block"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size * 0.45,
            background: b.color,
            borderRadius: 2,
            transform: `rotate(${b.tilt}deg)`,
            animation: `confetti-fall ${b.fall}s ${b.delay}s cubic-bezier(0.3,0.4,0.6,1) forwards`,
            "--sway": `${b.sway * (24 + b.size * 3)}px`,
          }}
        />
      ))}
    </div>
  );
}
