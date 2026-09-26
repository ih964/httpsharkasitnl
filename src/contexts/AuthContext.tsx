import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "factuur_maker" | "tankprijzen";
export type ModuleRole = Exclude<AppRole, "admin">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  hasAccess: boolean;
  isLoading: boolean;
  canAccess: (role: ModuleRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoles = async (userId: string): Promise<AppRole[]> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("[Auth] user_roles query error:", error);
        return [];
      }

      return (data ?? [])
        .map((row) => row.role as AppRole)
        .filter((role): role is AppRole =>
          role === "admin" || role === "factuur_maker" || role === "tankprijzen",
        );
    } catch (error) {
      console.error("[Auth] role check exception:", error);
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRoles([]);
        setIsLoading(false);
        return;
      }

      const nextRoles = await loadRoles(nextSession.user.id);
      if (!mounted) return;
      setRoles(nextRoles);
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => {
          applySession(nextSession);
        }, 0);
      },
    );

    const initSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) console.error("[Auth] getSession error:", error);
        await applySession(currentSession);
      } catch (error) {
        console.error("[Auth] getSession exception:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const hasAccess = roles.length > 0;
  const canAccess = (role: ModuleRole) => isAdmin || roles.includes(role);

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
    setRoles([]);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, roles, isAdmin, hasAccess, isLoading, canAccess, signIn, signOut }}
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
