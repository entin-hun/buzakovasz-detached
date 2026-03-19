import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, X } from "lucide-react";

interface PendingEntry {
  id: string;
  het_datuma: string;
  store_name: string;
  megmentett_kg: number | null;
  image_url: string | null;
}

export default function RescueDataModal() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [kgValues, setKgValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    fetchPending();
  }, [user, profile]);

  const fetchPending = async () => {
    if (!user) return;
    // Get user's rescue_history entries that are missing kg OR missing photo
    const { data } = await supabase
      .from("rescue_history")
      .select("id, het_datuma, store_id, megmentett_kg, image_url")
      .eq("user_id", user.id)
      .or("megmentett_kg.is.null,image_url.is.null")
      .order("het_datuma", { ascending: false })
      .limit(20);

    if (!data || data.length === 0) {
      setChecked(true);
      return;
    }

    // Get store names
    const storeIds = [...new Set(data.map((d) => d.store_id))];
    const { data: stores } = await supabase
      .from("stores")
      .select("id, nev")
      .in("id", storeIds);

    const storeMap: Record<string, string> = {};
    (stores ?? []).forEach((s) => { storeMap[s.id] = s.nev; });

    const mapped = data.map((d) => ({
      id: d.id,
      het_datuma: d.het_datuma,
      store_name: storeMap[d.store_id]?.replace("Búzakovász – ", "") ?? "–",
      megmentett_kg: d.megmentett_kg,
      image_url: d.image_url,
    }));

    setEntries(mapped);
    // Pre-fill existing kg values
    const existing: Record<string, string> = {};
    mapped.forEach((e) => {
      if (e.megmentett_kg != null) existing[e.id] = String(e.megmentett_kg);
    });
    setKgValues(existing);
    setChecked(true);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    for (const entry of entries) {
      const raw = kgValues[entry.id];
      if (raw !== undefined && raw !== "") {
        const kg = parseFloat(raw);
        if (!isNaN(kg) && kg >= 0) {
          await supabase.from("rescue_history").update({ megmentett_kg: kg }).eq("id", entry.id);
        }
      }
    }
    toast({ title: "Mentés sikeres! 📊", description: "Köszönjük az adatokat!" });
    setLoading(false);
    setDismissed(true);
  };

  const handlePhotoUpload = async (entryId: string, file: File) => {
    if (!user) return;
    setUploading(entryId);
    const path = `${user.id}/${entryId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("rescue-photos").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("rescue-photos").getPublicUrl(path);
      await supabase.from("rescue_history").update({ image_url: urlData.publicUrl }).eq("id", entryId);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, image_url: urlData.publicUrl } : e))
      );
      toast({ title: "Fotó feltöltve! 📸" });
    } else {
      toast({ title: "Hiba a feltöltésnél", description: error.message, variant: "destructive" });
    }
    setUploading(null);
  };

  if (!user || !profile || dismissed || !checked || entries.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => setDismissed(true)}
    >
      <div
        className="bg-card rounded-3xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto relative"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => setDismissed(true)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-foreground mb-1">📊 Korábbi mentések adatai</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Kérjük, add meg a megmentett mennyiséget és tölts fel fotót a korábbi mentéseiddel! Ezek megjelennek a nyilvános mentéstörténetben.
        </p>

        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{entry.store_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.het_datuma}</p>
                </div>
                {entry.image_url && (
                  <img src={entry.image_url} alt="Mentés fotó" className="w-12 h-12 rounded-lg object-cover border border-border" />
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

        <div className="flex gap-3 pt-5">
          <button type="button" onClick={() => setDismissed(true)} className="btn-outline-teal flex-1 text-sm py-2.5">
            Később
          </button>
          <button onClick={handleSaveAll} disabled={loading} className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60">
            {loading ? "Mentés..." : "Mentés 📊"}
          </button>
        </div>
      </div>
    </div>
  );
}
