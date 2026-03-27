import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, Pencil, X, Check, Lock } from "lucide-react";

interface RawHistoryEntry {
  id: string;
  user_id: string;
  store_id: string;
  het_datuma: string;
  tipus: string;
  megmentett_kg: number | null;
  image_url: string | null;
  created_at: string;
}

interface GroupedEntry {
  key: string;
  het_datuma: string;
  store_id: string;
  store_name: string;
  entries: {
    id: string;
    user_id: string;
    tipus: string;
    megmentett_kg: number | null;
    image_url: string | null;
    volunteer_name: string;
    volunteer_phone: string;
  }[];
}

const EDIT_PASSWORD = "mentesmodositas";

interface RescueHistorySectionProps {
  onOpenProfile?: () => void;
}

export default function RescueHistorySection({ onOpenProfile }: RescueHistorySectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grouped, setGrouped] = useState<GroupedEntry[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editKg, setEditKg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockedRows, setUnlockedRows] = useState<Set<string>>(new Set());
  const [rawEntries, setRawEntries] = useState<RawHistoryEntry[]>([]);

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

    const storeMap: Record<string, string> = {};
    (storesRes.data ?? []).forEach((s) => { storeMap[s.id] = s.nev; });

    const raw = historyRes.data ?? [];
    setRawEntries(raw as RawHistoryEntry[]);

    // Group by het_datuma + store_id
    const groupMap = new Map<string, GroupedEntry>();
    raw.forEach((h: any) => {
      const key = `${h.het_datuma}-${h.store_id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          het_datuma: h.het_datuma,
          store_id: h.store_id,
          store_name: storeMap[h.store_id]?.replace("Búzakovász – ", "") ?? "–",
          entries: [],
        });
      }
      const prof = profileMap[h.user_id];
      groupMap.get(key)!.entries.push({
        id: h.id,
        user_id: h.user_id,
        tipus: h.tipus,
        megmentett_kg: h.megmentett_kg,
        image_url: h.image_url,
        volunteer_name: prof ? `${prof.vezeteknev} ${prof.keresztnev}` : "–",
        volunteer_phone: prof?.telefonszam ?? "",
      });
    });

    // Sort groups by date desc
    const groups = Array.from(groupMap.values()).sort((a, b) =>
      b.het_datuma.localeCompare(a.het_datuma)
    );
    setGrouped(groups);
  };

  const canEditEntry = (entryUserId: string, entryId: string) => {
    if (user && entryUserId === user.id) return true;
    if (unlockedRows.has(entryId)) return true;
    return false;
  };

  const handleEditClick = (entryId: string, entryUserId: string) => {
    // If it's the user's own entry, open the profile panel popup
    if (user && entryUserId === user.id && onOpenProfile) {
      onOpenProfile();
      return;
    }
    if (canEditEntry(entryUserId, entryId)) {
      setEditingRow(entryId);
      const entry = rawEntries.find((e) => e.id === entryId);
      setEditKg(entry?.megmentett_kg != null ? String(entry.megmentett_kg) : "");
    } else {
      setPasswordPrompt(entryId);
      setPasswordInput("");
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === EDIT_PASSWORD) {
      setUnlockedRows((prev) => new Set(prev).add(passwordPrompt!));
      setEditingRow(passwordPrompt);
      const entry = rawEntries.find((e) => e.id === passwordPrompt);
      setEditKg(entry?.megmentett_kg != null ? String(entry.megmentett_kg) : "");
      setPasswordPrompt(null);
      setPasswordInput("");
    } else {
      toast({ title: "Hibás jelszó", variant: "destructive" });
    }
  };

  const handleSaveKg = async (entryId: string) => {
    const kg = parseFloat(editKg);
    if (isNaN(kg) || kg < 0) return;
    const entry = rawEntries.find((e) => e.id === entryId);
    if (!entry) return;

    if (user && entry.user_id === user.id) {
      await supabase.from("rescue_history").update({ megmentett_kg: kg }).eq("id", entryId);
    } else if (unlockedRows.has(entryId)) {
      const res = await supabase.functions.invoke("update-rescue-entry", {
        body: { entryId, megmentett_kg: kg, password: EDIT_PASSWORD },
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

  const handlePhotoUpload = async (entryId: string, file: File) => {
    const entry = rawEntries.find((e) => e.id === entryId);
    if (!entry) return;
    setUploadingPhoto(entryId);

    const userId = user?.id ?? "anonymous";
    const path = `${userId}/${entryId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (uploadError) {
      toast({ title: "Feltöltési hiba", description: uploadError.message, variant: "destructive" });
      setUploadingPhoto(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);

    if (user && entry.user_id === user.id) {
      await supabase.from("rescue_history").update({ image_url: urlData.publicUrl }).eq("id", entryId);
    } else if (unlockedRows.has(entryId)) {
      await supabase.functions.invoke("update-rescue-entry", {
        body: { entryId, image_url: urlData.publicUrl, password: EDIT_PASSWORD },
      });
    }
    toast({ title: "Fotó feltöltve! 📸" });
    setUploadingPhoto(null);
    fetchHistory();
  };

  const totalKg = rawEntries.reduce((sum, h) => sum + (h.megmentett_kg ?? 0), 0);

  return (
    <section className="px-4 max-w-6xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-foreground mb-2">📊 Mentéstörténet</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Korábbi heti mentések összesítése. Összesen megmentett pékáru: <strong className="text-foreground">{totalKg.toFixed(1)} kg</strong>
        {" · "}
        <span className="text-xs">A <Pencil size={10} className="inline" /> ikonra kattintva szerkesztheted a mentéseidet.</span>
      </p>

      {grouped.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                <th className="text-left px-4 py-3 font-semibold">Hét</th>
                <th className="text-left px-4 py-3 font-semibold">Üzlet</th>
                <th className="text-left px-4 py-3 font-semibold">Önkéntes(ek)</th>
                <th className="text-left px-4 py-3 font-semibold">Típus</th>
                <th className="text-left px-4 py-3 font-semibold">kg</th>
                <th className="text-left px-4 py-3 font-semibold">Fotó</th>
                <th className="text-left px-4 py-3 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {grouped.map((group) => (
                group.entries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                    {idx === 0 && (
                      <>
                        <td className="px-4 py-3 font-medium" rowSpan={group.entries.length}>{group.het_datuma}</td>
                        <td className="px-4 py-3" rowSpan={group.entries.length}>{group.store_name}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <span className="font-medium">{entry.volunteer_name}</span>
                      {entry.volunteer_phone && (
                        <a href={`tel:${entry.volunteer_phone}`} className="block text-xs text-muted-foreground hover:text-primary transition-colors">
                          {entry.volunteer_phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.tipus === "allandó" ? (
                        <span className="badge-taken">Állandó</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">Egyszeri</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingRow === entry.id ? (
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
                          <button onClick={() => handleSaveKg(entry.id)} className="text-primary hover:opacity-70">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingRow(null)} className="text-muted-foreground hover:opacity-70">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={entry.megmentett_kg ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {entry.megmentett_kg ? `${entry.megmentett_kg} kg` : "–"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.image_url ? (
                        <button onClick={() => setSelectedImage(entry.image_url)} className="flex-shrink-0">
                          <img src={entry.image_url} alt="Mentés fotó" className="w-10 h-10 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                        </button>
                      ) : editingRow === entry.id || canEditEntry(entry.user_id, entry.id) ? (
                        <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Camera size={12} /> {uploadingPhoto === entry.id ? "..." : "Fotó"}
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === entry.id}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(entry.id, f); }} />
                        </label>
                      ) : (
                        <span className="text-muted-foreground text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEditClick(entry.id, entry.user_id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Szerkesztés"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
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
