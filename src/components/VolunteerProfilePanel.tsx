import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, User, Calendar, Package, Phone, Mail } from "lucide-react";

interface HistoryEntry {
  id: string;
  store_id: string;
  het_datuma: string;
  tipus: string;
  megmentett_kg: number | null;
  image_url: string | null;
  store_name: string;
}

interface FutureCommitment {
  id: string;
  store_id: string;
  tipus: string;
  datum: string | null;
  store_name: string;
}

interface VolunteerProfilePanelProps {
  open: boolean;
  onClose: () => void;
  /** If true, highlights the data-entry section */
  promptMode?: boolean;
}

export default function VolunteerProfilePanel({ open, onClose, promptMode = false }: VolunteerProfilePanelProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commitments, setCommitments] = useState<FutureCommitment[]>([]);
  const [kgValues, setKgValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;

    const [historyRes, commitmentsRes, storesRes] = await Promise.all([
      supabase
        .from("rescue_history")
        .select("id, store_id, het_datuma, tipus, megmentett_kg, image_url")
        .eq("user_id", user.id)
        .order("het_datuma", { ascending: false }),
      supabase
        .from("rescue_commitments")
        .select("id, store_id, tipus, datum")
        .eq("user_id", user.id)
        .eq("aktiv", true),
      supabase.from("stores").select("id, nev"),
    ]);

    const storeMap: Record<string, string> = {};
    (storesRes.data ?? []).forEach((s) => {
      storeMap[s.id] = s.nev.replace("Búzakovász – ", "");
    });

    const hist = (historyRes.data ?? []).map((h) => ({
      ...h,
      store_name: storeMap[h.store_id] ?? "–",
    }));
    setHistory(hist);

    // Pre-fill kg values
    const kgs: Record<string, string> = {};
    hist.forEach((h) => {
      if (h.megmentett_kg != null) kgs[h.id] = String(h.megmentett_kg);
    });
    setKgValues(kgs);

    const comms = (commitmentsRes.data ?? []).map((c) => ({
      ...c,
      store_name: storeMap[c.store_id] ?? "–",
    }));
    setCommitments(comms);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const entry of history) {
      const raw = kgValues[entry.id];
      if (raw !== undefined && raw !== "") {
        const kg = parseFloat(raw);
        if (!isNaN(kg) && kg >= 0 && kg !== entry.megmentett_kg) {
          await supabase.from("rescue_history").update({ megmentett_kg: kg }).eq("id", entry.id);
        }
      }
    }
    toast({ title: "Mentés sikeres! ✓" });
    setSaving(false);
    fetchData();
  };

  const handlePhotoUpload = async (entryId: string, file: File) => {
    if (!user) return;
    setUploading(entryId);
    const path = `${user.id}/${entryId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (error) {
      toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);
    await supabase.from("rescue_history").update({ image_url: urlData.publicUrl }).eq("id", entryId);
    toast({ title: "Fotó feltöltve! 📸" });
    setUploading(null);
    fetchData();
  };

  if (!open || !user || !profile) return null;

  const pendingEntries = history.filter((h) => !h.megmentett_kg || !h.image_url);
  const displayEntries = promptMode && pendingEntries.length > 0 ? pendingEntries : history;

  return (
    <>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      >
        <div
          className="bg-card rounded-3xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
          style={{ boxShadow: "var(--shadow-card)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border px-6 pt-5 pb-4 z-10">
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{profile.vezeteknev} {profile.keresztnev}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone size={10} /> {profile.telefonszam}
                </p>
              </div>
            </div>
            {promptMode && pendingEntries.length > 0 && (
              <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                📊 Kérjük, add meg a korábbi mentéseid adatait (kg és fotó)!
              </div>
            )}
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Active commitments */}
            {commitments.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" /> Aktív vállalások
                </h4>
                <div className="space-y-2">
                  {commitments.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.store_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.tipus === "allandó" ? "Állandó (minden péntek)" : `Egyszeri – ${c.datum}`}
                        </p>
                      </div>
                      <span className={c.tipus === "allandó" ? "badge-permanent" : "inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold"}>
                        {c.tipus === "allandó" ? "Állandó" : "Egyszeri"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History / data entry */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Package size={14} className="text-primary" /> Mentéstörténet – adatok feltöltése
              </h4>
              {displayEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincs mentéstörténeted.</p>
              ) : (
                <div className="space-y-3">
                  {displayEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{entry.store_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.het_datuma} · {entry.tipus === "allandó" ? "Állandó" : "Egyszeri"}</p>
                        </div>
                        {entry.image_url && (
                          <button onClick={() => setSelectedImage(entry.image_url)}>
                            <img src={entry.image_url} alt="Mentés" className="w-12 h-12 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Megmentett kg"
                            value={kgValues[entry.id] ?? ""}
                            onChange={(e) => setKgValues({ ...kgValues, [entry.id]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
                          <Camera size={14} />
                          {uploading === entry.id ? "..." : entry.image_url ? "Csere" : "Fotó"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading === entry.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handlePhotoUpload(entry.id, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          {displayEntries.length > 0 && (
            <div className="sticky bottom-0 bg-card rounded-b-3xl border-t border-border px-6 py-4 flex gap-3">
              <button onClick={onClose} className="btn-outline-teal flex-1 text-sm py-2.5">
                {promptMode ? "Később" : "Bezárás"}
              </button>
              <button onClick={handleSaveAll} disabled={saving} className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60">
                {saving ? "Mentés..." : "Mentés 📊"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Mentés fotó" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
        </div>
      )}
    </>
  );
}
