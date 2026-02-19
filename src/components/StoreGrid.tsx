import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Calendar, RotateCcw, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Store {
  id: string;
  nev: string;
  cim: string;
  kerület: string | null;
}

interface Commitment {
  id: string;
  user_id: string;
  store_id: string;
  tipus: string;
  datum: string | null;
  aktiv: boolean;
  profiles: {
    keresztnev: string;
    telefonszam: string;
  } | null;
}

interface CommitModalProps {
  store: Store;
  onClose: () => void;
  onSuccess: () => void;
  existingCommitment?: Commitment | null;
}

function CommitModal({ store, onClose, onSuccess, existingCommitment }: CommitModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipus, setTipus] = useState<"állandó" | "egyszeri">("állandó");
  const [datum, setDatum] = useState("");
  const [loading, setLoading] = useState(false);

  // Next Friday
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
      toast({ title: "Sikeresen bevállaltad! 🍞", description: `${store.nev} – ${tipus === "állandó" ? "Állandó mentés" : datum}` });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-foreground mb-1">{store.nev}</h3>
        <p className="text-sm text-muted-foreground mb-5 flex items-center gap-1">
          <MapPin size={13} /> {store.cim}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Mentés típusa</label>
            <div className="grid grid-cols-2 gap-3">
              {(["állandó", "egyszeri"] as const).map(t => (
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
                onChange={e => setDatum(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          )}

          <div className="rounded-xl p-3 text-sm" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
            🕡 Minden péntek 18:30-kor – az üzlet bezárása után
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline-teal flex-1 text-sm py-2.5">
              Mégse
            </button>
            <button type="submit" disabled={loading} className="btn-teal flex-1 text-sm py-2.5 disabled:opacity-60">
              {loading ? "Bevállalás..." : "Bevállalom! 🍞"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StoreCardProps {
  store: Store;
  commitments: Commitment[];
  myCommitment?: Commitment | null;
  onRefresh: () => void;
}

function StoreCard({ store, commitments, myCommitment, onRefresh }: StoreCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const activeCommitments = commitments.filter(c => c.aktiv);
  const permanentVolunteer = activeCommitments.find(c => c.tipus === "allandó");
  const isCovered = !!permanentVolunteer;

  const handleCancel = async (commitmentId: string) => {
    const { error } = await supabase
      .from("rescue_commitments")
      .delete()
      .eq("id", commitmentId);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lemondtad a mentést", description: store.nev });
      onRefresh();
    }
  };

  return (
    <>
      <div className="store-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-base leading-tight mb-1">{store.nev}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin size={11} />
              {store.kerület && <span className="font-medium text-primary">{store.kerület}</span>}
              {store.kerület && " – "}
              {store.cim}
            </p>
          </div>
          <div className="ml-3">
            {isCovered ? (
              <span className="badge-taken">Foglalt</span>
            ) : (
              <span className="badge-free">Szabad</span>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4 min-h-[3rem]">
          {activeCommitments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Még senki sem vállalta be.</p>
          ) : (
            activeCommitments.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "hsl(var(--muted))" }}>
                <div className="flex items-center gap-2 text-sm">
                  {c.tipus === "allandó" ? (
                    <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                  ) : (
                    <Clock size={14} style={{ color: "hsl(35 80% 50%)" }} className="flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-foreground">
                      {c.profiles?.keresztnev ?? "Ismeretlen"}
                    </span>
                    {c.profiles?.telefonszam && (
                      <span className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                        <Phone size={10} /> {c.profiles.telefonszam}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.tipus === "allandó" ? (
                    <span className="badge-permanent">Állandó</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{c.datum}</span>
                  )}
                  {user && c.user_id === user.id && (
                    <button
                      onClick={() => handleCancel(c.id)}
                      className="text-destructive hover:opacity-70 transition-opacity ml-1"
                      title="Lemondás"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          myCommitment ? (
            <div className="rounded-xl p-3 text-sm text-center" style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
              ✅ Bevállaltad ({myCommitment.tipus === "allandó" ? "állandó" : myCommitment.datum})
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="btn-teal w-full text-sm py-2.5"
            >
              Bevállalom! 🍞
            </button>
          )
        ) : (
          <Link to="/auth" className="btn-outline-teal w-full text-sm py-2.5 text-center block">
            Bejelentkezés a bevállaláshoz
          </Link>
        )}
      </div>

      {showModal && (
        <CommitModal
          store={store}
          onClose={() => setShowModal(false)}
          onSuccess={onRefresh}
          existingCommitment={myCommitment}
        />
      )}
    </>
  );
}

export default function StoreGrid() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [storesRes, commitmentsRes, profilesRes] = await Promise.all([
      supabase.from("stores").select("*").order("nev"),
      supabase.from("rescue_commitments")
        .select("*")
        .eq("aktiv", true)
        .order("created_at"),
      supabase.from("profiles").select("user_id, keresztnev, telefonszam"),
    ]);

    const profileMap: Record<string, { keresztnev: string; telefonszam: string }> = {};
    (profilesRes.data ?? []).forEach(p => { profileMap[p.user_id] = p; });

    if (storesRes.data) setStores(storesRes.data);
    if (commitmentsRes.data) {
      const enriched: Commitment[] = commitmentsRes.data.map(c => ({
        ...c,
        profiles: profileMap[c.user_id] ?? null,
      }));
      setCommitments(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("rescue-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "rescue_commitments" }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="store-card p-5 animate-pulse">
            <div className="h-5 bg-muted rounded-lg mb-2 w-3/4"></div>
            <div className="h-3 bg-muted rounded mb-4 w-1/2"></div>
            <div className="h-10 bg-muted rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  const coveredCount = stores.filter(s =>
    commitments.some(c => c.store_id === s.id && c.aktiv && c.tipus === "allandó")
  ).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(var(--teal))" }}>{stores.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">üzlet</div>
        </div>
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(142 60% 35%)" }}>{coveredCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">lefedett</div>
        </div>
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(35 80% 50%)" }}>{stores.length - coveredCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">szabad</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stores.map(store => {
          const storeCommitments = commitments.filter(c => c.store_id === store.id);
          const myCommitment = user
            ? storeCommitments.find(c => c.user_id === user.id) ?? null
            : null;
          return (
            <StoreCard
              key={store.id}
              store={store}
              commitments={storeCommitments}
              myCommitment={myCommitment}
              onRefresh={fetchData}
            />
          );
        })}
      </div>
    </div>
  );
}
