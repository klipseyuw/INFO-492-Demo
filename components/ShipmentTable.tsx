"use client";
import { useState, useEffect } from "react";
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
}

export default function ShipmentTable() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Active Shipments</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Shipments</h3>
        <button
          onClick={fetchShipments}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No shipments found. Start the simulation to generate data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment) => {
                const delay = calculateDelay(shipment.expectedETA, shipment.actualETA);
                return (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {shipment.routeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shipment.driverName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.routeStatus)}`}>
                        {shipment.routeStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(shipment.expectedETA)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}