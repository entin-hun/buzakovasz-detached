import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, Pencil, X, Check, Lock } from "lucide-react";

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

const EDIT_PASSWORD = "mentesmodositas";

export default function RescueHistorySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editKg, setEditKg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockedRows, setUnlockedRows] = useState<Set<string>>(new Set());

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

  const canEdit = (entry: HistoryEntry) => {
    if (user && entry.user_id === user.id) return true;
    if (unlockedRows.has(entry.id)) return true;
    return false;
  };

  const handleEditClick = (entry: HistoryEntry) => {
    if (canEdit(entry)) {
      setEditingRow(entry.id);
      setEditKg(entry.megmentett_kg != null ? String(entry.megmentett_kg) : "");
    } else {
      setPasswordPrompt(entry.id);
      setPasswordInput("");
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === EDIT_PASSWORD) {
      setUnlockedRows((prev) => new Set(prev).add(passwordPrompt!));
      setEditingRow(passwordPrompt);
      const entry = history.find((h) => h.id === passwordPrompt);
      setEditKg(entry?.megmentett_kg != null ? String(entry.megmentett_kg) : "");
      setPasswordPrompt(null);
      setPasswordInput("");
    } else {
      toast({ title: "Hibás jelszó", variant: "destructive" });
    }
  };

  const handleSaveKg = async (historyId: string) => {
    const kg = parseFloat(editKg);
    if (isNaN(kg) || kg < 0) return;
    // Use service role via RPC or direct update (owner) or password-unlocked
    const entry = history.find((h) => h.id === historyId);
    if (!entry) return;

    if (user && entry.user_id === user.id) {
      await supabase.from("rescue_history").update({ megmentett_kg: kg }).eq("id", historyId);
    } else if (unlockedRows.has(historyId)) {
      // For password-unlocked edits, we need a different approach since RLS restricts updates
      // We'll use an edge function for this
      const res = await supabase.functions.invoke("update-rescue-entry", {
        body: { entryId: historyId, megmentett_kg: kg, password: EDIT_PASSWORD },
      });
      if (res.error) {
        toast({ title: "Hiba", description: "Nem sikerült menteni", variant: "destructive" });
        setEditingRow(null);
        return;
      }
    }
    toast({ title: "Mentve! ✓" });
    setEditingRow(null);
    setEditKg("");
    fetchHistory();
  };

  const handlePhotoUpload = async (historyId: string, file: File) => {
    const entry = history.find((h) => h.id === historyId);
    if (!entry) return;
    setUploadingPhoto(historyId);

    const userId = user?.id ?? "anonymous";
    const path = `${userId}/${historyId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (uploadError) {
      toast({ title: "Feltöltési hiba", description: uploadError.message, variant: "destructive" });
      setUploadingPhoto(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);

    if (user && entry.user_id === user.id) {
      await supabase.from("rescue_history").update({ image_url: urlData.publicUrl }).eq("id", historyId);
    } else if (unlockedRows.has(historyId)) {
      await supabase.functions.invoke("update-rescue-entry", {
        body: { entryId: historyId, image_url: urlData.publicUrl, password: EDIT_PASSWORD },
      });
    }
    toast({ title: "Fotó feltöltve! 📸" });
    setUploadingPhoto(null);
    fetchHistory();
  };

  const totalKg = history.reduce((sum, h) => sum + (h.megmentett_kg ?? 0), 0);

  return (
    <section className="px-4 max-w-6xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-foreground mb-2">📊 Mentéstörténet</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Korábbi heti mentések összesítése. Összesen megmentett pékáru: <strong className="text-foreground">{totalKg.toFixed(1)} kg</strong>
        {" · "}
        <span className="text-xs">A <Pencil size={10} className="inline" /> ikonra kattintva szerkesztheted a saját mentéseidet.</span>
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
                <th className="text-left px-4 py-3 font-semibold w-10"></th>
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
                    {h.profiles?.telefonszam ? (
                      <a href={`tel:${h.profiles.telefonszam}`} className="hover:text-primary transition-colors">{h.profiles.telefonszam}</a>
                    ) : "–"}
                  </td>
                  <td className="px-4 py-3">
                    {h.tipus === "allandó" ? (
                      <span className="badge-taken">Állandó</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">Egyszeri</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingRow === h.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editKg}
                          onChange={(e) => setEditKg(e.target.value)}
                          className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                          placeholder="kg"
                          autoFocus
                        />
                        <button onClick={() => handleSaveKg(h.id)} className="text-primary hover:opacity-70">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingRow(null)} className="text-muted-foreground hover:opacity-70">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className={h.megmentett_kg ? "font-bold text-foreground" : "text-muted-foreground"}>
                        {h.megmentett_kg ? `${h.megmentett_kg} kg` : "–"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {h.image_url ? (
                      <button onClick={() => setSelectedImage(h.image_url)} className="flex-shrink-0">
                        <img src={h.image_url} alt="Mentés fotó" className="w-10 h-10 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                      </button>
                    ) : editingRow === h.id || canEdit(h) ? (
                      <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Camera size={12} /> {uploadingPhoto === h.id ? "..." : "Fotó"}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === h.id}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(h.id, f); }} />
                      </label>
                    ) : (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEditClick(h)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Szerkesztés"
                    >
                      <Pencil size={14} />
                    </button>
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

      {/* Password prompt modal */}
      {passwordPrompt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setPasswordPrompt(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">Szerkesztés jelszóval</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ez nem a te mentésed. A szerkesztéshez add meg a közös jelszót:
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              placeholder="Jelszó"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setPasswordPrompt(null)} className="btn-outline-teal flex-1 text-sm py-2">Mégse</button>
              <button onClick={handlePasswordSubmit} className="btn-teal flex-1 text-sm py-2">Belépés</button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Mentés fotó" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
        </div>
      )}
    </section>
  );
}
