"use client";

import { useState, useEffect } from "react";

export default function ContinuousSimToggle() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/simulation/status");
      const data = await res.json();
      if (data.success) {
        setActive(data.continuousSimActive);
      }
    } catch (err) {
      console.error("Failed to fetch simulation status:", err);
    }
  };

  const toggleSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/simulation/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle simulation");
      }

      setActive(data.continuousSimActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Continuous Simulation
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate synthetic shipments every 20 seconds for autonomous agent testing
          </p>
        </div>
        <button
          onClick={toggleSimulation}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            active ? "bg-blue-600" : "bg-gray-200"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${
            active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              active ? "bg-green-600 animate-pulse" : "bg-gray-400"
            }`}
          />
          {active ? "Active" : "Inactive"}
        </span>
        {active && (
          <span className="text-gray-500">
            • Generating routes every 20s
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
