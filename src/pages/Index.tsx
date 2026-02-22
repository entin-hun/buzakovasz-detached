import { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import StoreGrid from "@/components/StoreGrid";
import ProfileCompletionModal from "@/components/ProfileCompletionModal";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Heart, Clock, ShieldCheck, Camera, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroBread from "@/assets/hero-bread.jpg";
import buzakovaszLogo from "@/assets/buzakovasz-logo.png";
import euSolidarityLogo from "@/assets/eu-solidarity-logo.png";

interface HistoryEntry {
  id: string;
  user_id: string;
  store_id: string;
  het_datuma: string;
  tipus: string;
  megmentett_kg: number | null;
  image_url: string | null;
  created_at: string;
  profiles?: { vezeteknev: string; keresztnev: string; telefonszam: string } | null;
  stores?: { nev: string } | null;
}

const Index = () => {
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editingKg, setEditingKg] = useState<string | null>(null);
  const [kgValue, setKgValue] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    const channel = supabase
      .channel("history-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "rescue_history" }, fetchHistory)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    const [historyRes, profilesRes, storesRes] = await Promise.all([
      supabase.from("rescue_history").select("*").order("het_datuma", { ascending: false }),
      supabase.from("profiles").select("user_id, vezeteknev, keresztnev, telefonszam"),
      supabase.from("stores").select("id, nev"),
    ]);

    const profileMap: Record<string, { vezeteknev: string; keresztnev: string; telefonszam: string }> = {};
    (profilesRes.data ?? []).forEach((p) => { profileMap[p.user_id] = p; });

    const storeMap: Record<string, { nev: string }> = {};
    (storesRes.data ?? []).forEach((s) => { storeMap[s.id] = s; });

    const enriched = (historyRes.data ?? []).map((h: any) => ({
      ...h,
      profiles: profileMap[h.user_id] ?? null,
      stores: storeMap[h.store_id] ?? null,
    }));

    setHistory(enriched);
  };

  const handleSaveKg = async (historyId: string) => {
    const kg = parseFloat(kgValue);
    if (isNaN(kg) || kg < 0) return;
    await supabase.from("rescue_history").update({ megmentett_kg: kg }).eq("id", historyId);
    setEditingKg(null);
    setKgValue("");
    fetchHistory();
  };

  const handlePhotoUpload = async (historyId: string, file: File) => {
    if (!user) return;
    setUploadingPhoto(historyId);
    const path = `${user.id}/${historyId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (uploadError) {
      setUploadingPhoto(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);
    await supabase.from("rescue_history").update({ image_url: urlData.publicUrl }).eq("id", historyId);
    setUploadingPhoto(null);
    fetchHistory();
  };

  const totalKg = history.reduce((sum, h) => sum + (h.megmentett_kg ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <ProfileCompletionModal />

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
            { icon: <Heart size={22} />, title: "Önkéntes bevállalás", text: "Regisztrálj és vállalj be max. 3 üzletet – akár rendszeresen!" },
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
            Kattints egy kártyára a bevállaláshoz (bejelentkezés szükséges) · Állandó mentés minden péntekenre érvényes · <strong>18:00-kor</strong> kell odaérni · Max. 3 helyszín/önkéntes
          </p>
          <StoreGrid />
        </div>
      </section>

      {/* Rescue History */}
      <section className="px-4 max-w-6xl mx-auto pb-10">
        <h2 className="text-2xl font-bold text-foreground mb-2">📊 Mentéstörténet</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Korábbi heti mentések összesítése. Összesen megmentett pékáru: <strong className="text-foreground">{totalKg.toFixed(1)} kg</strong>
        </p>
        {history.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                  <th className="text-left px-4 py-3 font-semibold">Hét</th>
                  <th className="text-left px-4 py-3 font-semibold">Üzlet</th>
                  <th className="text-left px-4 py-3 font-semibold">Önkéntes</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Telefon</th>
                  <th className="text-left px-4 py-3 font-semibold">Típus</th>
                  <th className="text-left px-4 py-3 font-semibold">kg</th>
                  <th className="text-left px-4 py-3 font-semibold">Fotó</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{h.het_datuma}</td>
                    <td className="px-4 py-3">{h.stores?.nev?.replace("Búzakovász – ", "") ?? "–"}</td>
                    <td className="px-4 py-3 font-medium">
                      {h.profiles ? `${h.profiles.vezeteknev} ${h.profiles.keresztnev}` : "–"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {h.profiles?.telefonszam ?? "–"}
                    </td>
                    <td className="px-4 py-3">
                      {h.tipus === "allandó" ? (
                        <span className="badge-taken">Állandó</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">Egyszeri</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user && h.user_id === user.id && !h.megmentett_kg ? (
                        editingKg === h.id ? (
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.1" min="0" value={kgValue} onChange={(e) => setKgValue(e.target.value)}
                              className="w-20 px-2 py-1 rounded border border-border bg-background text-foreground text-sm" placeholder="kg" />
                            <button onClick={() => handleSaveKg(h.id)} className="btn-teal text-xs px-2 py-1">✓</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingKg(h.id); setKgValue(""); }} className="btn-outline-teal text-xs px-3 py-1">Megadás</button>
                        )
                      ) : (
                        <span className={h.megmentett_kg ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {h.megmentett_kg ? `${h.megmentett_kg} kg` : "–"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {h.image_url ? (
                        <button onClick={() => setSelectedImage(h.image_url)} className="flex items-center gap-1 text-primary hover:underline text-xs">
                          <Camera size={12} /> Megtekintés
                        </button>
                      ) : user && h.user_id === user.id ? (
                        <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Camera size={12} /> {uploadingPhoto === h.id ? "Feltöltés..." : "Fotó"}
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === h.id}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(h.id, f); }} />
                        </label>
                      ) : (
                        <span className="text-muted-foreground text-xs">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
            Még nincs mentéstörténet. A rendszer minden pénteken 20:00-kor archiválja a heti mentéseket.
          </div>
        )}
      </section>

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Mentés fotó" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
        </div>
      )}

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
