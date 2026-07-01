"use client";

import { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import type { Incident } from "@/types";
import { showToast } from "@/components/Toast";

interface MapContentProps {
  incidents: Incident[];
  location: { latitude: number; longitude: number; accuracy?: number } | null;
  selectedId?: string | null;
  onSelectIncident?: (incident: Incident | null) => void;
  showSafeRoute?: boolean;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

// Función de distancia geodésica (Haversine)
function getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const R = 6371e3; // metros
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // en metros
}

// Fallback de ruteo local/híbrido en caso de que la Directions API Key esté restringida
function getFallbackRoute(
  org: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  activeDangers: Incident[]
) {
  // Ruta A: L-shape matching latitude first, then longitude
  const pathA = [
    org,
    { lat: dest.lat, lng: org.lng },
    dest
  ];

  // Ruta B: L-shape matching longitude first, then latitude
  const pathB = [
    org,
    { lat: org.lat, lng: dest.lng },
    dest
  ];

  const checkPath = (path: { lat: number; lng: number }[]) => {
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      steps.push(p1);
      for (let f = 0.2; f < 1; f += 0.2) {
        steps.push({
          lat: p1.lat + (p2.lat - p1.lat) * f,
          lng: p1.lng + (p2.lng - p1.lng) * f,
        });
      }
    }
    steps.push(path[path.length - 1]);

    let intersects = false;
    let hitIncident: Incident | null = null;
    for (const pt of steps) {
      for (const inc of activeDangers) {
        const dist = getDistance(pt, { lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude });
        if (dist < 180) {
          intersects = true;
          hitIncident = inc;
          break;
        }
      }
      if (intersects) break;
    }
    return { intersects, hitIncident };
  };

  const checkA = checkPath(pathA);
  if (!checkA.intersects) {
    return { path: pathA, isSafe: true, avoided: null };
  }

  const checkB = checkPath(pathB);
  if (!checkB.intersects) {
    return { path: pathB, isSafe: true, avoided: checkA.hitIncident };
  }

  // Si ambas colisionan, creamos un desvío desplazando el punto de intersección
  const avoidedIncident = checkA.hitIncident || checkB.hitIncident;
  
  // Desplazar la esquina del desvío en la dirección opuesta al peligro
  const shiftLat = org.lat < dest.lat ? 0.0035 : -0.0035;
  const shiftLng = org.lng < dest.lng ? -0.0035 : 0.0035;

  const pathDetour = [
    org,
    { lat: org.lat, lng: org.lng + shiftLng },
    { lat: dest.lat - shiftLat, lng: org.lng + shiftLng },
    dest
  ];

  return {
    path: pathDetour,
    isSafe: false,
    avoided: avoidedIncident
  };
}

interface SafeRouteRendererProps {
  show: boolean;
  incidents: Incident[];
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}

