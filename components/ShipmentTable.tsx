"use client";
import { useState, useEffect, Fragment } from "react";
import axios from "axios";

interface Shipment {
  id: string;
  routeId: string;
  driverName: string;
  expectedETA: string;
  actualETA?: string | null;
  routeStatus: string;
  lastUpdated: string;
  createdAt: string;
  // Optional telemetry
  origin?: string | null;
  destination?: string | null;
  gpsOnline?: boolean | null;
  lastKnownAt?: string | null;
  lastKnownLat?: number | null;
  lastKnownLng?: number | null;
  speedKph?: number | null;
  headingDeg?: number | null;
  // Predictive scheduling
  predictedDelay?: number | null;
}

interface ShipmentTableProps {
  refreshTrigger?: number;
}

export default function ShipmentTable({ refreshTrigger }: ShipmentTableProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchShipments();
    let interval: ReturnType<typeof setInterval>;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      const delay: number = document.visibilityState === 'visible' ? 15000 : 45000; // 15s visible, 45s hidden
      interval = setInterval(fetchShipments, delay);
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
      // Immediate refresh request
      fetchShipments();
    }
  }, [refreshTrigger]);

  const fetchShipments = async () => {
    try {
      const response = await axios.get("/api/shipments");
      if (response.data.success) {
        setShipments(response.data.shipments);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch shipments:", error);
      setError("Failed to load shipment data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateDelay = (expected: string, actual?: string | null) => {
    if (!actual) return null;
    const expectedTime = new Date(expected).getTime();
    const actualTime = new Date(actual).getTime();
    const delayMinutes = Math.round((actualTime - expectedTime) / (1000 * 60));
    return delayMinutes;
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Rajdhani']">Active Shipments</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 font-['Rajdhani']">Active Shipments</h3>
        <button
          onClick={fetchShipments}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="text-center py-8 text-gray-700">
          No shipments found. Start the simulation to generate data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Route ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Telemetry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Expected ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actual ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Delay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Predicted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment) => {
                const delay = calculateDelay(shipment.expectedETA, shipment.actualETA);
                const lastSeenAgeMin = shipment.lastKnownAt ? Math.round((Date.now() - new Date(shipment.lastKnownAt).getTime()) / 60000) : null;
                return (
                  <Fragment key={shipment.id}>
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shipment.routeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {shipment.driverName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.routeStatus)}`}>
                          {shipment.routeStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full ${shipment.gpsOnline === false ? 'bg-red-100 text-red-800' : shipment.gpsOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              GPS: {shipment.gpsOnline === false ? 'Offline' : shipment.gpsOnline ? 'Online' : '—'}
                            </span>
                            {typeof shipment.speedKph === 'number' && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{shipment.speedKph} kph</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            {lastSeenAgeMin !== null ? `Last seen: ${lastSeenAgeMin}m ago` : 'Last seen: —'}
                            {typeof shipment.lastKnownLat === 'number' && typeof shipment.lastKnownLng === 'number' && (
                              <span className="ml-2">({shipment.lastKnownLat.toFixed(3)}, {shipment.lastKnownLng.toFixed(3)})</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {formatDateTime(shipment.expectedETA)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {shipment.actualETA ? formatDateTime(shipment.actualETA) : "In transit"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {delay !== null ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            delay > 15 ? "bg-red-100 text-red-800" :
                            delay > 0 ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {delay > 0 ? `+${delay}m` : `${delay}m`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {shipment.predictedDelay !== null && shipment.predictedDelay !== undefined ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            shipment.predictedDelay > 30 ? "bg-purple-100 text-purple-800" :
                            shipment.predictedDelay > 15 ? "bg-orange-100 text-orange-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {shipment.predictedDelay > 0 ? `+${Math.round(shipment.predictedDelay)}m` : `${Math.round(shipment.predictedDelay)}m`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleExpand(shipment.id)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        >
                          {expanded[shipment.id] ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expanded[shipment.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="text-sm text-gray-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <div className="text-gray-600 text-xs">Route</div>
                              <div>{shipment.origin || '—'} → {shipment.destination || '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 text-xs">Last Seen</div>
                              <div>
                                {shipment.lastKnownAt ? new Date(shipment.lastKnownAt).toLocaleString() : '—'}
                                {typeof shipment.lastKnownLat === 'number' && typeof shipment.lastKnownLng === 'number' && (
                                  <span className="ml-2 text-xs text-gray-600">({shipment.lastKnownLat.toFixed(4)}, {shipment.lastKnownLng.toFixed(4)})</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 text-xs">Heading / Speed</div>
                              <div>
                                {typeof shipment.headingDeg === 'number' ? `${shipment.headingDeg}°` : '—'}
                                {typeof shipment.speedKph === 'number' ? ` @ ${shipment.speedKph} kph` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}