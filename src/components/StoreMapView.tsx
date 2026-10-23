import { useState, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { CheckCircle2, Clock, Phone, MapPin, Refrigerator, Home, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CommitModal from "./CommitModal";
import { forRescueDay, currentRescueDay } from "@/lib/rescue-calendar";
import { Button } from "@/components/ui/button";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZHpzZ2VyZ2VseSIsImEiOiJjbWx4bnJrZm0wc201M2RxbmsycXNjNzk2In0.zqaV1zDO9zyjf8wUnIhJ6w";

interface Store {
  id: string;
  nev: string;
  cim: string;
  kerület: string | null;
  lat: number | null;
  lng: number | null;
  telefon?: string | null;
  email?: string | null;
  tipus: string;
}

interface Commitment {
  id: string;
  user_id: string;
  store_id: string;
  tipus: string;
  datum: string | null;
  aktiv: boolean;
  profiles: { vezeteknev: string; keresztnev: string; telefonszam: string } | null;
}

interface Props {
  stores: Store[];
  commitments: Commitment[];
  onRefresh: () => void;
  filterAvailable: boolean;
  filterDate: string;
}

const markerColors: Record<string, string> = {
  pekseg_free: "#f59e0b",
  pekseg_taken: "#22c55e",
  kozossegi_huto: "#3b82f6",
  hajlektalan_szallo: "#8b5cf6",
};

export default function StoreMapView({ stores, commitments, onRefresh, filterAvailable, filterDate }: Props) {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [commitStore, setCommitStore] = useState<Store | null>(null);
  const [futureCommitments, setFutureCommitments] = useState<Commitment[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("rescue_commitments")
        .select("*")
        .order("datum", { ascending: true });
      if (data) {
        const profilesRes = await supabase.from("profiles").select("user_id, vezeteknev, keresztnev, telefonszam");
        const profileMap: Record<string, any> = {};
        (profilesRes.data ?? []).forEach((p) => { profileMap[p.user_id] = p; });
        setFutureCommitments(data.map((c) => ({ ...c, profiles: profileMap[c.user_id] ?? null })));
      }
    };
    fetchAll();
  }, [commitments]);

  const getStoreCommitments = (storeId: string) =>
    forRescueDay(commitments.filter((c) => c.store_id === storeId), filterDate || currentRescueDay());

  const getStoreFutureCommitments = (storeId: string) =>
    futureCommitments.filter((c) => c.store_id === storeId && c.aktiv);

  const isFiltered = (store: Store) => {
    if (store.tipus !== "pekseg") return false;
    const sc = getStoreCommitments(store.id);
    const isCovered = sc.length > 0;
    if (filterAvailable && isCovered) return true;
    if (filterDate) {
      const covered = sc.some((c) => c.tipus === "allandó" || c.datum === filterDate);
      if (covered) return true;
    }
    return false;
  };

  const validStores = stores.filter((s) => s.lat && s.lng);
  const displayStores = (filterAvailable || filterDate)
    ? validStores.filter((s) => s.tipus !== "pekseg" || !isFiltered(s))
    : validStores;

  const openNavigation = (store: Store) => {
    const q = store.lat != null && store.lng != null ? `${store.lat},${store.lng}` : encodeURIComponent(`${store.nev}, ${store.cim}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank");
  };

  const getColorKey = (store: Store) => {
    if (store.tipus === "kozossegi_huto") return "kozossegi_huto";
    if (store.tipus !== "pekseg") return "hajlektalan_szallo";
    const isCovered = getStoreCommitments(store.id).length > 0;
    return isCovered ? "pekseg_taken" : "pekseg_free";
  };

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: markerColors.pekseg_free }}></span>
         <span className="text-muted-foreground">Szabad pékség</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: markerColors.pekseg_taken }}></span>
          <span className="text-muted-foreground">Lefedett pékség ✓</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: markerColors.kozossegi_huto }}></span>
          <span className="text-muted-foreground">Közösségi hűtő</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: markerColors.hajlektalan_szallo }}></span>
          <span className="text-muted-foreground">Hajléktalan szálló</span>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "520px", boxShadow: "var(--shadow-card)" }}>
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 19.055,
            latitude: 47.497,
            zoom: 12,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          {displayStores.map((store) => {
            if (!store.lat || !store.lng) return null;
            const colorKey = getColorKey(store);
            return (
              <Marker
                key={store.id}
                longitude={store.lng}
                latitude={store.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedStore(store);
                }}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-white cursor-pointer shadow-md"
                  style={{ background: markerColors[colorKey] }}
                />
              </Marker>
            );
          })}

          {selectedStore && selectedStore.lat && selectedStore.lng && (
            <Popup
              longitude={selectedStore.lng}
              latitude={selectedStore.lat}
              anchor="bottom"
              onClose={() => setSelectedStore(null)}
              closeOnClick={false}
              maxWidth="320px"
            >
              <div style={{ fontFamily: "'Lato', sans-serif" }} className="py-1">
                {selectedStore.tipus === "kozossegi_huto" && (
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold mb-1">
                    <Refrigerator size={12} /> Közösségi Hűtő
                  </div>
                )}
                {selectedStore.tipus === "hajlektalan_szallo" && (
                  <div className="flex items-center gap-1 text-purple-600 text-xs font-semibold mb-1">
                    <Home size={12} /> Hajléktalan Szálló
                  </div>
                )}

                <h4 className="font-bold text-sm text-gray-900 mb-0.5">{selectedStore.nev}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin size={10} /> {selectedStore.cim}
                  {selectedStore.kerület && <span className="ml-1 text-teal-600 font-medium">({selectedStore.kerület})</span>}
                </p>

                {selectedStore.telefon && (
                  <a href={`tel:${selectedStore.telefon}`} className="text-xs text-teal-700 flex items-center gap-1 mb-2 hover:underline">
                    <Phone size={10} /> {selectedStore.telefon}
                  </a>
                )}

                <Button
                  onClick={() => openNavigation(selectedStore)}
                  className="w-full text-xs font-semibold py-2 rounded-lg text-white mb-2 flex items-center justify-center gap-1.5"
                  style={{ background: "#4285f4" }}
                >
                  <Navigation size={12} /> Navigálás ide
                </Button>

                {selectedStore.tipus === "pekseg" && (() => {
                  const sc = getStoreCommitments(selectedStore.id);
                  const allFuture = getStoreFutureCommitments(selectedStore.id);
                  const myCommitment = user ? sc.find((c) => c.user_id === user.id) : null;

                  const byDate: Record<string, Commitment[]> = {};
                  allFuture.forEach((c) => {
                    const key = c.tipus === "allandó" ? "Állandó (heti mentési nap)" : (c.datum ?? "?");
                    if (!byDate[key]) byDate[key] = [];
                    byDate[key].push(c);
                  });

                  return (
                    <>
                      <div className="border-t border-gray-100 pt-2 mb-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">📅 Naptár nézet:</p>
                        {Object.keys(byDate).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Még senki sem vállalta be.</p>
                        ) : (
                          Object.entries(byDate).map(([date, comms]) => (
                            <div key={date} className="mb-1.5">
                              <p className="text-xs font-medium text-gray-600">{date}:</p>
                              {comms.map((c) => (
                                <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-700 ml-2">
                                  {c.tipus === "allandó" ? (
                                    <CheckCircle2 size={10} className="text-teal-600" />
                                  ) : (
                                    <Clock size={10} className="text-amber-500" />
                                  )}
                                  <span className="font-medium">
                                    {c.profiles ? `${c.profiles.vezeteknev} ${c.profiles.keresztnev}` : "?"}
                                  </span>
                                  {c.profiles?.telefonszam && (
                                    <span className="text-gray-400">{c.profiles.telefonszam}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="text-xs text-teal-800 bg-teal-50 rounded-lg p-2 mb-2">
                        🕕 <strong>18:00-kor</strong> kell odaérni
                      </div>

                      {user ? (
                        myCommitment ? (
                          <div className="text-xs text-center text-teal-700 font-medium">
                            ✅ Bevállaltad ({myCommitment.tipus === "allandó" ? "állandó" : myCommitment.datum})
                          </div>
                        ) : (
                          <Button
                            onClick={() => { setSelectedStore(null); setCommitStore(selectedStore); }}
                            className="w-full text-xs font-semibold py-2 rounded-lg text-white transition-colors"
                            style={{ background: "hsl(174 25% 56%)" }}
                          >
                            Bevállalom! 🍞
                          </Button>
                        )
                      ) : (
                        <Link
                          to="/auth"
                          className="block w-full text-xs font-semibold py-2 rounded-lg text-center border-2 transition-colors"
                          style={{ borderColor: "hsl(174 25% 56%)", color: "hsl(174 25% 40%)" }}
                        >
                          Bejelentkezés a bevállaláshoz
                        </Link>
                      )}
                    </>
                  );
                })()}

                {selectedStore.tipus === "kozossegi_huto" && (
                  <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 mt-1">
                    📦 Átadás előtt egyeztess a fogadóhellyel.
                  </div>
                )}
                {selectedStore.tipus === "hajlektalan_szallo" && (
                  <div className="text-xs text-purple-700 bg-purple-50 rounded-lg p-2 mt-1">
                    🤝 Hajléktalan szálló – átadás előtt egyeztess velük.
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>
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
