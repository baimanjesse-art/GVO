import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase.js";

const AuthContext = createContext(null);

/**
 * Wraps the app and tracks the Supabase session + the player's profile row
 * (which holds their account Elo). Degrades gracefully when Supabase isn't
 * configured yet: `configured` is false and the offline modes keep working.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (uid) => {
    if (!supabase || !uid) {
      setProfile(null);
      return null;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data || null);
    return data || null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      loadProfile(u?.id).finally(() => active && setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u?.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (email, password, username) => {
    if (!supabase) return { error: "Accounts aren't set up yet." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username?.trim() || undefined } },
    });
    return { error: error?.message || null };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: "Accounts aren't set up yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = {
    user,
    profile,
    loading,
    configured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    refreshProfile: () => loadProfile(user?.id),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
