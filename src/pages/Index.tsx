import NavBar from "@/components/NavBar";
import StoreGrid from "@/components/StoreGrid";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Heart, Clock, ShieldCheck } from "lucide-react";
import heroBread from "@/assets/hero-bread.jpg";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={heroBread}
          alt="Búzakovász kenyerek"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{ background: "var(--gradient-hero)" }}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-3 px-4 py-1.5 rounded-full" style={{ background: "hsl(var(--teal) / 0.85)", color: "#fff" }}>
            Kézműves Pékség
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
            Pékáru-mentés
          </h1>
          <p className="text-white/90 max-w-lg text-sm md:text-base" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
            Minden <strong>pénteken 18:30-kor</strong> megmaradó kenyerek és péksütemények önkéntes megmentése a Búzakovász pékségekből.
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
            { icon: <Clock size={22} />, title: "Minden pénteken 18:30", text: "Az üzletek bezárás előtt összegyűjtik a megmaradó pékárut." },
            { icon: <Heart size={22} />, title: "Önkéntes bevállalás", text: "Regisztrálj és vállalj be egy vagy több üzletet – akár rendszeresen!" },
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

        {/* Store grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Üzletek &amp; Önkéntesek</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Kattints egy kártyára a bevállaláshoz (bejelentkezés szükséges) · Állandó mentés minden péntekenre érvényes · <strong>18:00–18:30</strong> között kell odaérni
          </p>
          <StoreGrid />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-border py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🌾</span>
            <span className="font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Búzakovász</span>
            <span>Pékáru-mentés</span>
          </div>
          <a href="https://www.buzakovasz.hu" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            buzakovasz.hu →
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