function SafeRouteRenderer({ show, incidents, origin, destination }: SafeRouteRendererProps) {
  const map = useMap();
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    // Limpiar polilínea anterior y círculos
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    if (!show || !origin || !destination) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }

    const activeDangers = incidents.filter(
      (inc) => inc.estado === "verificado" || inc.estado === "revision_ia" || (inc.estado as string) === "pendiente" || !inc.estado
    );

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
          // El servicio de Direcciones fue exitoso y autorizado
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
          }

          if (!directionsRendererRef.current) {
            directionsRendererRef.current = new google.maps.DirectionsRenderer({
              map: map,
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: "#10b981",
                strokeWeight: 6,
                strokeOpacity: 0.85,
              },
            });
          }

          let bestRouteIndex = 0;
          let minDangerCount = Infinity;
          const matchedDangerIncidents: Incident[] = [];

          result.routes.forEach((route, routeIdx) => {
            let dangerCount = 0;
            const path = route.overview_path;
            
            activeDangers.forEach((inc) => {
              let isCloseToRoute = false;
              for (let i = 0; i < path.length; i++) {
                const dist = getDistance(
                  { lat: path[i].lat(), lng: path[i].lng() },
                  { lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude }
                );
                if (dist < 180) {
                  isCloseToRoute = true;
                  break;
                }
              }
              if (isCloseToRoute) {
                dangerCount++;
                if (routeIdx === 0 && !matchedDangerIncidents.find((m) => m.id === inc.id)) {
                  matchedDangerIncidents.push(inc);
                }
              }
            });

            if (dangerCount < minDangerCount) {
              minDangerCount = dangerCount;
              bestRouteIndex = routeIdx;
            }
          });

          const selectedRoute = result.routes[bestRouteIndex];
          const isSafe = minDangerCount === 0;

          let alertString = "";
          let audioString = "";

          if (isSafe && result.routes.length > 1 && bestRouteIndex > 0) {
            alertString = "¡Desvío activo! Se recalculó la ruta para evitar zonas de riesgo en la vía.";
            audioString = "Desvío activo en la ruta para evadir zonas peligrosas.";
            
            matchedDangerIncidents.forEach((inc) => {
              const circle = new google.maps.Circle({
                strokeColor: "#ef4444",
                strokeOpacity: 0.85,
                strokeWeight: 2,
                fillColor: "#ef4444",
                fillOpacity: 0.18,
                map: map,
                center: { lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude },
                radius: 120,
              });
              circlesRef.current.push(circle);
            });
          } else if (!isSafe) {
            alertString = "Atención: No se encontró una ruta libre de riesgos. Mostrando ruta con advertencias.";
            audioString = "Ruta establecida con advertencias por incidencias en el camino.";
            
            activeDangers.forEach((inc) => {
              let isClose = false;
              for (let i = 0; i < selectedRoute.overview_path.length; i++) {
                const dist = getDistance(
                  { lat: selectedRoute.overview_path[i].lat(), lng: selectedRoute.overview_path[i].lng() },
                  { lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude }
                );
                if (dist < 180) {
                  isClose = true;
                  break;
                }
              }
              if (isClose) {
                const circle = new google.maps.Circle({
                  strokeColor: "#ef4444",
                  strokeOpacity: 0.85,
                  strokeWeight: 2,
                  fillColor: "#ef4444",
                  fillOpacity: 0.18,
                  map: map,
                  center: { lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude },
                  radius: 120,
                });
                circlesRef.current.push(circle);
              }
            });
          } else {
            alertString = "Ruta segura establecida libre de incidentes activos.";
            audioString = "Ruta segura establecida.";
          }

          if (directionsRendererRef.current) {
            directionsRendererRef.current.setOptions({
              polylineOptions: {
                strokeColor: isSafe ? "#10b981" : "#f59e0b",
                strokeWeight: 6,
                strokeOpacity: 0.9,
              },
            });
            directionsRendererRef.current.setRouteIndex(bestRouteIndex);
            directionsRendererRef.current.setDirections(result);
            directionsRendererRef.current.setMap(map);
          }

          showToast(alertString, isSafe ? "success" : "info");
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(audioString);
            msg.lang = "es-ES";
            window.speechSynthesis.speak(msg);
          }

          const bounds = new google.maps.LatLngBounds();
          selectedRoute.overview_path.forEach((pt) => bounds.extend(pt));
          map.fitBounds(bounds);
        } else {
          // FALLBACK HÍBRIDO CLIENT-SIDE: Si la API Key no está autorizada para Directions API
          console.warn("DirectionsService no está autorizado o falló. Usando fallback de ruteo local.");
          
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
            directionsRendererRef.current = null;
          }

          const fallback = getFallbackRoute(origin, destination, activeDangers);

          // Renderizar círculos alrededor del incidente evadido o colisionante
          if (fallback.avoided) {
            const circle = new google.maps.Circle({
              strokeColor: "#ef4444",
              strokeOpacity: 0.85,
              strokeWeight: 2,
              fillColor: "#ef4444",
              fillOpacity: 0.18,
              map: map,
              center: { lat: fallback.avoided.ubicacion.latitude, lng: fallback.avoided.ubicacion.longitude },
              radius: 120,
            });
            circlesRef.current.push(circle);
          }

          // Crear y dibujar polilínea de fallback
          const polyline = new google.maps.Polyline({
            path: fallback.path,
            geodesic: true,
            strokeColor: fallback.isSafe ? "#10b981" : "#f59e0b",
            strokeOpacity: 0.9,
            strokeWeight: 6,
            map: map,
          });
          polylineRef.current = polyline;

          // Centrar vista en el recorrido
          const bounds = new google.maps.LatLngBounds();
          fallback.path.forEach((pt) => bounds.extend(pt));
          map.fitBounds(bounds);

          const alertStr = fallback.isSafe
            ? "Ruta segura establecida (Modo Fallback local sin API restricción)."
            : "Desvío activo: Ruta local recalculada evadiendo zona de peligro.";
          const audioStr = fallback.isSafe
            ? "Ruta segura establecida localmente."
            : "Desvío activo local establecido.";

          showToast(alertStr, fallback.isSafe ? "success" : "info");
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(audioStr);
            msg.lang = "es-ES";
            window.speechSynthesis.speak(msg);
          }
        }
      }
    );

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, show, origin, destination, incidents]);

  return null;
}

