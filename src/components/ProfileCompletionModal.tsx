import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ProfileCompletionModal() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ vezeteknev: "", keresztnev: "", telefonszam: "" });
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || profile || dismissed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vezeteknev.trim() || !form.keresztnev.trim() || !form.telefonszam.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      vezeteknev: form.vezeteknev.trim(),
      keresztnev: form.keresztnev.trim(),
      telefonszam: form.telefonszam.trim(),
    }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profil mentve! 🎉", description: "Köszönjük, most már mindenki látja a neved." });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-foreground mb-1">👋 Kérjük, egészítsd ki a profilod!</h3>
        <p className="text-sm text-muted-foreground mb-5">
          A neved és telefonszámod szükséges, hogy az üzletek és más önkéntesek elérjenek téged.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vezetéknév</label>
              <input name="vezeteknev" required value={form.vezeteknev} onChange={(e) => setForm({ ...form, vezeteknev: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="Kovács" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Keresztnév</label>
              <input name="keresztnev" required value={form.keresztnev} onChange={(e) => setForm({ ...form, keresztnev: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="Anna" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Telefonszám</label>
            <input name="telefonszam" required value={form.telefonszam} onChange={(e) => setForm({ ...form, telefonszam: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="+36 20 123 4567" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setDismissed(true)} className="btn-outline-teal flex-1 text-sm py-2.5">Később</button>
            <button type="submit" disabled={loading} className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60">
              {loading ? "Mentés..." : "Mentés"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
