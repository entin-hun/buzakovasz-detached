import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import NavBar from "@/components/NavBar";

export default function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl border border-border p-8" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {mode === "login" ? "Bejelentkezés" : "Regisztráció"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === "login"
                  ? "Jelentkezz be, hogy pékárut menthess!"
                  : "Csatlakozz az önkéntesek közé!"}
              </p>
            </div>

            {mode === "login" ? (
              <LoginForm onSwitchToRegister={() => setMode("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
