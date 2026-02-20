import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MapPin, RotateCcw, Calendar } from "lucide-react";

interface Store {
  id: string;
  nev: string;
  cim: string;
  kerület: string | null;
}

interface CommitModalProps {
  store: Store;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CommitModal({ store, onClose, onSuccess }: CommitModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipus, setTipus] = useState<"állandó" | "egyszeri">("állandó");
  const [datum, setDatum] = useState("");
  const [loading, setLoading] = useState(false);

  const nextFriday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  })();

  useEffect(() => {
    setDatum(nextFriday);
  }, [nextFriday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Check max 3 locations limit
    const { data: existingCommitments } = await supabase
      .from("rescue_commitments")
      .select("id, store_id")
      .eq("user_id", user.id)
      .eq("aktiv", true);

    const uniqueStores = new Set((existingCommitments ?? []).map(c => c.store_id));
    if (!uniqueStores.has(store.id) && uniqueStores.size >= 3) {
      toast({
        title: "Maximum 3 helyszín",
        description: "Egy önkéntes legfeljebb 3 különböző helyszínt vállalhat be. Előbb mondj le egy másikról!",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      store_id: store.id,
      tipus: tipus === "állandó" ? "allandó" : "egyszeri",
      datum: tipus === "egyszeri" ? datum : null,
      aktiv: true,
    };

    const { error } = await supabase.from("rescue_commitments").insert(payload);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Sikeresen bevállaltad! 🍞",
        description: `${store.nev} – ${tipus === "állandó" ? "Állandó mentés (minden péntek)" : datum}`,
      });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl border border-border p-6 w-full max-w-md"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-foreground mb-1">{store.nev}</h3>
        <p className="text-sm text-muted-foreground mb-5 flex items-center gap-1">
          <MapPin size={13} /> {store.cim}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Mentés típusa</label>
            <div className="grid grid-cols-2 gap-3">
              {(["állandó", "egyszeri"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipus(t)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    tipus === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t === "állandó" ? <RotateCcw size={18} /> : <Calendar size={18} />}
                  {t === "állandó" ? "Állandó" : "Egyszeri"}
                  <span className="text-xs font-normal opacity-70">
                    {t === "állandó" ? "Minden pénteken" : "Csak egyszer"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {tipus === "egyszeri" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Dátum (péntek)</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          )}

          <div className="rounded-xl p-3 text-sm space-y-1.5" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
            <p>🕕 <strong>18:00-kor</strong> kell odaérni az üzlethez (bezáráskor).</p>
            <p>🤝 Kérjük, oszd szét minél szélesebb körben – <strong>lehetőleg rászorulókkal is</strong> (hajléktalan szállók, közösségi hűtők).</p>
            <p>📋 Max. <strong>3 helyszínt</strong> vállalhatsz be egyszerre.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline-teal flex-1 text-sm py-2.5">
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60"
            >
              {loading ? "Bevállalás..." : "Bevállalom! 🍞"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
