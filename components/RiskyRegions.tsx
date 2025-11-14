"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

interface Region {
  id: string;
  regionKey: string;
  totalAnalyses: number;
  avgRisk: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  lastRiskScore: number;
}

export default function RiskyRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRegions() {
    try {
      const res = await axios.get("/api/risks/regions?limit=10");
      if (res.data.success) {
        setRegions(res.data.regions);
        setError(null);
      }
    } catch (e) {
      setError("Failed to load regional risk profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRegions();
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      const delay = document.visibilityState === "visible" ? 30000 : 60000;
      interval && clearInterval(interval);
      interval = setInterval(fetchRegions, delay);
    };
    start();
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    return () => { interval && clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 font-['Rajdhani']">Risky Regions</h3>
        <button onClick={fetchRegions} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
      </div>
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>
      )}
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : regions.length === 0 ? (
        <div className="text-gray-600">No risk data yet. Run the simulation to generate analyses.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {regions.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{r.regionKey}</div>
                <div className="text-xs text-gray-600">Analyses: {r.totalAnalyses} • High: {r.highCount} • Med: {r.mediumCount} • Low: {r.lowCount}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-red-700">{Math.round(r.avgRisk)}%</div>
                <div className="text-xs text-gray-600">Last: {r.lastRiskScore}%</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
