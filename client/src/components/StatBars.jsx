const LABELS = {
  talent: "Talent",
  star: "Star Power",
  depth: "Depth",
  fit: "Position Fit",
  chemistry: "Chemistry",
  scoring: "Scoring",
  playmaking: "Playmaking",
  rebounding: "Rebounding",
  // football
  passing: "Passing",
  receiving: "Receiving",
  rushing: "Rushing",
};

function barColor(v) {
  if (v >= 75) return "bg-emerald-500";
  if (v >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

export default function StatBars({ components }) {
  return (
    <div className="space-y-2">
      {Object.entries(components).map(([key, value]) => {
        const v = Math.round(value);
        return (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-24 flex-none text-slate-400">{LABELS[key] || key}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full ${barColor(v)} transition-all duration-700`}
                style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
              />
            </div>
            <span className="w-8 flex-none text-right font-bold tabular-nums">{v}</span>
          </div>
        );
      })}
    </div>
  );
}
