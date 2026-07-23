import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { mergeRealtimeRow } from "./realtimeMerge.js";

/**
 * Realtime pack-versus room. Each player opens their own packs blind, submits a
 * five, then both squads face off. Mirrors useDraftRoom: one row, watched via
 * postgres_changes, mutated only through SECURITY DEFINER RPCs.
 */
export function usePackRoom() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef(null);
  const codeRef = useRef(null);

  const fetchRoom = useCallback(async (code) => {
    const { data } = await supabase.from("pack_rooms").select("*").eq("code", code).maybeSingle();
    if (data) setRoom(data);
    return data;
  }, []);

  const watch = useCallback(
    (code) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      codeRef.current = code;
      fetchRoom(code);
      const channel = supabase
        .channel(`pack:${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pack_rooms", filter: `code=eq.${code}` },
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
      if (fn === "create_pack_room") return { code: data };
      if (data && typeof data === "object") setRoom(data);
      else if (codeRef.current) fetchRoom(codeRef.current);
      return { data };
    },
    [fetchRoom]
  );

  const createRoom = useCallback(
    async (name) => {
      const res = await call("create_pack_room", { p_host_name: name });
      if (res.code) watch(res.code);
      return res;
    },
    [call, watch]
  );

  const joinRoom = useCallback(
    async (code, name) => {
      const res = await call("join_pack_room", { room_code: code, p_guest_name: name });
      if (!res.error) watch(code);
      return res;
    },
    [call, watch]
  );

  const submitTeam = useCallback(
    (code, upgraded, roster) =>
      call("submit_pack_team", { room_code: code, p_upgraded: upgraded, p_roster: roster }),
    [call]
  );

  const finishPack = useCallback(
    (code, winner, result) => call("finish_pack", { room_code: code, winner, p_result: result }),
    [call]
  );

  return { room, error, busy, watch, leave, clearError: () => setError(null), createRoom, joinRoom, submitTeam, finishPack };
}
