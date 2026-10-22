import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  vezeteknev: string;
  keresztnev: string;
  telefonszam: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  loginNotice: boolean;
  dismissLoginNotice: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  loginNotice: false,
  dismissLoginNotice: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginNotice, setLoginNotice] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("volunteer-password-recovery", "true");
          setLoginNotice(false);
          if (window.location.pathname !== "/reset-password") window.location.replace(`${window.location.origin}/reset-password${window.location.search}${window.location.hash}`);
        } else if (event === "SIGNED_IN" && window.location.pathname === "/auth") {
          sessionStorage.removeItem("volunteer-password-recovery");
          setLoginNotice(true);
        } else if (event === "SIGNED_OUT") {
          setLoginNotice(false);
          sessionStorage.removeItem("volunteer-password-recovery");
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      if (user) fetchProfile(user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, loginNotice, dismissLoginNotice: () => setLoginNotice(false), signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
