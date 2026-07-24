import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { mergeRealtimeRow } from "./realtimeMerge.js";

/**
 * Realtime auction-room client. Subscribes to a single `auction_rooms` row and
 * mirrors it into React state. Bids/passes go through `auction_action`, which
 * version-checks the write so the two clients never diverge.
 */
export function useAuctionRoom() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef(null);
  const codeRef = useRef(null);

  const fetchRoom = useCallback(async (code) => {
    const { data } = await supabase.from("auction_rooms").select("*").eq("code", code).maybeSingle();
    if (data) setRoom(data);
    return data;
  }, []);

  const watch = useCallback(
    (code) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      codeRef.current = code;
      fetchRoom(code);
      const channel = supabase
        .channel(`auction:${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "auction_rooms", filter: `code=eq.${code}` },
          (payload) => {
            if (payload.new) setRoom((prev) => mergeRealtimeRow(prev, payload.new));
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
      if (fn === "create_auction_room") return { code: data };
      if (data && typeof data === "object") setRoom(data);
      else if (codeRef.current) fetchRoom(codeRef.current);
      return { data };
    },
    [fetchRoom]
  );

  const createRoom = useCallback(
    async (name, sport) => {
      const res = await call("create_auction_room", { p_host_name: name, p_sport: sport });
      if (res.code) watch(res.code);
      return res;
    },
    [call, watch]
  );

  const joinRoom = useCallback(
    async (code, name) => {
      const res = await call("join_auction_room", { room_code: code, p_guest_name: name });
      if (!res.error) watch(code);
      return res;
    },
    [call, watch]
  );

  const startAuction = useCallback(
    (code, queue, seed, state) =>
      call("start_auction", { room_code: code, p_queue: queue, p_seed: seed, p_state: state }),
    [call]
  );
  const submitAction = useCallback(
    (code, state, version) =>
      call("auction_action", { room_code: code, p_state: state, p_expected_version: version }),
    [call]
  );
  const finishAuction = useCallback(
    (code, winner, result) => call("finish_auction", { room_code: code, winner, p_result: result }),
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
    startAuction,
    submitAction,
    finishAuction,
  };
}
