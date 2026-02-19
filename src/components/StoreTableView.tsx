import { useState } from "react";
import { Phone, MapPin, CheckCircle2, Clock, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import CommitModal from "./CommitModal";

interface Store {
  id: string;
  nev: string;
  cim: string;
  kerület: string | null;
  telefon?: string | null;
  tipus: string;
}

interface Commitment {
  id: string;
  user_id: string;
  store_id: string;
  tipus: string;
  datum: string | null;
  aktiv: boolean;
  profiles: { keresztnev: string; telefonszam: string } | null;
}

interface Props {
  stores: Store[];
  commitments: Commitment[];
  onRefresh: () => void;
  filterAvailable: boolean;
  filterDate: string;
}

export default function StoreTableView({ stores, commitments, onRefresh, filterAvailable, filterDate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commitStore, setCommitStore] = useState<Store | null>(null);

  const bakeries = stores.filter((s) => s.tipus === "pekseg");

  const filteredStores = bakeries.filter((store) => {
    const storeCommitments = commitments.filter((c) => c.store_id === store.id && c.aktiv);
    const hasPermanent = storeCommitments.some((c) => c.tipus === "allandó");

    if (filterAvailable && hasPermanent) return false;

    if (filterDate) {
      const hasForDate = storeCommitments.some(
        (c) => c.tipus === "allandó" || c.datum === filterDate
      );
      if (hasForDate) return false;
    }

    return true;
  });

  const displayStores = filterAvailable || filterDate ? filteredStores : bakeries;

  const handleCancel = async (commitmentId: string) => {
    const { error } = await supabase.from("rescue_commitments").delete().eq("id", commitmentId);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lemondtad a mentést" });
      onRefresh();
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "hsl(var(--teal-light))", color: "hsl(var(--teal-dark))" }}>
              <th className="text-left px-4 py-3 font-semibold">Üzlet</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Cím</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Telefon</th>
              <th className="text-left px-4 py-3 font-semibold">Állapot</th>
              <th className="text-left px-4 py-3 font-semibold">Önkéntesek</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {displayStores.map((store) => {
              const storeCommitments = commitments.filter((c) => c.store_id === store.id && c.aktiv);
              const hasPermanent = storeCommitments.some((c) => c.tipus === "allandó");
              const myCommitment = user ? storeCommitments.find((c) => c.user_id === user.id) : null;

              return (
                <tr key={store.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{store.nev.replace("Búzakovász – ", "")}</div>
                    {store.kerület && (
                      <div className="text-xs text-primary font-medium">{store.kerület}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin size={11} /> {store.cim}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {store.telefon ? (
                      <a href={`tel:${store.telefon}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                        <Phone size={11} /> {store.telefon}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {hasPermanent ? (
                      <span className="badge-taken">Állandó</span>
                    ) : storeCommitments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">
                        Egyszeri
                      </span>
                    ) : (
                      <span className="badge-free">Szabad</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {storeCommitments.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">–</span>
                      ) : (
                        storeCommitments.slice(0, 2).map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 text-xs">
                            {c.tipus === "allandó" ? (
                              <CheckCircle2 size={11} className="text-primary flex-shrink-0" />
                            ) : (
                              <Clock size={11} style={{ color: "hsl(35 80% 50%)" }} className="flex-shrink-0" />
                            )}
                            <span className="font-medium">
                              {c.profiles?.keresztnev ?? "?"}
                            </span>
                            {c.datum && <span className="text-muted-foreground">({c.datum})</span>}
                            {user && c.user_id === user.id && (
                              <button
                                onClick={() => handleCancel(c.id)}
                                className="text-destructive hover:opacity-70 transition-opacity ml-1"
                                title="Lemondás"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user ? (
                      myCommitment ? (
                        <span className="text-xs text-primary font-medium">✅ Bevállaltad</span>
                      ) : (
                        <button
                          onClick={() => setCommitStore(store)}
                          className="btn-teal text-xs px-3 py-1.5 whitespace-nowrap"
                        >
                          Bevállalok
                        </button>
                      )
                    ) : (
                      <Link to="/auth" className="btn-outline-teal text-xs px-3 py-1.5 whitespace-nowrap">
                        Bejelentkezés
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayStores.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Minden szűrt üzlethez van önkéntes 🎉
          </div>
        )}
      </div>

      {commitStore && (
        <CommitModal
          store={commitStore}
          onClose={() => setCommitStore(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
