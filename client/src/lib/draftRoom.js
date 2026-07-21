import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";

/**
 * Realtime draft-room client. Subscribes to a single `draft_rooms` row and
 * mirrors it into React state; every mutation goes through a SECURITY DEFINER
 * RPC so the server enforces turn order and Elo. Both players watch the same
 * row, so the board stays in lockstep.
 */
export function useDraftRoom() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef(null);
  const codeRef = useRef(null);

  const fetchRoom = useCallback(async (code) => {
    const { data } = await supabase.from("draft_rooms").select("*").eq("code", code).maybeSingle();
    if (data) setRoom(data);
    return data;
  }, []);

  const watch = useCallback(
    (code) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      codeRef.current = code;
      fetchRoom(code);
      const channel = supabase
        .channel(`draft:${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "draft_rooms", filter: `code=eq.${code}` },
          (payload) => {
            if (payload.new) setRoom(payload.new);
          }
        )
        .subscribe();
      channelRef.current = channel;
    },
    [fetchRoom]
  );

  const leave = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    codeRef.current = null;
    setRoom(null);
    setError(null);
  }, []);

  useEffect(() => () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  }, []);

  // Call an RPC, surfacing its error message and keeping the row fresh.
  const call = useCallback(
    async (fn, args) => {
      setError(null);
      setBusy(true);
      const { data, error: err } = await supabase.rpc(fn, args);
      setBusy(false);
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      // create returns the code (text); the rest return the row.
      if (fn === "create_draft_room") return { code: data };
      if (data && typeof data === "object") setRoom(data);
      else if (codeRef.current) fetchRoom(codeRef.current);
      return { data };
    },
    [fetchRoom]
  );

  const createRoom = useCallback(
    async (name) => {
      const res = await call("create_draft_room", { p_host_name: name });
      if (res.code) watch(res.code);
      return res;
    },
    [call, watch]
  );

  const joinRoom = useCallback(
    async (code, name) => {
      const res = await call("join_draft_room", { room_code: code, p_guest_name: name });
      if (!res.error) watch(code);
      return res;
    },
    [call, watch]
  );

  const startDraft = useCallback(
    (code, pool, seed) => call("start_draft", { room_code: code, p_pool: pool, p_seed: seed }),
    [call]
  );
  const makePick = useCallback(
    (code, player) => call("make_pick", { room_code: code, p_player: player }),
    [call]
  );
  const submitRoster = useCallback(
    (code, roster) => call("submit_roster", { room_code: code, p_roster: roster }),
    [call]
  );
  const finishDraft = useCallback(
    (code, winner, result) => call("finish_draft", { room_code: code, winner, p_result: result }),
    [call]
  );

  return {
    room,
    error,
    busy,
    watch,
    leave,
    clearError: () => setError(null),
    createRoom,
    joinRoom,
    startDraft,
    makePick,
    submitRoster,
    finishDraft,
  };
}
