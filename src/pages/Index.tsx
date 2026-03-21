import { useState, useEffect, useRef } from "react";
import NavBar from "@/components/NavBar";
import StoreGrid from "@/components/StoreGrid";
import ProfileCompletionModal from "@/components/ProfileCompletionModal";
import VolunteerProfilePanel from "@/components/VolunteerProfilePanel";
import RescueHistorySection from "@/components/RescueHistorySection";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Heart, Clock, ShieldCheck } from "lucide-react";
import heroBread from "@/assets/hero-bread.jpg";
import buzakovaszLogo from "@/assets/buzakovasz-logo.png";
import euSolidarityLogo from "@/assets/eu-solidarity-logo.png";

const Index = () => {
  const { user, profile } = useAuth();
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const hasAutoOpened = useRef(false);

  // Auto-open profile panel on login if user has a profile
  useEffect(() => {
    if (user && profile && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => {
        setProfilePanelOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
    if (!user) {
      hasAutoOpened.current = false;
    }
  }, [user, profile]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar onProfileOpen={() => setProfilePanelOpen(true)} />
      <ProfileCompletionModal />
      <VolunteerProfilePanel
        open={profilePanelOpen}
        onClose={() => setProfilePanelOpen(false)}
      />

      {/* Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img src={heroBread} alt="Búzakovász kenyerek" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{ background: "var(--gradient-hero)" }}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-3 px-4 py-1.5 rounded-full" style={{ background: "hsl(var(--teal) / 0.85)", color: "#fff" }}>
            Kézműves Pékség
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
            Pékáru-mentés
          </h1>
          <p className="text-white/90 max-w-lg text-sm md:text-base" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
            Minden <strong>pénteken 18:00-kor</strong> megmaradó kenyerek és péksütemények önkéntes megmentése a Búzakovász pékségekből.
          </p>
          {!user && (
            <Link to="/auth" className="mt-5 inline-block btn-teal text-sm">
              Csatlakozz önkéntesként!
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 px-4 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: <Clock size={22} />, title: "Minden pénteken 18:00", text: "Az üzletek bezáráskor összegyűjtik a megmaradó pékárut. 18:00-kor kell odaérni." },
            { icon: <Heart size={22} />, title: "Önkéntes bevállalás", text: "Regisztrálj és vállalj be közeli üzleteket – akár rendszeresen! Max. 3 fő pékségenként." },
            { icon: <ShieldCheck size={22} />, title: "Átlátható rendszer", text: "Mindenki látja, melyik üzletből ki vállalja el a mentést." },
          ].map(item => (
            <div key={item.title} className="rounded-2xl p-5 border border-border bg-card text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                {item.icon}
              </div>
              <h3 className="font-bold text-foreground mb-1.5 text-base">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Üzletek &amp; Önkéntesek</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Kattints egy kártyára a bevállaláshoz (bejelentkezés szükséges) · <strong>3 önkéntes</strong> jelentkezhet pékségenként · Állandó mentés minden péntekenre érvényes · <strong>18:00-kor</strong> kell odaérni
          </p>
          <StoreGrid />
        </div>
      </section>

      {/* Rescue History */}
      <RescueHistorySection />

      {/* Footer */}
      <footer className="mt-12 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center mb-6">
            <p className="text-sm text-muted-foreground mb-4 max-w-xl">
              Ez a weboldal a <strong className="text-foreground">Circooler.Solutions</strong> és az <strong className="text-foreground">ÁtalakítóTér</strong> közös kezdeményezése, az <strong className="text-foreground">Európai Szolidaritási Testület</strong> támogatásával.
            </p>
            <img src={euSolidarityLogo} alt="European Solidarity Corps" className="h-14 w-auto mb-4" />
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={buzakovaszLogo} alt="Búzakovász" className="h-10 w-auto" />
              <span className="text-sm text-muted-foreground">Pékáru-mentés koordináció</span>
            </div>
            <a href="https://www.buzakovasz.hu" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              style={{ background: "hsl(var(--teal))", color: "#fff" }}>
              🌐 Búzakovász hivatalos weboldala →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
