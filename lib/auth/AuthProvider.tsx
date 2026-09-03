"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";

interface AuthContextValue {
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, is_active, created_at")
        .eq("id", userId)
        .single();

      setProfile(
        data
          ? {
              id: data.id,
              fullName: data.full_name,
              role: data.role,
              isActive: data.is_active,
              createdAt: data.created_at,
            }
          : null
      );
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      try {
        if (user) await loadProfile(user.id);
      } catch {
        // si falla loadProfile igual liberamos la carga
      }
      clearTimeout(timeout);
      if (isMounted) setIsLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      if (isMounted) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isLoading,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [profile, isLoading, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
