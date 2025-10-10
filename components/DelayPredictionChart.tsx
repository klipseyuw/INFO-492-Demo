"use client";
import { useState, useEffect } from "react";
import axios from "axios";

interface PredictionData {
  predictedDelay: number;
  confidence: string;
  deviation: number;
  threshold: number;
  alert: boolean;
  method: string;
  dataPoints: number;
  movingAverage: number;
  linearRegression: number;
  rSquared: number;
  latestShipment: {
    id: string;
    routeId: string;
    expectedETA: string;
    predictedDelay: number;
  } | null;
}

interface DelayPredictionChartProps {
  refreshTrigger?: number;
  routeId?: string;
  threshold?: number;
}

export default function DelayPredictionChart({ 
  refreshTrigger, 
  routeId, 
  threshold = 30 
}: DelayPredictionChartProps) {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchPredictionData();
    fetchHistoricalData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchPredictionData();
    }, 30000);

    return () => clearInterval(interval);
  }, [routeId, threshold]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchPredictionData();
      fetchHistoricalData();
    }
  }, [refreshTrigger]);

  const fetchPredictionData = async () => {
    try {
      const params = new URLSearchParams();
      if (routeId) params.append('routeId', routeId);
      params.append('threshold', threshold.toString());
      
      const response = await axios.get(`/api/schedule-predict?${params.toString()}`);
      if (response.data.success) {
        setPredictionData(response.data.prediction);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch prediction data:", error);
      setError("Failed to load prediction data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get("/api/shipments");
      if (response.data.success) {
        // Process shipments to get delay history
        const delays = response.data.shipments
          .filter((shipment: any) => shipment.actualETA && shipment.expectedETA)
          .map((shipment: any) => {
            const expected = new Date(shipment.expectedETA);
            const actual = new Date(shipment.actualETA);
            const delay = (actual.getTime() - expected.getTime()) / (1000 * 60); // minutes
            return {
              date: shipment.createdAt,
              delay: Math.round(delay * 100) / 100,
              routeId: shipment.routeId,
              predictedDelay: shipment.predictedDelay
            };
          })
          .slice(0, 20) // Last 20 completed shipments
          .reverse();
        
        setHistoricalData(delays);
      }
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getDeviationColor = (deviation: number, threshold: number) => {
    if (deviation > threshold) return "text-red-400";
    if (deviation > threshold * 0.7) return "text-yellow-400";
    return "text-green-400";
  };

  const formatDelay = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  if (loading) {
    return (
      <div className="bg-[#201C3D]/85 border-[#3C3470]/50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-[#F4F6FF] font-['Rajdhani'] text-glow">
          Delay Prediction Analysis
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#201C3D]/85 border-[#3C3470]/50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#F4F6FF] font-['Rajdhani'] text-glow">
          Delay Prediction Analysis
        </h3>
        <button
          onClick={() => {
            fetchPredictionData();
            fetchHistoricalData();
          }}
          className="px-3 py-1 text-sm bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white rounded shadow-md hover:shadow-blue-500/40 transition-all duration-200 hover:brightness-110"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {predictionData ? (
        <div className="space-y-6">
          {/* Current Prediction Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border-l-4 ${
              predictionData.alert 
                ? 'bg-red-900/20 border-red-500/30' 
                : 'bg-green-900/20 border-green-500/30'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{predictionData.alert ? '🚨' : '✅'}</span>
                <span className="font-semibold text-sm uppercase tracking-wide">
                  {predictionData.alert ? 'ALERT' : 'NORMAL'}
                </span>
              </div>
              <p className="text-[#F4F6FF] mb-1">
                Predicted Delay: <span className="font-semibold">{formatDelay(predictionData.predictedDelay)}</span>
              </p>
              <p className="text-[#D0D6EB] text-sm">
                Current Deviation: <span className={getDeviationColor(predictionData.deviation, predictionData.threshold)}>
                  {formatDelay(predictionData.deviation)}
                </span>
              </p>
            </div>

            <div className="p-4 rounded-lg border-l-4 bg-blue-900/20 border-blue-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">📊</span>
                <span className="font-semibold text-sm uppercase tracking-wide">CONFIDENCE</span>
              </div>
              <p className="text-[#F4F6FF] mb-1">
                Level: <span className={`font-semibold ${getConfidenceColor(predictionData.confidence)}`}>
                  {predictionData.confidence.toUpperCase()}
                </span>
              </p>
              <p className="text-[#D0D6EB] text-sm">
                Data Points: {predictionData.dataPoints}
              </p>
            </div>
          </div>

          {/* Prediction Methods Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-900/20 border border-gray-500/30">
              <h4 className="text-sm font-semibold text-[#F4F6FF] mb-2">Moving Average</h4>
              <p className="text-[#D0D6EB] text-lg font-semibold">
                {formatDelay(predictionData.movingAverage)}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-900/20 border border-gray-500/30">
              <h4 className="text-sm font-semibold text-[#F4F6FF] mb-2">Linear Regression</h4>
              <p className="text-[#D0D6EB] text-lg font-semibold">
                {formatDelay(predictionData.linearRegression)}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-900/20 border border-gray-500/30">
              <h4 className="text-sm font-semibold text-[#F4F6FF] mb-2">R² Score</h4>
              <p className="text-[#D0D6EB] text-lg font-semibold">
                {(predictionData.rSquared * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Recent Delay History */}
          {historicalData.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-[#F4F6FF] mb-3">Recent Delay History</h4>
              <div className="max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {historicalData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-900/20 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-[#D0D6EB]">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-[#D0D6EB]">Route {item.routeId}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold ${
                          item.delay > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {item.delay > 0 ? '+' : ''}{formatDelay(item.delay)}
                        </span>
                        {item.predictedDelay && (
                          <span className="text-xs text-[#D0D6EB]">
                            (pred: {formatDelay(item.predictedDelay)})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Latest Shipment Info */}
          {predictionData.latestShipment && (
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <h4 className="text-sm font-semibold text-[#F4F6FF] mb-2">Active Shipment</h4>
              <div className="text-[#D0D6EB] text-sm space-y-1">
                <p>Route: {predictionData.latestShipment.routeId}</p>
                <p>Expected ETA: {new Date(predictionData.latestShipment.expectedETA).toLocaleString()}</p>
                <p>Predicted Delay: <span className="text-purple-400 font-semibold">
                  {formatDelay(predictionData.latestShipment.predictedDelay)}
                </span></p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-[#D0D6EB]">No prediction data available</p>
          <p className="text-sm text-[#D0D6EB] mt-1">
            Complete more shipments to enable predictions
          </p>
        </div>
      )}
    </div>
  );
}
