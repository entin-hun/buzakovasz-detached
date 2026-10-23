import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, CheckCircle2, Clock, Trash2, LayoutGrid, Map, TableProperties, Filter, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CommitModal from "./CommitModal";
import { currentRescueDay, forRescueDay, isRescueDate } from "@/lib/rescue-calendar";
import RecipientPlaceEditor from "./RecipientPlaceEditor";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Navigation } from "lucide-react";
import { cancelVolunteerCommitment } from "@/lib/volunteer-account";
import StoreTableView from "./StoreTableView";

const StoreMapView = lazy(() => import("./StoreMapView"));

export interface Store {
  id: string;
  nev: string;
  cim: string;
  kerület: string | null;
  lat: number | null;
  lng: number | null;
  telefon: string | null;
  email: string | null;
  tipus: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  store_id: string;
  tipus: string;
  datum: string | null;
  aktiv: boolean;
  profiles: { vezeteknev: string; keresztnev: string; telefonszam: string } | null;
}

const MAX_VOLUNTEERS_PER_STORE = 3;

const relevantCommitments = (items: Commitment[]) => forRescueDay(items);

// ---- StoreCard ----
function StoreCard({ store, commitments, onRefresh }: {
  store: Store;
  commitments: Commitment[];
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const activeCommitments = relevantCommitments(commitments);
  const slotsTaken = activeCommitments.length;
  const isFull = slotsTaken >= MAX_VOLUNTEERS_PER_STORE;

  const handleCancel = async (commitmentId: string) => {
    if (!user) return;
    let error: Error | null = null;
    try { await cancelVolunteerCommitment(user.id, commitmentId); } catch(e) { error = e instanceof Error ? e : new Error("A lemondás nem sikerült."); }
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
            {store.telefon && (
              <a href={`tel:${store.telefon}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-primary transition-colors">
                <Phone size={10} /> {store.telefon}
              </a>
            )}
          </div>
          <div className="ml-3 text-right">
            {isFull ? (
              <span className="badge-taken">Betelt</span>
            ) : slotsTaken > 0 ? (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold">{slotsTaken}/{MAX_VOLUNTEERS_PER_STORE}</span>
            ) : (
              <span className="badge-free">Szabad</span>
            )}
          </div>
        </div>

        {/* Slots indicator */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: MAX_VOLUNTEERS_PER_STORE }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{
                background: i < slotsTaken ? "hsl(var(--teal))" : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>

        <div className="space-y-2 mb-4 min-h-[3rem]">
          {activeCommitments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Még senki sem vállalta be. (Max. {MAX_VOLUNTEERS_PER_STORE} fő jelentkezhet)</p>
          ) : (
            activeCommitments.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "hsl(var(--muted))" }}
              >
                <div className="flex items-center gap-2 text-sm">
                  {c.tipus === "allandó" ? (
                    <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                  ) : (
                    <Clock size={14} style={{ color: "hsl(35 80% 50%)" }} className="flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-foreground">{c.profiles ? `${c.profiles.vezeteknev} ${c.profiles.keresztnev}` : "Ismeretlen"}</span>
                    {c.profiles?.telefonszam && (
                      <a href={`tel:${c.profiles.telefonszam}`} className="text-muted-foreground ml-2 text-xs flex items-center gap-1 hover:text-primary transition-colors">
                        <Phone size={10} /> {c.profiles.telefonszam}
                      </a>
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
                    <Button
                      onClick={() => handleCancel(c.id)}
                      className="text-destructive hover:opacity-70 transition-opacity ml-1"
                      title="Lemondás"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          isFull ? (
            <div className="rounded-xl p-3 text-sm text-center" style={{ background: "hsl(var(--muted))" }}>
              ⛔ Betelt ({MAX_VOLUNTEERS_PER_STORE}/{MAX_VOLUNTEERS_PER_STORE} önkéntes)
            </div>
          ) : (
            <Button onClick={() => setShowModal(true)} className="btn-teal w-full text-sm py-2.5">
              Bevállalom! 🍞 ({slotsTaken}/{MAX_VOLUNTEERS_PER_STORE} hely foglalt)
            </Button>
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
        />
      )}
    </>
  );
}

// ---- Main StoreGrid ----
type ViewMode = "grid" | "map" | "table";

export default function StoreGrid() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [recipientEditor, setRecipientEditor] = useState<Store | "new" | null>(null);

  const fetchData = async () => {
    const [storesRes, commitmentsRes, profilesRes] = await Promise.all([
      supabase.from("stores").select("*").order("tipus").order("nev"),
      supabase.from("rescue_commitments").select("*").eq("aktiv", true).order("created_at"),
      supabase.from("profiles").select("user_id, vezeteknev, keresztnev, telefonszam"),
    ]);

    const profileMap: Record<string, { vezeteknev: string; keresztnev: string; telefonszam: string }> = {};
    (profilesRes.data ?? []).forEach((p) => { profileMap[p.user_id] = p; });

    if (storesRes.data) setStores(storesRes.data as Store[]);
    if (commitmentsRes.data) {
      const enriched: Commitment[] = commitmentsRes.data.map((c) => ({
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
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, fetchData)
      .subscribe();
    const timer = window.setInterval(fetchData, 60000);
    return () => { supabase.removeChannel(channel); window.clearInterval(timer); };
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

  const bakeries = stores.filter((s) => s.tipus === "pekseg");
  const relevantCmts = relevantCommitments(commitments);
  const coveredCount = bakeries.filter((s) =>
    relevantCmts.some((c) => c.store_id === s.id)
  ).length;

  const filteredBakeries = bakeries.filter((store) => {
    const sc = forRescueDay(commitments.filter((c) => c.store_id === store.id), filterDate || currentRescueDay());
    const isCovered = sc.length > 0;
    if (filterAvailable && isCovered) return false;
    if (filterDate) {
      const covered = sc.some((c) => c.tipus === "allandó" || c.datum === filterDate);
      if (covered) return false;
    }
    return true;
  });

  const displayBakeries = filterAvailable || filterDate ? filteredBakeries : bakeries;

  return (
    <div>
      <p className="text-sm font-semibold text-primary mb-4">Következő mentés: {currentRescueDay()} · 18:00</p>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(var(--teal))" }}>{bakeries.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">üzlet</div>
        </div>
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(142 60% 35%)" }}>{coveredCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">lefedett</div>
        </div>
        <div className="rounded-2xl p-4 text-center border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-2xl font-bold" style={{ color: "hsl(35 80% 50%)" }}>{bakeries.length - coveredCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">szabad</div>
        </div>
      </div>

      {/* Toolbar: view toggle + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* View Toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          {([
            { key: "grid", label: "Kártyák", icon: <LayoutGrid size={15} /> },
            { key: "table", label: "Táblázat", icon: <TableProperties size={15} /> },
            { key: "map", label: "Térkép", icon: <Map size={15} /> },
          ] as const).map((v) => (
            <Button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === v.key
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={view === v.key ? { background: "hsl(var(--teal))" } : {}}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </Button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => { setFilterAvailable(!filterAvailable); setFilterDate(""); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              filterAvailable
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/50 bg-card"
            }`}
          >
            <Filter size={13} />
            Csak szabad
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all bg-card",
                filterDate ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"
              )}>
                <CalendarDays size={13} />
                {filterDate ? format(new Date(filterDate + "T12:00:00"), "MMM d. (EEEE)", { locale: hu }) : "Mentési nap"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate ? new Date(filterDate + "T12:00:00") : undefined}
                onSelect={(date) => {
                  if (date) {
                    setFilterDate(format(date, "yyyy-MM-dd"));
                    setFilterAvailable(false);
                  }
                }}
                disabled={(date) => !isRescueDate(format(date, "yyyy-MM-dd")) || format(date, "yyyy-MM-dd") < currentRescueDay()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
            <Button onClick={() => setFilterDate("")} className="text-destructive text-xs hover:opacity-70">✕ Szűrő törlése</Button>
          )}
        </div>

        {(filterAvailable || filterDate) && (
          <span className="text-xs text-muted-foreground">
            {displayBakeries.length} szabad üzlet
          </span>
        )}
      </div>

      {/* Views */}
      {view === "grid" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayBakeries.map((store) => {
            const sc = forRescueDay(commitments.filter((c) => c.store_id === store.id), filterDate || currentRescueDay());
            return (
              <StoreCard
                key={store.id}
                store={store}
                commitments={sc}
                onRefresh={fetchData}
              />
            );
          })}
          {displayBakeries.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              Minden szűrt üzlethez van önkéntes! 🎉
            </div>
          )}
        </div>
      )}

      {view === "table" && (
        <StoreTableView
          stores={stores}
          commitments={commitments}
          onRefresh={fetchData}
          filterAvailable={filterAvailable}
          filterDate={filterDate}
        />
      )}

      {view === "map" && (
        <Suspense fallback={
          <div className="rounded-2xl border border-border flex items-center justify-center text-muted-foreground" style={{ height: "520px" }}>
            Térkép betöltése...
          </div>
        }>
          <StoreMapView
            stores={stores}
            commitments={commitments}
            onRefresh={fetchData}
            filterAvailable={filterAvailable}
            filterDate={filterDate}
          />
        </Suspense>
      )}

      <section className="mt-8 border-t border-border pt-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><h3 className="font-bold text-foreground">Pékáru-befogadó helyek</h3>{user && <Button onClick={() => setRecipientEditor("new")}><Plus />Új befogadóhely</Button>}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{stores.filter(s => s.tipus !== "pekseg").map(place => <article key={place.id} className="border border-border rounded-lg p-4 bg-card space-y-2">
          <div className="flex items-start justify-between gap-2"><h4 className="text-sm font-semibold break-words">{place.nev}</h4>{user && <Button size="icon" variant="ghost" aria-label={`${place.nev} szerkesztése`} title="Hely szerkesztése" onClick={() => setRecipientEditor(place)}><Pencil /></Button>}</div>
          <p className="text-xs text-muted-foreground">{place.cim}</p>{place.telefon ? <a className="text-sm text-primary flex items-center gap-1" href={`tel:${place.telefon}`}><Phone size={14}/>{place.telefon}</a> : <p className="text-xs text-muted-foreground">Telefonszám még nem ellenőrzött</p>}
          <Button asChild size="sm" variant="outline"><a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat != null && place.lng != null ? `${place.lat},${place.lng}` : encodeURIComponent(place.cim)}`}><Navigation/>Navigálás</a></Button>
          <p className="text-xs text-muted-foreground">Átadás előtt egyeztess a fogadóhellyel.</p>
        </article>)}</div>
      </section>
      {recipientEditor && <RecipientPlaceEditor place={recipientEditor === "new" ? null : recipientEditor} onClose={() => setRecipientEditor(null)} onSaved={fetchData} />}
      {/* Drop-off info box */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-bold text-foreground mb-2 text-base">📦 Elosztási útmutató</h3>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>18:00-kor</strong> kell odaérni az üzlethez. Fontos, hogy a pékáru minél szélesebb körben jusson el – <strong>elsősorban rászorulókhoz</strong>.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl p-3 flex gap-3" style={{ background: "hsl(var(--teal-light))" }}>
            <span className="text-lg">❄️</span>
            <div>
              <p className="font-semibold" style={{ color: "hsl(var(--teal-dark))" }}>Átér – Közösségi Hűtő</p>
              <p className="text-xs text-muted-foreground">Népszínház utca 26., VIII. kerület</p>
              <p className="text-xs text-muted-foreground">Ha marad, ide leadhatod</p>
            </div>
          </div>
          <div className="rounded-xl p-3 flex gap-3" style={{ background: "hsl(var(--secondary))" }}>
            <span className="text-lg">🏠</span>
            <div>
              <p className="font-semibold text-foreground">Hajléktalan szállók</p>
              <p className="text-xs text-muted-foreground">Lásd a térképen – átadás előtt egyeztess velük</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
