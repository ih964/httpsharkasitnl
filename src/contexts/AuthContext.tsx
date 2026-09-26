import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey =
  | "dashboard"
  | "invoices"
  | "factuur_maker"
  | "customers"
  | "domains"
  | "time_entries"
  | "passwords"
  | "tankprijzen"
  | "btw_overzicht"
  | "settings";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  modules: ModuleKey[];
  isAdmin: boolean;
  hasAccess: boolean;
  isLoading: boolean;
  canAccess: (module: ModuleKey) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [modules, setModules] = useState<ModuleKey[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccess = async (userId: string) => {
    const [roleResult, moduleResult] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("user_module_access")
        .select("module_key")
        .eq("user_id", userId),
    ]);

    const admin = Boolean(roleResult.data) && !roleResult.error;
    const moduleKeys = (moduleResult.data ?? [])
      .map((row) => row.module_key as ModuleKey)
      .filter((module): module is ModuleKey =>
        [
          "dashboard",
          "invoices",
          "factuur_maker",
          "customers",
          "domains",
          "time_entries",
          "passwords",
          "tankprijzen",
          "btw_overzicht",
          "settings",
        ].includes(module),
      );

    return { admin, moduleKeys };
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setModules([]);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const access = await loadAccess(nextSession.user.id);
        if (!mounted) return;
        setIsAdmin(access.admin);
        setModules(access.moduleKeys);
      } catch (error) {
        console.error("[Auth] access load exception:", error);
        if (!mounted) return;
        setIsAdmin(false);
        setModules([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => applySession(nextSession), 0);
      },
    );

    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await applySession(currentSession);
      } catch (error) {
        console.error("[Auth] session load exception:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasAccess = isAdmin || modules.length > 0;
  const canAccess = (module: ModuleKey) => isAdmin || modules.includes(module);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { error: error as Error };
      }
      return { error: null };
    } catch (error) {
      setIsLoading(false);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setModules([]);
    setIsAdmin(false);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, modules, isAdmin, hasAccess, isLoading, canAccess, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
