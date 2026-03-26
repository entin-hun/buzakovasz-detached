import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, User, Calendar, Package, Phone, Check } from "lucide-react";

interface HistoryEntry {
  id: string;
  user_id: string;
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
}

export default function VolunteerProfilePanel({ open, onClose }: VolunteerProfilePanelProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commitments, setCommitments] = useState<FutureCommitment[]>([]);
  const [kgValues, setKgValues] = useState<Record<string, string>>({});
  const [editingKg, setEditingKg] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch ALL rescue_history, then filter client-side by user_id
    // This ensures we get records even if they were recently consolidated
    const [historyRes, commitmentsRes, storesRes] = await Promise.all([
      supabase
        .from("rescue_history")
        .select("*")
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

    const hist: HistoryEntry[] = (historyRes.data ?? []).map((h: any) => ({
      ...h,
      store_name: storeMap[h.store_id] ?? "–",
    }));
    setHistory(hist);

    const kgs: Record<string, string> = {};
    hist.forEach((h) => {
      if (h.megmentett_kg != null) kgs[h.id] = String(h.megmentett_kg);
    });
    setKgValues(kgs);

    const comms: FutureCommitment[] = (commitmentsRes.data ?? []).map((c: any) => ({
      ...c,
      store_name: storeMap[c.store_id] ?? "–",
    }));
    setCommitments(comms);
    setLoading(false);
  };

  const handleSaveKg = async (entryId: string) => {
    const raw = kgValues[entryId];
    if (raw === undefined || raw === "") return;
    const kg = parseFloat(raw);
    if (isNaN(kg) || kg < 0) return;

    setSaving(entryId);
    const { error } = await supabase
      .from("rescue_history")
      .update({ megmentett_kg: kg })
      .eq("id", entryId);

    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve! ✓" });
      setHistory((prev) =>
        prev.map((h) => (h.id === entryId ? { ...h, megmentett_kg: kg } : h))
      );
    }
    setSaving(null);
    setEditingKg(null);
  };

  const handlePhotoUpload = async (entryId: string, file: File) => {
    if (!user) return;
    setUploading(entryId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${entryId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (error) {
      toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("rescue_history")
      .update({ image_url: publicUrl })
      .eq("id", entryId);

    if (updateError) {
      toast({ title: "Hiba", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Fotó feltöltve! 📸" });
      setHistory((prev) =>
        prev.map((h) => (h.id === entryId ? { ...h, image_url: publicUrl } : h))
      );
    }
    setUploading(null);
  };

  if (!open || !user || !profile) return null;

  const pendingCount = history.filter((h) => !h.megmentett_kg || !h.image_url).length;

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
                  <Phone size={10} />
                  <a href={`tel:${profile.telefonszam}`} className="hover:text-primary transition-colors">{profile.telefonszam}</a>
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
                📊 {pendingCount} mentésedhez hiányzik még adat (kg vagy fotó) – kérjük, töltsd ki!
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
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                        style={c.tipus === "allandó"
                          ? { background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }
                          : { background: "hsl(210 90% 92%)", color: "hsl(210 80% 40%)" }
                        }
                      >
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
                <Package size={14} className="text-primary" /> Mentéstörténeted
              </h4>
              {loading ? (
                <p className="text-sm text-muted-foreground">Betöltés...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincs mentéstörténeted. Ha már mentettél, de nem látod itt, kérjük jelezd!</p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => {
                    const hasPending = !entry.megmentett_kg || !entry.image_url;
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-xl border p-4 space-y-3 ${hasPending ? "border-primary/40 bg-primary/5" : "border-border"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{entry.store_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.het_datuma} · {entry.tipus === "allandó" ? "Állandó" : "Egyszeri"}
                            </p>
                          </div>
                          {entry.image_url && (
                            <button onClick={() => setSelectedImage(entry.image_url)}>
                              <img
                                src={entry.image_url}
                                alt="Mentés"
                                className="w-14 h-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            </button>
                          )}
                        </div>

                        {/* kg editing */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            {editingKg === entry.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Becsült kg"
                                  value={kgValues[entry.id] ?? ""}
                                  onChange={(e) => setKgValues({ ...kgValues, [entry.id]: e.target.value })}
                                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveKg(entry.id)}
                                  disabled={saving === entry.id}
                                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                                  style={{ background: "hsl(var(--teal))", color: "#fff" }}
                                >
                                  {saving === entry.id ? "..." : <Check size={16} />}
                                </button>
                                <button
                                  onClick={() => setEditingKg(null)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingKg(entry.id);
                                  if (entry.megmentett_kg != null) {
                                    setKgValues({ ...kgValues, [entry.id]: String(entry.megmentett_kg) });
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                                  entry.megmentett_kg
                                    ? "border-border bg-muted/30 text-foreground hover:bg-muted/50"
                                    : "border-dashed border-primary/40 text-muted-foreground hover:bg-primary/5"
                                }`}
                              >
                                {entry.megmentett_kg ? `${entry.megmentett_kg} kg ✏️` : "📊 Kattints a kg megadásához"}
                              </button>
                            )}
                          </div>

                          {/* Photo upload */}
                          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0"
                            style={!entry.image_url
                              ? { borderColor: "hsl(var(--teal) / 0.4)", color: "hsl(var(--teal-dark))", background: "hsl(var(--teal-light))" }
                              : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
                            }
                          >
                            <Camera size={14} />
                            {uploading === entry.id ? "..." : entry.image_url ? "Csere" : "📷 Fotó"}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-card rounded-b-3xl border-t border-border px-6 py-4">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "hsl(var(--teal))", color: "#fff" }}>
              Bezárás
            </button>
          </div>
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
