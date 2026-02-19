import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";

export default function NavBar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="w-full bg-card border-b border-border sticky top-0 z-50" style={{ boxShadow: "0 1px 8px hsl(30 25% 15% / 0.08)" }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
            🌾
          </div>
          <div>
            <div className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem" }}>
              Búzakovász
            </div>
            <div className="text-xs text-muted-foreground leading-tight">Pékáru-mentés</div>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User size={16} className="text-primary" />
                <span>{profile ? `${profile.keresztnev}` : user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-outline-teal flex items-center gap-2 text-sm px-4 py-2"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Kilépés</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-teal text-sm px-5 py-2">
              Bejelentkezés
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
