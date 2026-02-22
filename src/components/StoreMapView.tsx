import { useState, useEffect, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { CheckCircle2, Clock, Phone, MapPin, Refrigerator, Home, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CommitModal from "./CommitModal";

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

const containerStyle = { width: "100%", height: "100%" };
const center = { lat: 47.497, lng: 19.055 };

const markerColors: Record<string, string> = {
  pekseg_free: "#6aaa9c",
  pekseg_taken: "#f59e0b",
  kozossegi_huto: "#3b82f6",
  hajlektalan_szallo: "#8b5cf6",
};

export default function StoreMapView({ stores, commitments, onRefresh, filterAvailable, filterDate }: Props) {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [commitStore, setCommitStore] = useState<Store | null>(null);
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [futureCommitments, setFutureCommitments] = useState<Commitment[]>([]);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-maps-key`);
        const data = await res.json();
        if (data.key) setMapsKey(data.key);
      } catch (e) {
        console.error("Failed to fetch Maps key:", e);
      }
    };
    fetchKey();
  }, []);

  // Fetch all commitments (including future) for calendar display
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
    commitments.filter((c) => c.store_id === storeId && c.aktiv);

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
    const q = encodeURIComponent(`${store.nev}, ${store.cim}, Budapest`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    window.open(url, "_blank");
  };

  if (!mapsKey) {
    return (
      <div className="rounded-2xl border border-border flex items-center justify-center text-muted-foreground" style={{ height: "520px" }}>
        Térkép betöltése...
      </div>
    );
  }

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
          <span className="text-muted-foreground">Lefedett pékség</span>
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
        <LoadScript googleMapsApiKey={mapsKey}>
          <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
            {displayStores.map((store) => {
              if (!store.lat || !store.lng) return null;
              const sc = getStoreCommitments(store.id);
              const isCovered = sc.length > 0;
              const colorKey = store.tipus === "kozossegi_huto"
                ? "kozossegi_huto"
                : store.tipus === "hajlektalan_szallo"
                  ? "hajlektalan_szallo"
                  : isCovered ? "pekseg_taken" : "pekseg_free";

              return (
                <Marker
                  key={store.id}
                  position={{ lat: store.lat, lng: store.lng }}
                  onClick={() => setSelectedStore(store)}
                  icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                    fillColor: markerColors[colorKey],
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 1.5,
                    anchor: new google.maps.Point(12, 22),
                  }}
                />
              );
            })}

            {selectedStore && selectedStore.lat && selectedStore.lng && (
              <InfoWindow
                position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
                onCloseClick={() => setSelectedStore(null)}
              >
                <div style={{ maxWidth: 300, fontFamily: "'Lato', sans-serif" }} className="py-1">
                  {/* Type badge */}
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

                  {/* Navigation button */}
                  <button
                    onClick={() => openNavigation(selectedStore)}
                    className="w-full text-xs font-semibold py-2 rounded-lg text-white mb-2 flex items-center justify-center gap-1.5"
                    style={{ background: "#4285f4" }}
                  >
                    <Navigation size={12} /> Navigálás ide
                  </button>

                  {selectedStore.tipus === "pekseg" && (() => {
                    const sc = getStoreCommitments(selectedStore.id);
                    const allFuture = getStoreFutureCommitments(selectedStore.id);
                    const myCommitment = user ? sc.find((c) => c.user_id === user.id) : null;

                    // Group future commitments by date
                    const byDate: Record<string, Commitment[]> = {};
                    allFuture.forEach((c) => {
                      const key = c.tipus === "allandó" ? "Állandó (minden péntek)" : (c.datum ?? "?");
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
                            <button
                              onClick={() => { setSelectedStore(null); setCommitStore(selectedStore); }}
                              className="w-full text-xs font-semibold py-2 rounded-lg text-white transition-colors"
                              style={{ background: "hsl(174 25% 56%)" }}
                            >
                              Bevállalom! 🍞
                            </button>
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
                      📦 Ide leadható a megmaradt pékáru.
                    </div>
                  )}
                  {selectedStore.tipus === "hajlektalan_szallo" && (
                    <div className="text-xs text-purple-700 bg-purple-50 rounded-lg p-2 mt-1">
                      🤝 Hajléktalan szálló – ide is leadható a pékáru.
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
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
