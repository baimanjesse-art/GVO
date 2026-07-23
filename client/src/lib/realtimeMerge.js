/**
 * Merge a postgres_changes payload into the previously known row.
 *
 * Postgres omits (or nulls) large JSONB columns in the WAL when they're
 * TOASTed and unchanged by that particular UPDATE, unless the table has
 * REPLICA IDENTITY FULL set (which our tables now do — see schema.sql). This
 * merge is the client-side belt-and-suspenders: if a field comes through
 * null/undefined but we already had a real value for it, keep the real value
 * instead of letting a stray realtime event blank out the UI.
 */
export function mergeRealtimeRow(prev, incoming) {
  if (!incoming) return prev;
  if (!prev) return incoming;
  const merged = { ...prev };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null && prev[key] != null) continue;
    merged[key] = value;
  }
  return merged;
}
