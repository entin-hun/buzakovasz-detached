import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import buzakovaszLogo from "@/assets/buzakovasz-logo.png";
import { Button } from "@/components/ui/button";

interface NavBarProps {
  onProfileOpen?: () => void;
}

export default function NavBar({ onProfileOpen }: NavBarProps) {
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
          <img src={buzakovaszLogo} alt="Búzakovász Kézműves Pékség" className="h-10 w-auto" />
          <div>
            <div className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem" }}>
              Pékáru-mentés
            </div>
            <div className="text-xs text-muted-foreground leading-tight">Önkéntes koordináció</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://www.buzakovasz.hu"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}
          >
            🌐 buzakovasz.hu
          </a>

          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm"
                  aria-label="Saját profil megnyitása" title="Saját profil megnyitása"
                  onClick={() => { if (onProfileOpen) onProfileOpen(); else navigate("/"); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <User size={16} className="text-primary" />
                  <span className="hidden sm:inline">{profile ? `${profile.vezeteknev} ${profile.keresztnev}` : user.email}</span>
                </Button>
                <Button variant="outline"
                  aria-label="Kijelentkezés" title="Kijelentkezés"
                  onClick={handleSignOut}
                  className="btn-outline-teal flex items-center gap-2 text-sm px-4 py-2"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Kilépés</span>
                </Button>
              </>
            ) : (
              <Link to="/auth" className="btn-teal text-sm px-5 py-2">
                Bejelentkezés
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
