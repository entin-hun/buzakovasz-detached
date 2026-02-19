import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CheckCircle2, Clock, Phone, MapPin, Refrigerator, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import CommitModal from "./CommitModal";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored icons
const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      width: 32px;
      height: 32px;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 14px; display: block; text-align: center; line-height: 28px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });

const bakeryIconFree = createIcon("#4DBFBA", "🌾");
const bakeryIconTaken = createIcon("#f59e0b", "🌾");
const fridgeIcon = createIcon("#3b82f6", "❄️");
const shelterIcon = createIcon("#8b5cf6", "🏠");

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
  profiles: { keresztnev: string; telefonszam: string } | null;
}

interface Props {
  stores: Store[];
  commitments: Commitment[];
  onRefresh: () => void;
  filterAvailable: boolean;
  filterDate: string;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function StoreMapView({ stores, commitments, onRefresh, filterAvailable, filterDate }: Props) {
  const { user } = useAuth();
  const [commitStore, setCommitStore] = useState<Store | null>(null);

  const validStores = stores.filter((s) => s.lat && s.lng);

  const getStoreCommitments = (storeId: string) =>
    commitments.filter((c) => c.store_id === storeId && c.aktiv);

  const isFiltered = (store: Store) => {
    if (store.tipus !== "pekseg") return false;
    const sc = getStoreCommitments(store.id);
    const hasPermanent = sc.some((c) => c.tipus === "allandó");
    if (filterAvailable && hasPermanent) return true;
    if (filterDate) {
      const covered = sc.some((c) => c.tipus === "allandó" || c.datum === filterDate);
      if (covered) return true;
    }
    return false;
  };

  const getIcon = (store: Store) => {
    if (store.tipus === "kozossegi_huto") return fridgeIcon;
    if (store.tipus === "hajlektalan_szallo") return shelterIcon;
    const sc = getStoreCommitments(store.id);
    const hasPermanent = sc.some((c) => c.tipus === "allandó");
    return hasPermanent ? bakeryIconTaken : bakeryIconFree;
  };

  const displayStores = (filterAvailable || filterDate)
    ? validStores.filter((s) => s.tipus !== "pekseg" || !isFiltered(s))
    : validStores;

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#4DBFBA" }}></span>
          <span className="text-muted-foreground">Szabad pékség</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#f59e0b" }}></span>
          <span className="text-muted-foreground">Lefedett pékség</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#3b82f6" }}></span>
          <span className="text-muted-foreground">Közösségi hűtő</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#8b5cf6" }}></span>
          <span className="text-muted-foreground">Hajléktalan szálló</span>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "520px", boxShadow: "var(--shadow-card)" }}>
        <MapContainer
          center={[47.510, 19.055]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {displayStores.map((store) => {
            if (!store.lat || !store.lng) return null;
            const sc = getStoreCommitments(store.id);
            const hasPermanent = sc.some((c) => c.tipus === "allandó");
            const myCommitment = user ? sc.find((c) => c.user_id === user.id) : null;

            return (
              <Marker
                key={store.id}
                position={[store.lat, store.lng]}
                icon={getIcon(store)}
              >
                <Popup minWidth={240} maxWidth={300}>
                  <div className="py-1">
                    {/* Type badge */}
                    {store.tipus === "kozossegi_huto" && (
                      <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold mb-1">
                        <Refrigerator size={12} /> Közösségi Hűtő
                      </div>
                    )}
                    {store.tipus === "hajlektalan_szallo" && (
                      <div className="flex items-center gap-1 text-purple-600 text-xs font-semibold mb-1">
                        <Home size={12} /> Hajléktalan Szálló
                      </div>
                    )}

                    <h4 className="font-bold text-sm text-gray-900 mb-0.5">{store.nev}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                      <MapPin size={10} /> {store.cim}
                      {store.kerület && <span className="ml-1 text-teal-600 font-medium">({store.kerület})</span>}
                    </p>

                    {store.telefon && (
                      <a href={`tel:${store.telefon}`} className="text-xs text-teal-700 flex items-center gap-1 mb-2 hover:underline">
                        <Phone size={10} /> {store.telefon}
                      </a>
                    )}

                    {/* Only bakeries show commitments + commit button */}
                    {store.tipus === "pekseg" && (
                      <>
                        <div className="border-t border-gray-100 pt-2 mb-2">
                          {sc.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Még senki sem vállalta be.</p>
                          ) : (
                            sc.slice(0, 3).map((c) => (
                              <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-700 mb-1">
                                {c.tipus === "allandó" ? (
                                  <CheckCircle2 size={11} className="text-teal-600 flex-shrink-0" />
                                ) : (
                                  <Clock size={11} className="text-amber-500 flex-shrink-0" />
                                )}
                                <span className="font-medium">{c.profiles?.keresztnev ?? "?"}</span>
                                {c.profiles?.telefonszam && (
                                  <span className="text-gray-400">{c.profiles.telefonszam}</span>
                                )}
                                <span className="ml-auto text-gray-400">
                                  {c.tipus === "allandó" ? "Állandó" : c.datum}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="text-xs text-teal-800 bg-teal-50 rounded-lg p-2 mb-2">
                          🕕 <strong>18:00–18:30</strong> között kell odaérni
                        </div>

                        {user ? (
                          myCommitment ? (
                            <div className="text-xs text-center text-teal-700 font-medium">
                              ✅ Bevállaltad ({myCommitment.tipus === "allandó" ? "állandó" : myCommitment.datum})
                            </div>
                          ) : (
                            <button
                              onClick={() => setCommitStore(store)}
                              className="w-full text-xs font-semibold py-2 rounded-lg text-white transition-colors"
                              style={{ background: "hsl(177 47% 48%)" }}
                            >
                              Bevállalom! 🍞
                            </button>
                          )
                        ) : (
                          <Link
                            to="/auth"
                            className="block w-full text-xs font-semibold py-2 rounded-lg text-center border-2 transition-colors"
                            style={{ borderColor: "hsl(177 47% 48%)", color: "hsl(177 47% 38%)" }}
                          >
                            Bejelentkezés a bevállaláshoz
                          </Link>
                        )}
                      </>
                    )}

                    {store.tipus === "kozossegi_huto" && (
                      <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 mt-1">
                        📦 Ide leadható a megmaradt pékáru, amit nem sikerült szétosztani.
                      </div>
                    )}

                    {store.tipus === "hajlektalan_szallo" && (
                      <div className="text-xs text-purple-700 bg-purple-50 rounded-lg p-2 mt-1">
                        🤝 Hajléktalan szálló – ide is leadható a megmaradt pékáru.
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
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
