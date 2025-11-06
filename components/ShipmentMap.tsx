"use client";
import dynamic from "next/dynamic";

// Wrapper to load the Leaflet map only on the client
type ImplProps = { refreshTrigger?: number };
const ShipmentMapImpl = dynamic<ImplProps>(() => import("./ShipmentMapImpl"), { ssr: false, loading: () => (
  <div className="card p-6 h-[420px] flex items-center justify-center text-gray-600">Loading map…</div>
)});

export default function ShipmentMap({ refreshTrigger }: { refreshTrigger?: number }) {
  return <ShipmentMapImpl refreshTrigger={refreshTrigger} />;
}
