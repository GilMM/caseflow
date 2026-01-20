"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data || { id: userId, full_name: "", avatar_url: null });
    } catch (e) {
      console.error("Failed to fetch profile:", e);
      setProfile({ id: userId, full_name: "", avatar_url: null });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);

      if (sessionUser?.id) {
        await fetchProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
      setUser(null);
      setProfile(null);
    }
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const sessionUser = data?.session?.user || null;
        setUser(sessionUser);

        if (sessionUser?.id) {
          await fetchProfile(sessionUser.id);
        }
      } catch (e) {
        console.error("UserContext init error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const sessionUser = session?.user || null;
      setUser(sessionUser);

      if (sessionUser?.id) {
        fetchProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  const value = {
    user,
    profile,
    loading,
    refreshUser,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;
