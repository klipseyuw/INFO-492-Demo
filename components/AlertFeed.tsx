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

interface AlertFeedProps {
  refreshTrigger?: number;
}

export default function AlertFeed({ refreshTrigger }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    let interval: ReturnType<typeof setInterval>;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      const delay: number = document.visibilityState === 'visible' ? 8000 : 30000; // faster when visible
      interval = setInterval(fetchAlerts, delay);
    };
    startPolling();
    const handleVisibility = () => startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchAlerts();
    }
  }, [refreshTrigger]);

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
        return "bg-red-900/20 text-red-400 border-red-500/30 font-semibold";
      case "medium":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-blue-900/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-500/30";
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
      <div className="card text-[#F4F6FF] p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-100 font-['Rajdhani']">Security Alerts</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#201C3D]/85 border-[#3C3470]/50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#F4F6FF] font-['Rajdhani'] text-glow">Security Alerts</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[#D0D6EB]">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchAlerts}
            className="px-3 py-1 text-sm bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white rounded shadow-md hover:shadow-blue-500/40 transition-all duration-200 hover:brightness-110"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🛡️</div>
          <p className="text-[#D0D6EB]">No security alerts detected</p>
          <p className="text-sm text-[#D0D6EB] mt-1">
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
                  
                  <p className="text-[#F4F6FF] mb-2">{alert.description}</p>
                  
                  <div className="flex justify-between items-center text-sm text-[#D0D6EB]">
                    <span>Route: {alert.shipmentId}</span>
                    <span>{formatDateTime(alert.createdAt)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="ml-4 text-[#D0D6EB] hover:text-[#F4F6FF] transition-colors"
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