import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "arena-h2h-session";

export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(s) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * WebSocket room connection hook for head-to-head mode.
 */
export function useRoom() {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|connecting|open|closed
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const openActionRef = useRef(null);

  const connect = useCallback((action) => {
    setError(null);
    setStatus("connecting");
    openActionRef.current = action;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      ws.send(JSON.stringify(action));
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "joined") {
        saveSession({
          code: msg.code,
          playerId: msg.playerId,
          token: msg.token,
          name: action.name,
        });
      } else if (msg.type === "state") {
        setState(msg.state);
      } else if (msg.type === "error") {
        setError(msg.message);
        // A failed join/rejoin leaves us with no room — surface and reset.
        if (["join", "rejoin", "create"].includes(openActionRef.current?.type)) {
          if (["Room not found. Check the code.", "Room is full.", "Match already started.", "Room no longer exists.", "Could not rejoin room."].includes(msg.message)) {
            saveSession(null);
            ws.close();
          }
        }
      }
    };
    ws.onclose = () => {
      setStatus("closed");
      wsRef.current = null;
    };
    ws.onerror = () => {
      setError(
        "Couldn't reach the live game server — head-to-head needs the Node server running (npm start). Solo mode works everywhere."
      );
    };
  }, []);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  }, []);

  const leave = useCallback(() => {
    saveSession(null);
    wsRef.current?.close();
    setState(null);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);

  return { state, status, error, connect, send, leave, clearError: () => setError(null) };
}
