import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MapPin, RotateCcw, Calendar } from "lucide-react";
import { upcomingRescueDays, forRescueDay } from "@/lib/rescue-calendar";
import { Button } from "@/components/ui/button";

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

  const fridays = upcomingRescueDays(8);

  useEffect(() => {
    setDatum(fridays[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Check max 3 volunteers per store
    const { data: storeCommitments } = await supabase
      .from("rescue_commitments")
      .select("id, user_id, datum, tipus, aktiv")
      .eq("store_id", store.id)
      .eq("aktiv", true);

    if (forRescueDay(storeCommitments ?? [], tipus === "egyszeri" ? datum : fridays[0]).length >= 3) {
      toast({
        title: "Betelt a hely",
        description: "Ehhez a pékséghez már 3 önkéntes jelentkezett. Válassz másikat!",
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
        description: `${store.nev} – ${tipus === "állandó" ? "Állandó mentés (hetente, ünnepi kivételekkel)" : datum}`,
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
                <Button
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
                    {t === "állandó" ? "Hetente, a mentési napon" : "Csak egyszer"}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {tipus === "egyszeri" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Válassz mentési napot</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {fridays.map((f) => {
                  const d = new Date(f);
                  const label = d.toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "short" });
                  return (
                    <Button
                      key={f}
                      type="button"
                      onClick={() => setDatum(f)}
                      className={`p-2 rounded-xl border text-sm text-left transition-all ${
                        datum === f
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      📅 {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

         <div className="rounded-xl p-3 text-sm space-y-1.5" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
            <p>🕕 <strong>18:00-kor</strong> kell odaérni az üzlethez (bezáráskor).</p>
            <p>🤝 Kérjük, oszd szét minél szélesebb körben – <strong>lehetőleg rászorulókkal is</strong>.</p>
            <p>👥 Pékségenként <strong>max. 3 önkéntes</strong> jelentkezhet – könnyebb közösen menteni!</p>
            <p>🤝 Kérjük, egyeztesd az üzletben dolgozókkal, mikor érsz oda, és tartsd magad hozzá!</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} className="btn-outline-teal flex-1 text-sm py-2.5">
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60"
            >
              {loading ? "Bevállalás..." : "Bevállalom! 🍞"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
