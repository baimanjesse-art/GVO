import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SPORTS, SPORT_LIST, DEFAULT_SPORT_ID } from "./sports.js";

const SportCtx = createContext(null);
const STORAGE_KEY = "gvo.sport";

export function SportProvider({ children }) {
  const [id, setId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SPORTS[saved]) return saved;
    } catch {
      /* ignore */
    }
    return DEFAULT_SPORT_ID;
  });

  const setSport = useCallback((next) => {
    if (!SPORTS[next]) return;
    setId(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ sport: SPORTS[id] || SPORTS[DEFAULT_SPORT_ID], sportId: id, setSport, sports: SPORT_LIST }),
    [id, setSport]
  );

  return <SportCtx.Provider value={value}>{children}</SportCtx.Provider>;
}

// The active sport config (defaults to basketball if used outside a provider).
export function useSport() {
  const ctx = useContext(SportCtx);
  return ctx?.sport ?? SPORTS[DEFAULT_SPORT_ID];
}

// The full controls: { sport, sportId, setSport, sports }.
export function useSportControls() {
  return useContext(SportCtx);
}
