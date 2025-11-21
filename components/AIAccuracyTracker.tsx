"use client";

import { useState, useEffect } from "react";

interface AccuracyMetrics {
  totalAnalyses: number;
  alertsCreated: number;
  feedbackReceived: number;
  accurateFeedback: number;
  accuracyRate: string;
  avgRiskScore: string;
  severityDistribution: Record<string, number>;
}

interface AccuracyData {
  timePeriod: string;
  metrics: AccuracyMetrics;
}

export default function AIAccuracyTracker() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValidation();
    const interval = setInterval(fetchValidation, document.visibilityState === 'visible' ? 10000 : 30000);
    const visHandler = () => {
      // Adaptive repoll immediately on visibility change
      fetchValidation();
    };
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, []);

  const fetchValidation = async () => {
    try {
      const res = await fetch("/api/metrics/accuracy?days=7");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load metrics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Parse accuracy rate for color coding
  const accuracyValue = parseFloat(data.metrics.accuracyRate) || 0;
  const accuracyColor =
    accuracyValue >= 70
      ? "text-green-600"
      : accuracyValue >= 50
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Accuracy Tracker</h3>
        <button
          onClick={() => { setLoading(true); fetchValidation(); }}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >Refresh</button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Analyses</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.totalAnalyses}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Alerts</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.alertsCreated}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Avg Risk</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.avgRiskScore}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Detection Accuracy</p>
          <p className={`text-2xl font-bold ${accuracyColor}`}>{data.metrics.accuracyRate}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.metrics.accurateFeedback} / {data.metrics.feedbackReceived}
          </p>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="bg-gray-50 rounded p-3">
        <p className="text-xs text-gray-600 mb-2">Severity Distribution</p>
        <div className="flex gap-4 text-sm">
          {Object.entries(data.metrics.severityDistribution).map(
            ([severity, count]) => (
              <span key={severity} className="flex items-center gap-1">
                <span
                  className={`inline-block w-3 h-3 rounded ${
                    severity === "high"
                      ? "bg-red-500"
                      : severity === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                />
                <span className="capitalize">{severity}:</span>
                <span className="font-semibold">{count}</span>
              </span>
            )
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Last {data.timePeriod} • {data.metrics.feedbackReceived} evaluated predictions
      </p>
    </div>
  );
}
