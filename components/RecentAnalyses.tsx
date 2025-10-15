"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import AlertFeedbackModal from "./AlertFeedbackModal";

interface Analysis {
  id: string;
  shipmentId: string | null;
  riskScore: number;
  alertType: string;
  severity: string;
  description: string;
  createdAt: string;
  metadata: string;
}

interface RecentAnalysesProps {
  refreshTrigger?: number;
}

export default function RecentAnalyses({ refreshTrigger }: RecentAnalysesProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackAnalysis, setFeedbackAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    fetchAnalyses();
    const interval = setInterval(fetchAnalyses, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchAnalyses();
    }
  }, [refreshTrigger]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get("/api/analyses?limit=20");
      if (response.data.success) {
        setAnalyses(response.data.analyses);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch analyses:", error);
      setError("Failed to load analyses");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (riskScore: number) => {
    if (riskScore > 70) return "bg-red-50 text-red-900 border-red-300";
    if (riskScore > 40) return "bg-yellow-50 text-yellow-900 border-yellow-300";
    if (riskScore > 20) return "bg-blue-50 text-blue-900 border-blue-300";
    return "bg-green-50 text-green-900 border-green-300";
  };

  const getSeverityIcon = (riskScore: number) => {
    if (riskScore > 70) return "🚨";
    if (riskScore > 40) return "⚠️";
    if (riskScore > 20) return "ℹ️";
    return "✅";
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Rajdhani']">Recent AI Analyses</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 font-['Rajdhani']">Recent AI Analyses</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            {analyses.length} prediction{analyses.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchAnalyses}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🤖</div>
          <p className="text-gray-700">No analyses yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Enable the AI agent and generate shipments
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className={`p-3 rounded-lg border-l-4 ${getSeverityColor(analysis.riskScore)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getSeverityIcon(analysis.riskScore)}</span>
                    <span className="font-semibold text-sm">
                      Risk: {analysis.riskScore}/100 - {analysis.alertType}
                    </span>
                  </div>
                  
                  <p className="text-gray-800 text-sm mb-1">{analysis.description}</p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>Route: {analysis.shipmentId || 'N/A'}</span>
                    <span suppressHydrationWarning>{formatDateTime(analysis.createdAt)}</span>
                  </div>

                  {/* Feedback Button - ALWAYS VISIBLE */}
                  <button
                    onClick={() => setFeedbackAnalysis(analysis)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                    title="Provide feedback to train AI"
                  >
                    <span>🎯</span>
                    <span>Rate This Prediction</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackAnalysis && (
        <AlertFeedbackModal
          targetType="analysis"
          id={feedbackAnalysis.id}
          alertType={feedbackAnalysis.alertType}
          severity={feedbackAnalysis.severity}
          onClose={() => setFeedbackAnalysis(null)}
          onSubmit={() => {
            fetchAnalyses();
          }}
        />
      )}
    </div>
  );
}