function MapContent({
  incidents,
  location,
  selectedId,
  onSelectIncident,
  showSafeRoute,
  origin,
  destination,
  onMapClick,
}: MapContentProps) {
  const map = useMap();
  const [localClickedIncident, setLocalClickedIncident] = useState<Incident | null>(null);

  const clickedIncident = selectedId
    ? incidents.find((i) => i.id === selectedId) || null
    : localClickedIncident;

  const dangerIncidents = incidents.filter(
    (inc) => inc.estado === "verificado" || inc.estado === "revision_ia" || (inc.estado as string) === "pendiente" || !inc.estado
  );
  const safeIncidents = incidents.filter(
    (inc) => inc.estado === "falsa_alarma" || inc.estado === "atendido"
  );

  useEffect(() => {
    if (!map || !selectedId || incidents.length === 0) return;
    const selected = incidents.find((i) => i.id === selectedId);
    if (selected && selected.ubicacion?.latitude && selected.ubicacion?.longitude) {
      map.panTo({ lat: selected.ubicacion.latitude, lng: selected.ubicacion.longitude });
      map.setZoom(17);
    }
  }, [map, selectedId, incidents]);

  const getPinColor = (prioridad: number, estado: string) => {
    if (estado === "falsa_alarma" || estado === "atendido")
      return { bg: "#71717a", border: "#3f3f46" };
    if (prioridad === 1) return { bg: "#dc2626", border: "#450a0a" };
    if (prioridad === 2) return { bg: "#f59e0b", border: "#78350f" };
    return { bg: "#ffffff", border: "#27272a" };
  };

  return (
    <GoogleMap
      defaultZoom={15}
      defaultCenter={{ lat: -16.409, lng: -71.5375 }}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
      disableDefaultUI={true}
      gestureHandling="greedy"
      onClick={(e) => {
        if (showSafeRoute && e.detail.latLng && onMapClick) {
          onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
        }
      }}
    >
      <SafeRouteRenderer
        show={showSafeRoute || false}
        incidents={incidents}
        origin={origin}
        destination={destination}
      />

      {dangerIncidents.map((inc) => (
        <AdvancedMarker
          key={`heat-danger-${inc.id}`}
          position={{ lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude }}
          zIndex={1}
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <div className="absolute w-4 h-4 rounded-full bg-red-500/80 blur-[1px]" />
            <div className="absolute w-20 h-20 rounded-full bg-gradient-to-r from-red-600/20 to-orange-500/10 blur-xl animate-pulse" />
            <div className="absolute w-32 h-32 rounded-full border border-red-500/20 animate-ping opacity-15 [animation-duration:3s]" />
          </div>
        </AdvancedMarker>
      ))}

      {safeIncidents.map((inc) => (
        <AdvancedMarker
          key={`heat-safe-${inc.id}`}
          position={{ lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude }}
          zIndex={1}
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/60 blur-[1px]" />
            <div className="absolute w-14 h-14 rounded-full bg-emerald-500/10 blur-lg animate-pulse" />
          </div>
        </AdvancedMarker>
      ))}

      {location && (
        <AdvancedMarker
          position={{
            lat: location.latitude,
            lng: location.longitude,
          }}
        >
          <Pin
            background="#ffffff"
            borderColor="#000000"
            glyphColor="#000000"
          />
        </AdvancedMarker>
      )}

      {incidents.map((inc) => {
        const isSelected = selectedId === inc.id;
        const colors = getPinColor(inc.prioridad, inc.estado);
        return (
          <AdvancedMarker
            key={inc.id}
            position={{ lat: inc.ubicacion.latitude, lng: inc.ubicacion.longitude }}
            onClick={() => {
              if (onSelectIncident) {
                onSelectIncident(inc);
              } else {
                setLocalClickedIncident(inc);
              }
            }}
            zIndex={isSelected ? 100 : 10}
          >
            <div className="relative">
              {isSelected && (
                <div className="absolute -inset-4 rounded-full bg-white/20 border border-white/40 animate-ping opacity-70 pointer-events-none" />
              )}
              <Pin
                background={isSelected ? "#ffffff" : colors.bg}
                borderColor={isSelected ? "#000000" : colors.border}
                glyphColor={isSelected ? "#000000" : "#ffffff"}
                scale={isSelected ? 1.25 : 1.0}
              />
            </div>
          </AdvancedMarker>
        );
      })}

      {!onSelectIncident && clickedIncident && (
        <InfoWindow
          position={{ lat: clickedIncident.ubicacion.latitude, lng: clickedIncident.ubicacion.longitude }}
          onCloseClick={() => setLocalClickedIncident(null)}
        >
          <div className="p-1 text-black max-w-[250px] w-fit">
            {clickedIncident.estado === "falsa_alarma" || clickedIncident.estado === "atendido" ? (
              <div>
                <p className="font-bold text-emerald-600">Todo es tranquilo por aquí</p>
                <p className="text-sm text-gray-600">A esta hora es tranquilo o la alerta ya fue solucionada.</p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-red-600">Zona de Peligro</p>
                <p className="text-sm font-semibold capitalize">{clickedIncident.tipo.replace(/_/g, " ")}</p>
                <p className="text-xs text-gray-700 mt-1">
                  {clickedIncident.descripcion || "Se reportó un incidente en esta zona."}
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">
                  Atención: Esta zona es muy reiterativa en este tipo de incidentes. Se recomienda precaución.
                </p>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

interface AppMapProps {
  selectedId?: string | null;
  onSelectIncident?: (incident: Incident | null) => void;
  overlayClassName?: string;
  showOverlay?: boolean;
  showSafeRoute?: boolean;
  incidents?: Incident[];
}

const PRESETS = [
  { name: "La Salle", lat: -16.4078, lng: -71.5471 },
  { name: "Plaza de Armas", lat: -16.3988, lng: -71.5369 },
  { name: "Yanahuara", lat: -16.3895, lng: -71.5418 },
  { name: "Mall Cayma", lat: -16.3912, lng: -71.5482 },
  { name: "Parque Lambramani", lat: -16.4210, lng: -71.5210 },
];

export default function AppMap({
  selectedId,
  onSelectIncident,
  overlayClassName,
  showOverlay = true,
  showSafeRoute = false,
  incidents: incidentsProp,
}: AppMapProps) {
  const location = useAppStore((state) => state.location);
  const [firestoreIncidents, setFirestoreIncidents] = useState<Incident[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados de navegación dinámica
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [originName, setOriginName] = useState("");
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [activeInput, setActiveInput] = useState<"origin" | "destination">("destination");

  // Autocompletar origen si se tiene la ubicación real del usuario
  useEffect(() => {
    if (showSafeRoute && location && !origin) {
      const timer = setTimeout(() => {
        setOrigin({ lat: location.latitude, lng: location.longitude });
        setOriginName("Mi ubicación actual");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showSafeRoute, location, origin]);

  // Real-time listener a Firestore
  useEffect(() => {
    const q = query(
      collection(db, "incidentes"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Incident[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.ubicacion?.latitude && data.ubicacion?.longitude) {
            items.push({
              id: doc.id,
              tipo: data.tipo,
              prioridad: data.prioridad || 3,
              estado: data.estado,
              descripcion: data.descripcion,
              evidencia: data.evidencia || { fotoUrl: null, audioUrl: null },
              ubicacion: {
                latitude: data.ubicacion.latitude,
                longitude: data.ubicacion.longitude,
                geohash: data.ubicacion.geohash || "",
              },
              timestamp: data.timestamp?.toDate?.() || new Date(),
              usuarioId: data.usuarioId || "unknown",
            });
          }
        });
        setFirestoreIncidents(items);
      },
      (error) => {
        console.error("Error listening to incidents:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const incidentsToRender = incidentsProp || firestoreIncidents;

  const alertCount = incidentsToRender.filter(
    (i) => i.estado === "revision_ia" || i.estado === "verificado"
  ).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    if (activeInput === "origin") {
      setOrigin(coords);
      setOriginName(`Punto en mapa (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      setActiveInput("destination"); // Cambiar automáticamente al destino
    } else {
      setDestination(coords);
      setDestinationName(`Punto en mapa (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
        <MapContent
          incidents={incidentsToRender}
          location={location}
          selectedId={selectedId}
          onSelectIncident={onSelectIncident}
          showSafeRoute={showSafeRoute}
          origin={origin}
          destination={destination}
          onMapClick={handleMapClick}
        />
      </APIProvider>

      {/* Panel HUD de Navegación Segura */}
      {showSafeRoute && (
        <div className="absolute top-[76px] left-3 right-3 md:left-4 md:right-auto md:w-80 z-20 glass rounded-2xl p-4 border border-white/10 animate-scale-in text-white space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 text-emerald-400 font-[family-name:var(--font-outfit)]">
              <span>🛡️</span> Ruta Segura Inteligente
            </h3>
            <div className="text-[10px] text-white/30 font-semibold uppercase">
              GPS {location ? "Activo" : "Off"}
            </div>
          </div>

          <div className="space-y-2">
            {/* Origen */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] text-white/40 font-bold uppercase">Origen</label>
                <button
                  onClick={() => setActiveInput("origin")}
                  className={`text-[9px] uppercase font-bold transition-all px-1.5 py-0.5 rounded cursor-pointer ${
                    activeInput === "origin"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      : "text-white/30 border border-transparent hover:text-white/60"
                  }`}
                >
                  Fijar
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none"
                  placeholder="Selecciona origen..."
                  value={originName}
                />
                {location && (
                  <button
                    onClick={() => {
                      setOrigin({ lat: location.latitude, lng: location.longitude });
                      setOriginName("Mi ubicación actual");
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                    title="Usar ubicación actual"
                  >
                    📍
                  </button>
                )}
              </div>
            </div>

            {/* Destino */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] text-white/40 font-bold uppercase">Destino</label>
                <button
                  onClick={() => setActiveInput("destination")}
                  className={`text-[9px] uppercase font-bold transition-all px-1.5 py-0.5 rounded cursor-pointer ${
                    activeInput === "destination"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      : "text-white/30 border border-transparent hover:text-white/60"
                  }`}
                >
                  Fijar
                </button>
              </div>
              <input
                type="text"
                readOnly
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none"
                placeholder="Haz clic en mapa o selecciona..."
                value={destinationName}
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1">
            <span className="text-[9px] text-white/40 font-bold uppercase block">Puntos de Interés:</span>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    if (activeInput === "origin") {
                      setOrigin({ lat: p.lat, lng: p.lng });
                      setOriginName(p.name);
                      setActiveInput("destination");
                    } else {
                      setDestination({ lat: p.lat, lng: p.lng });
                      setDestinationName(p.name);
                    }
                  }}
                  className="text-[9px] bg-white/5 border border-white/[0.05] rounded-md px-2 py-1 text-white/65 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ayuda */}
          <div className="text-[9px] text-white/30 bg-white/[0.01] border border-white/[0.04] p-2 rounded-lg leading-relaxed">
            💡 {activeInput === "origin"
              ? "Selecciona un punto rápido o haz clic en el mapa para fijar el origen."
              : "Selecciona un punto rápido o haz clic en el mapa para fijar el destino de tu viaje."
            }
          </div>
        </div>
      )}

      {/* Zone Status Overlay */}
      {showOverlay && !showSafeRoute && (
        <div className={`absolute glass rounded-2xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-300 ${overlayClassName || "top-3 left-3 right-3"}`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                alertCount > 0
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              {alertCount > 0 ? (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              ) : (
                <span className="text-xs">📡</span>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white/90 tracking-wide leading-none">
                {alertCount > 0 ? "Zona en Alerta" : "Zona Segura"}
              </h3>
              <p className="text-[10px] text-white/40 mt-1 leading-none">
                {alertCount} alerta{alertCount !== 1 ? "s" : ""} activa{alertCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 cursor-pointer shrink-0"
            title="Actualizar radar"
          >
            <span className={`w-3.5 h-3.5 text-white/50 text-xs flex items-center justify-center ${isRefreshing ? "animate-spin" : ""}`} role="img" aria-label="refresh">
              🔄
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
