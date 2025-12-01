"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { estimateConditions, formatConditionsHtml } from "@/lib/conditions";

// Fix default icon paths (Next.js bundling)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

// Basic lookup for demo cities used in simulation
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Tacoma, WA": { lat: 47.2529, lng: -122.4443 },
  "Spokane, WA": { lat: 47.6588, lng: -117.4260 },
  "Portland, OR": { lat: 45.5051, lng: -122.6750 },
  "Boise, ID": { lat: 43.6150, lng: -116.2023 },
  "Missoula, MT": { lat: 46.8721, lng: -113.9940 },
  "Yakima, WA": { lat: 46.6021, lng: -120.5059 },
  "Eugene, OR": { lat: 44.0521, lng: -123.0868 },
  "Salem, OR": { lat: 44.9429, lng: -123.0351 },
  "Bellingham, WA": { lat: 48.7519, lng: -122.4787 }
};

interface Shipment {
  id: string;
  routeId: string;
  driverName: string;
  expectedETA: string;
  actualETA?: string | null;
  routeStatus: string;
  origin?: string | null;
  destination?: string | null;
  gpsOnline?: boolean | null;
  lastKnownAt?: string | null;
  lastKnownLat?: number | null;
  lastKnownLng?: number | null;
  speedKph?: number | null;
  headingDeg?: number | null;
  predictedDelay?: number | null;
}

export default function ShipmentMapImpl({ refreshTrigger }: { refreshTrigger?: number }) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<{ markers: Record<string, L.Marker>; lines: Record<string, L.Polyline> }>({ markers: {}, lines: {} });

  useEffect(() => {
    fetchShipments();
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      const delay = document.visibilityState === "visible" ? 15000 : 45000;
      interval && clearInterval(interval);
      interval = setInterval(fetchShipments, delay);
    };
    start();
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    return () => { interval && clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchShipments();
  }, [refreshTrigger]);

  const fetchShipments = async () => {
    try {
      const res = await axios.get("/api/shipments");
      if (res.data.success) {
        setShipments(res.data.shipments);
        setError(null);
      }
    } catch (e) {
      setError("Failed to load shipments for map");
    } finally {
      setLoading(false);
    }
  };

  const center = useMemo<[number, number]>(() => {
    // Center on PNW if no data
    for (const s of shipments) {
      if (typeof s.lastKnownLat === "number" && typeof s.lastKnownLng === "number") {
        return [s.lastKnownLat, s.lastKnownLng];
      }
      if (s.origin && CITY_COORDS[s.origin]) return [CITY_COORDS[s.origin].lat, CITY_COORDS[s.origin].lng];
    }
    return [47.6062, -122.3321]; // Seattle default
  }, [shipments]);

  const computeLine = (s: Shipment): [number, number][] | null => {
    const pts: [number, number][] = [];
    const o = s.origin && CITY_COORDS[s.origin] ? CITY_COORDS[s.origin] : undefined;
    const d = s.destination && CITY_COORDS[s.destination] ? CITY_COORDS[s.destination] : undefined;
    if (o) pts.push([o.lat, o.lng]);
    if (typeof s.lastKnownLat === "number" && typeof s.lastKnownLng === "number") pts.push([s.lastKnownLat, s.lastKnownLng]);
    if (d) pts.push([d.lat, d.lng]);
    return pts.length >= 2 ? pts : null;
  };

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current).setView(center, 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Recenter map when data changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  // Update markers/lines when shipments change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = layersRef.current;

    const seenIds: Record<string, true> = {};
    for (const s of shipments) {
      seenIds[s.id] = true;
      const cond = estimateConditions({
        lat: typeof s.lastKnownLat === "number" ? s.lastKnownLat : undefined,
        lng: typeof s.lastKnownLng === "number" ? s.lastKnownLng : undefined,
        origin: s.origin || undefined,
        destination: s.destination || undefined,
      });
      const popupHtml = `
        <div class="text-sm">
          <div class="font-semibold">${s.routeId} — ${s.driverName}</div>
          <div class="text-xs text-gray-600">${s.origin || '—'} → ${s.destination || '—'}</div>
          ${formatConditionsHtml(cond)}
        </div>`;
      // Marker for current position
      if (typeof s.lastKnownLat === "number" && typeof s.lastKnownLng === "number") {
        const pos: [number, number] = [s.lastKnownLat, s.lastKnownLng];
        if (!layers.markers[s.id]) {
          const m = L.marker(pos).addTo(map);
          m.bindPopup(popupHtml);
          layers.markers[s.id] = m;
        } else {
          layers.markers[s.id].setLatLng(pos);
          layers.markers[s.id].setPopupContent(popupHtml);
        }
      }
      // Polyline for route
      const linePts = computeLine(s);
      if (linePts) {
        if (!layers.lines[s.id]) {
          const line = L.polyline(linePts, { color: "#2563eb", weight: 3, opacity: 0.7 }).addTo(map);
          line.bindPopup(popupHtml);
          layers.lines[s.id] = line;
        } else {
          layers.lines[s.id].setLatLngs(linePts);
          layers.lines[s.id].setPopupContent(popupHtml);
        }
      }
    }
    // Cleanup markers/lines for shipments no longer present
    for (const id of Object.keys(layers.markers)) {
      if (!seenIds[id]) { layers.markers[id].remove(); delete layers.markers[id]; }
    }
    for (const id of Object.keys(layers.lines)) {
      if (!seenIds[id]) { layers.lines[id].remove(); delete layers.lines[id]; }
    }
  }, [shipments]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900 font-['Rajdhani']">Shipment Routes Map</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchShipments} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
        </div>
      </div>
      {error && (
        <div className="px-4 pb-2 text-sm text-red-700">{error}</div>
      )}
      <div ref={containerRef} className="h-[420px] w-full" />
    </div>
  );
}
