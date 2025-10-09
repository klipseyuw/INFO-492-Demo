"use client";
import { useState, useEffect } from "react";
import axios from "axios";

interface Alert {
  id: string;
  shipmentId: string;
  type: string;
  severity: string;
  description: string;
  createdAt: string;
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get("/api/alerts");
      if (response.data.success) {
        setAlerts(response.data.alerts);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setError("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await axios.delete(`/api/alerts?id=${alertId}`);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "🚨";
      case "medium":
        return "⚠️";
      case "low":
        return "ℹ️";
      default:
        return "📋";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Security Alerts</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchAlerts}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🛡️</div>
          <p className="text-gray-500">No security alerts detected</p>
          <p className="text-sm text-gray-400 mt-1">
            Your logistics operations are secure
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                    <span className="font-semibold text-sm uppercase tracking-wide">
                      {alert.severity} - {alert.type}
                    </span>
                  </div>
                  
                  <p className="text-gray-900 mb-2">{alert.description}</p>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Route: {alert.shipmentId}</span>
                    <span>{formatDateTime(alert.createdAt)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Dismiss alert"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}