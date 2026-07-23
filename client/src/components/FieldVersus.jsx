import FieldBoard from "./FieldBoard.jsx";

/**
 * Football team-vs-team: two field boards, opponent (A) and yours (B). Same
 * prop contract as basketball's FullCourt so H2HCompare and the battle screens
 * can pick a board by sport. Team A is always static; team B becomes
 * interactive during the draft via `interactiveB`
 * ({ placing, onPlace, onSwap, strictFit, onlySlots }).
 */
export default function FieldVersus({
  teamA,
  teamB,
  nameA,
  nameB,
  accentA = "#38bdf8",
  accentB = "#f97316",
  interactiveB,
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <FieldBoard roster={teamA} title={nameA} accent={accentA} compact />
      <FieldBoard
        roster={teamB}
        title={nameB}
        accent={accentB}
        compact
        placing={interactiveB?.placing || null}
        onPlace={interactiveB?.onPlace}
        onSwap={interactiveB?.onSwap}
        strictFit={interactiveB?.strictFit}
        onlySlots={interactiveB?.onlySlots}
      />
    </div>
  );
}
