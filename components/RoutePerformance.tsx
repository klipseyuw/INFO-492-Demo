"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";

interface Shipment {
  id: string;
  routeId: string;
  driverName: string;
  expectedETA: string;
  actualETA?: string | null;
  routeStatus: string;
  predictedDelay?: number | null;
  cargoName?: string | null;
  cargoQuantity?: number | null;
  lastUpdated: string;
}

interface Alert {
  id: string;
  shipmentId: string;
  type: string;
  severity: string;
  description: string;
  createdAt: string;
}

interface ReportData {
  shipments: Shipment[];
  alerts: Alert[];
  totalShipments: number;
  activeAlerts: number;
  averageDelay: number;
  lastUpdated: string;
}

export default function RoutePerformance() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipmentsRes, alertsRes] = await Promise.all([
        axios.get("/api/shipments").catch(() => ({ data: { success: false, shipments: [] } })),
        axios.get("/api/alerts").catch(() => ({ data: { success: false, alerts: [] } }))
      ]);

      const shipments: Shipment[] = shipmentsRes.data.success ? shipmentsRes.data.shipments || [] : [];
      const alerts: Alert[] = alertsRes.data.success ? alertsRes.data.alerts || [] : [];

      const delaysWithValues = shipments
        .map(s => {
          if (s.predictedDelay != null) return s.predictedDelay;
          if (s.expectedETA && s.actualETA) {
            return (new Date(s.actualETA).getTime() - new Date(s.expectedETA).getTime()) / (1000 * 60);
          }
          return null;
        })
        .filter((d): d is number => d !== null);

      const averageDelay = delaysWithValues.length > 0
        ? Math.round(delaysWithValues.reduce((sum, d) => sum + d, 0) / delaysWithValues.length)
        : 0;

      setReportData({
        shipments,
        alerts,
        totalShipments: shipments.length,
        activeAlerts: alerts.length,
        averageDelay,
        lastUpdated: new Date().toLocaleString()
      });
    } catch (err) {
      console.error("Failed to fetch route performance data:", err);
      setError("Failed to load route performance data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFullReport = async () => {
    setGenerating(true);
    try {
      const [shipmentsRes, alertsRes] = await Promise.all([
        axios.get("/api/shipments").catch(() => ({ data: { success: false, shipments: [] } })),
        axios.get("/api/alerts").catch(() => ({ data: { success: false, alerts: [] } }))
      ]);

      const shipments: Shipment[] = shipmentsRes.data.success ? shipmentsRes.data.shipments || [] : [];
      const alerts: Alert[] = alertsRes.data.success ? alertsRes.data.alerts || [] : [];

      const delaysWithValues = shipments
        .map(s => {
          if (s.predictedDelay != null) return s.predictedDelay;
          if (s.expectedETA && s.actualETA) {
            return (new Date(s.actualETA).getTime() - new Date(s.expectedETA).getTime()) / (1000 * 60);
          }
          return null;
        })
        .filter((d): d is number => d !== null);

      const averageDelay = delaysWithValues.length > 0
        ? Math.round(delaysWithValues.reduce((sum, d) => sum + d, 0) / delaysWithValues.length)
        : 0;

      const doc = new jsPDF();
      let yPosition = 20;

      // ===== PAGE 1: Executive Summary =====
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Comprehensive Logistics Security Report", 105, yPosition, { align: "center" });
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: "center" });
      yPosition += 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", 10, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Total Shipments:", 10, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(String(shipments.length), 70, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Active Alerts:", 10, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(String(alerts.length), 70, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Last Updated:", 10, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleString(), 70, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Avg Delay:", 10, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${averageDelay} minutes`, 70, yPosition);

      // ===== PAGE 2: Shipments Overview =====
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Shipments Overview", 10, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const shipmentsToShow = shipments.slice(0, 50);
      shipmentsToShow.forEach((shipment, index) => {
        if (index > 0 && index % 5 === 0 && yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`Route ID: ${shipment.routeId}`, 10, yPosition);
        yPosition += 7;

        doc.setFont("helvetica", "normal");
        const driver = shipment.driverName || "N/A";
        doc.text(`Driver: ${driver}`, 10, yPosition);
        yPosition += 6;

        const status = shipment.routeStatus || "N/A";
        doc.text(`Status: ${status}`, 10, yPosition);
        yPosition += 6;

        const delayMin =
          shipment.predictedDelay != null
            ? Math.round(shipment.predictedDelay)
            : shipment.expectedETA && shipment.actualETA
            ? Math.round(
                (new Date(shipment.actualETA).getTime() - new Date(shipment.expectedETA).getTime()) /
                  (1000 * 60)
              )
            : "N/A";

        doc.text(
          `Delay: ${typeof delayMin === "number" ? `${delayMin} min` : "N/A"}`,
          10,
          yPosition
        );
        yPosition += 6;

        const eta = shipment.expectedETA
          ? new Date(shipment.expectedETA).toLocaleString()
          : "N/A";
        doc.text(`ETA: ${eta}`, 10, yPosition);
        yPosition += 6;

        const cargoType = shipment.cargoName
          ? `${shipment.cargoName}${shipment.cargoQuantity ? ` x${shipment.cargoQuantity}` : ""}`
          : "N/A";
        doc.text(`Cargo Type: ${cargoType}`, 10, yPosition);
        yPosition += 10;

        if (index < shipmentsToShow.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(10, yPosition, 200, yPosition);
          yPosition += 5;
        }
      });

      // ===== NEXT PAGE: Predictive Analytics =====
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Predictive Analytics", 10, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const shipmentsWithPrediction = shipments.filter(s => s.predictedDelay != null);
      const avgPredictedDelay =
        shipmentsWithPrediction.length > 0
          ? Math.round(
              shipmentsWithPrediction.reduce((sum, s) => sum + (s.predictedDelay || 0), 0) /
                shipmentsWithPrediction.length
            )
          : 0;

      doc.text(
        `Average predicted delay: ${avgPredictedDelay} min | Confidence: ${
          shipmentsWithPrediction.length >= 10
            ? "High"
            : shipmentsWithPrediction.length >= 3
            ? "Medium"
            : "Low"
        }`,
        10,
        yPosition
      );
      yPosition += 10;

      doc.text("Predicted Delays and Confidence Levels", 10, yPosition);
      yPosition += 8;

      if (shipmentsWithPrediction.length > 0) {
        shipmentsWithPrediction.slice(0, 10).forEach(shipment => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const delay = Math.round(shipment.predictedDelay || 0);
          doc.text(`- Route ${shipment.routeId}: ${delay} min delay predicted`, 15, yPosition);
          yPosition += 7;
        });
      } else {
        doc.text("No predictive data available at this time.", 15, yPosition);
      }

      // ===== NEXT PAGE: Security Alerts Summary =====
      if (alerts.length > 0) {
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Security Alerts Summary", 10, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        alerts.forEach(alert => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          const sev = alert.severity?.toLowerCase();
          const riskScore = sev === "high" ? 75 : sev === "medium" ? 50 : 25;
          const isHighRisk = riskScore > 70;

          if (isHighRisk) doc.setTextColor(255, 0, 0);

          doc.setFont("helvetica", "bold");
          doc.text(`Alert ID: ${alert.id}`, 10, yPosition);
          yPosition += 7;

          doc.setFont("helvetica", "normal");
          doc.text(`Risk Score: ${riskScore} (${alert.severity?.toUpperCase() || "N/A"})`, 10, yPosition);
          yPosition += 6;

          doc.text(`Threat Type: ${alert.type || "N/A"}`, 10, yPosition);
          yPosition += 6;

          const descLines = doc.splitTextToSize(alert.description || "N/A", 190) as string[];
          doc.text(descLines, 10, yPosition);
          yPosition += descLines.length * 5 + 5;

          if (isHighRisk) doc.setTextColor(0, 0, 0);

          doc.setDrawColor(200, 200, 200);
          doc.line(10, yPosition, 200, yPosition);
          yPosition += 5;
        });
      }

      // ===== LAST PAGE: Recommendations & System Notes =====
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Recommendations & System Notes", 10, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const notes = [
        "Maintaining continuous AI monitoring enhances early anomaly detection and system resilience.",
        "Regular review of shipment routes and delay patterns helps identify potential security vulnerabilities.",
        alerts.length > 0
          ? "Active security alerts require immediate attention and investigation."
          : "No active alerts detected. System is operating within normal parameters.",
        shipments.length > 0
          ? `Currently monitoring ${shipments.length} active shipment(s) across various routes.`
          : "No active shipments to monitor at this time.",
        averageDelay > 30
          ? "Average delay exceeds 30 minutes. Review routing efficiency and investigate potential bottlenecks."
          : "Average delay is within acceptable parameters.",
        "Ensure all telemetry data is current and GPS tracking systems are functioning properly.",
        "Regular system audits and security assessments are recommended for maintaining optimal performance."
      ];

      notes.forEach(note => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        const noteLines = doc.splitTextToSize(note, 190) as string[];
        doc.text(noteLines, 10, yPosition);
        yPosition += noteLines.length * 6 + 5;
      });

      // ===== AI EVALUATION METRICS SECTION =====
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("AI System Evaluation Metrics (Last Updated)", 10, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 10, yPosition);
      yPosition += 12;

      const shipmentsWithActual = shipments.filter(s => s.expectedETA && s.actualETA);
      const shipmentsWithPredicted = shipments.filter(s => s.predictedDelay != null);

      let delayPredictionMAE = 0;
      if (shipmentsWithActual.length > 0) {
        const maeErrors: number[] = [];
        shipmentsWithActual.forEach(shipment => {
          const actualDelay = (new Date(shipment.actualETA!).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
          const predictedDelay = shipment.predictedDelay != null ? shipment.predictedDelay : 0;
          maeErrors.push(Math.abs(predictedDelay - actualDelay));
        });
        delayPredictionMAE = maeErrors.reduce((sum, err) => sum + err, 0) / maeErrors.length;
      } else if (shipmentsWithPredicted.length > 0) {
        delayPredictionMAE = shipmentsWithPredicted.reduce((sum, s) => sum + (s.predictedDelay || 0), 0) / shipmentsWithPredicted.length;
      }

      const completedShipments = shipments.filter(s => s.routeStatus === "completed" && s.expectedETA && s.actualETA);
      
      let overtriggers = 0;
      let undertriggers = 0;
      completedShipments.forEach(shipment => {
        const actualDelay = (new Date(shipment.actualETA!).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
        const predictedDelay = shipment.predictedDelay != null ? shipment.predictedDelay : 0;
        if (predictedDelay > 30 && actualDelay < 10) {
          overtriggers++;
        }
        if (predictedDelay < 15 && actualDelay > 30) {
          undertriggers++;
        }
      });

      const overtriggerRate = completedShipments.length > 0 ? (overtriggers / completedShipments.length) * 100 : 0;
      const undertriggerRate = completedShipments.length > 0 ? (undertriggers / completedShipments.length) * 100 : 0;

      let alertHits = 0;
      alerts.forEach(alert => {
        const shipment = shipments.find(s => s.id === alert.shipmentId);
        if (shipment && shipment.expectedETA && shipment.actualETA) {
          const actualDelay = (new Date(shipment.actualETA).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
          const isHighMedium = alert.severity?.toLowerCase() === 'high' || alert.severity?.toLowerCase() === 'medium';
          if (isHighMedium && actualDelay > 20) {
            alertHits++;
          }
        }
      });
      const alertHitRate = alerts.length > 0 ? (alertHits / alerts.length) * 100 : 0;

      let routeStabilityScore = 0;
      if (shipmentsWithActual.length >= 5) {
        const actualDelays = shipmentsWithActual.map(s => 
          (new Date(s.actualETA!).getTime() - new Date(s.expectedETA).getTime()) / (1000 * 60)
        );
        const sorted = [...actualDelays].sort((a, b) => a - b);
        const medianDelay = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        
        const madValues = actualDelays.map(d => Math.abs(d - medianDelay));
        const sortedMAD = [...madValues].sort((a, b) => a - b);
        const MAD = sortedMAD.length % 2 === 0
          ? (sortedMAD[sortedMAD.length / 2 - 1] + sortedMAD[sortedMAD.length / 2]) / 2
          : sortedMAD[Math.floor(sortedMAD.length / 2)];
        
        routeStabilityScore = Math.max(0, 100 - (MAD / 20) * 100);
      } else if (shipmentsWithPredicted.length > 0) {
        const predictedDelays = shipmentsWithPredicted.map(s => s.predictedDelay || 0);
        const sorted = [...predictedDelays].sort((a, b) => a - b);
        const medianPred = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        
        const madValues = predictedDelays.map(p => Math.abs(p - medianPred));
        const sortedMAD = [...madValues].sort((a, b) => a - b);
        const MAD = sortedMAD.length % 2 === 0
          ? (sortedMAD[sortedMAD.length / 2 - 1] + sortedMAD[sortedMAD.length / 2]) / 2
          : sortedMAD[Math.floor(sortedMAD.length / 2)];
        
        routeStabilityScore = Math.max(0, 100 - (MAD / 25) * 100);
      }

      const MAE_norm = Math.min(100, (delayPredictionMAE / 60) * 100);
      const OC_norm = 100 - overtriggerRate;
      const UC_norm = 100 - undertriggerRate;
      const systemConfidenceScore = 
        0.30 * (100 - MAE_norm) +
        0.20 * OC_norm +
        0.20 * UC_norm +
        0.20 * alertHitRate +
        0.10 * routeStabilityScore;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const metrics = [
        { label: "Delay Prediction MAE", value: delayPredictionMAE.toFixed(1) + " min" },
        { label: "Overtrigger Rate", value: overtriggerRate.toFixed(1) + "%" },
        { label: "Undertrigger Rate", value: undertriggerRate.toFixed(1) + "%" },
        { label: "Alert Hit Rate", value: alertHitRate.toFixed(1) + "%" },
        { label: "Route Stability Score", value: routeStabilityScore.toFixed(1) + "%" },
        { label: "System Confidence Score", value: systemConfidenceScore.toFixed(1) + "%" },
      ];

      metrics.forEach(metric => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`${metric.label}:`, 10, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(metric.value, 100, yPosition);
        yPosition += 10;
      });

      doc.save("Comprehensive_Logistics_Report.pdf");
    } catch (err) {
      console.error("Failed to generate comprehensive report:", err);
      alert("Failed to generate comprehensive report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Rajdhani']">
          📊 Route Performance Overview
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Rajdhani']">
          📊 Route Performance Overview
        </h3>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const calculateAIMetrics = () => {
    if (!reportData) {
      return {
        delayPredictionMAE: 0,
        overtriggerRate: 0,
        undertriggerRate: 0,
        alertHitRate: 0,
        routeStabilityScore: 0,
        systemConfidenceScore: 0,
      };
    }

    const { shipments, alerts } = reportData;

    const shipmentsWithActual = shipments.filter(s => s.expectedETA && s.actualETA);
    const shipmentsWithPredicted = shipments.filter(s => s.predictedDelay != null);

    let delayPredictionMAE = 0;
    if (shipmentsWithActual.length > 0) {
      const maeErrors: number[] = [];
      shipmentsWithActual.forEach(shipment => {
        const actualDelay = (new Date(shipment.actualETA!).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
        const predictedDelay = shipment.predictedDelay != null ? shipment.predictedDelay : 0;
        maeErrors.push(Math.abs(predictedDelay - actualDelay));
      });
      delayPredictionMAE = maeErrors.reduce((sum, err) => sum + err, 0) / maeErrors.length;
    } else if (shipmentsWithPredicted.length > 0) {
      delayPredictionMAE = shipmentsWithPredicted.reduce((sum, s) => sum + (s.predictedDelay || 0), 0) / shipmentsWithPredicted.length;
    }

    const completedShipments = shipments.filter(s => s.routeStatus === "completed" && s.expectedETA && s.actualETA);
    
    let overtriggers = 0;
    let undertriggers = 0;
    completedShipments.forEach(shipment => {
      const actualDelay = (new Date(shipment.actualETA!).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
      const predictedDelay = shipment.predictedDelay != null ? shipment.predictedDelay : 0;
      if (predictedDelay > 30 && actualDelay < 10) {
        overtriggers++;
      }
      if (predictedDelay < 15 && actualDelay > 30) {
        undertriggers++;
      }
    });

    const overtriggerRate = completedShipments.length > 0 ? (overtriggers / completedShipments.length) * 100 : 0;
    const undertriggerRate = completedShipments.length > 0 ? (undertriggers / completedShipments.length) * 100 : 0;

    let alertHits = 0;
    alerts.forEach(alert => {
      const shipment = shipments.find(s => s.id === alert.shipmentId);
      if (shipment && shipment.expectedETA && shipment.actualETA) {
        const actualDelay = (new Date(shipment.actualETA).getTime() - new Date(shipment.expectedETA).getTime()) / (1000 * 60);
        const isHighMedium = alert.severity?.toLowerCase() === 'high' || alert.severity?.toLowerCase() === 'medium';
        if (isHighMedium && actualDelay > 20) {
          alertHits++;
        }
      }
    });
    const alertHitRate = alerts.length > 0 ? (alertHits / alerts.length) * 100 : 0;

    let routeStabilityScore = 0;
    if (shipmentsWithActual.length >= 5) {
      const actualDelays = shipmentsWithActual.map(s => 
        (new Date(s.actualETA!).getTime() - new Date(s.expectedETA).getTime()) / (1000 * 60)
      );
      const sorted = [...actualDelays].sort((a, b) => a - b);
      const medianDelay = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      const madValues = actualDelays.map(d => Math.abs(d - medianDelay));
      const sortedMAD = [...madValues].sort((a, b) => a - b);
      const MAD = sortedMAD.length % 2 === 0
        ? (sortedMAD[sortedMAD.length / 2 - 1] + sortedMAD[sortedMAD.length / 2]) / 2
        : sortedMAD[Math.floor(sortedMAD.length / 2)];
      
      routeStabilityScore = Math.max(0, 100 - (MAD / 20) * 100);
    } else if (shipmentsWithPredicted.length > 0) {
      const predictedDelays = shipmentsWithPredicted.map(s => s.predictedDelay || 0);
      const sorted = [...predictedDelays].sort((a, b) => a - b);
      const medianPred = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      const madValues = predictedDelays.map(p => Math.abs(p - medianPred));
      const sortedMAD = [...madValues].sort((a, b) => a - b);
      const MAD = sortedMAD.length % 2 === 0
        ? (sortedMAD[sortedMAD.length / 2 - 1] + sortedMAD[sortedMAD.length / 2]) / 2
        : sortedMAD[Math.floor(sortedMAD.length / 2)];
      
      routeStabilityScore = Math.max(0, 100 - (MAD / 25) * 100);
    }

    const MAE_norm = Math.min(100, (delayPredictionMAE / 60) * 100);
    const OC_norm = 100 - overtriggerRate;
    const UC_norm = 100 - undertriggerRate;
    const systemConfidenceScore = 
      0.30 * (100 - MAE_norm) +
      0.20 * OC_norm +
      0.20 * UC_norm +
      0.20 * alertHitRate +
      0.10 * routeStabilityScore;

    return {
      delayPredictionMAE: Math.round(delayPredictionMAE * 100) / 100,
      overtriggerRate: Math.round(overtriggerRate * 100) / 100,
      undertriggerRate: Math.round(undertriggerRate * 100) / 100,
      alertHitRate: Math.round(alertHitRate * 100) / 100,
      routeStabilityScore: Math.round(routeStabilityScore * 100) / 100,
      systemConfidenceScore: Math.round(systemConfidenceScore * 100) / 100,
    };
  };

  const aiMetrics = calculateAIMetrics();

  const getMetricColor = (value: number, isNegativeMetric: boolean = false) => {
    if (isNegativeMetric) {
      if (value < 20) return "bg-green-100 text-green-800 border-green-300";
      if (value < 40) return "bg-amber-100 text-amber-800 border-amber-300";
      return "bg-red-100 text-red-800 border-red-300";
    }
    if (value >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (value >= 60) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const recentShipments = reportData?.shipments.slice(0, 5) || [];

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Rajdhani']">
        📊 Route Performance Overview
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600">Total Shipments</p>
          <p className="text-2xl font-bold text-blue-600">{reportData?.totalShipments || 0}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-gray-600">Active Alerts</p>
          <p className="text-2xl font-bold text-red-600">{reportData?.activeAlerts || 0}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-gray-600">Average Delay</p>
          <p className="text-2xl font-bold text-yellow-600">{reportData?.averageDelay || 0}m</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="text-xs font-medium text-gray-700">
            {reportData?.lastUpdated ? new Date(reportData.lastUpdated).toLocaleTimeString() : "N/A"}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Shipment Performance</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delay
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentShipments.length > 0 ? (
                recentShipments.map((shipment) => {
                  const delayMin =
                    shipment.predictedDelay != null
                      ? Math.round(shipment.predictedDelay)
                      : shipment.expectedETA && shipment.actualETA
                      ? Math.round(
                          (new Date(shipment.actualETA).getTime() - new Date(shipment.expectedETA).getTime()) /
                            (1000 * 60)
                        )
                      : "N/A";

                  return (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shipment.routeId}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            shipment.routeStatus === "completed"
                              ? "bg-green-100 text-green-800"
                              : shipment.routeStatus === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {shipment.routeStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof delayMin === "number" ? (
                          <span className={delayMin > 30 ? "text-red-600 font-semibold" : "text-gray-600"}>
                            {delayMin}m
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {shipment.cargoName || "N/A"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No shipments available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">🧠 AI Evaluation Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.delayPredictionMAE, true)}`}>
            <p className="text-xs font-medium mb-1">Delay Prediction MAE</p>
            <p className="text-2xl font-bold">{aiMetrics.delayPredictionMAE.toFixed(1)} min</p>
          </div>
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.overtriggerRate, true)}`}>
            <p className="text-xs font-medium mb-1">Overtrigger Rate</p>
            <p className="text-2xl font-bold">{aiMetrics.overtriggerRate.toFixed(1)}%</p>
          </div>
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.undertriggerRate, true)}`}>
            <p className="text-xs font-medium mb-1">Undertrigger Rate</p>
            <p className="text-2xl font-bold">{aiMetrics.undertriggerRate.toFixed(1)}%</p>
          </div>
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.alertHitRate)}`}>
            <p className="text-xs font-medium mb-1">Alert Hit Rate</p>
            <p className="text-2xl font-bold">{aiMetrics.alertHitRate.toFixed(1)}%</p>
          </div>
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.routeStabilityScore)}`}>
            <p className="text-xs font-medium mb-1">Route Stability Score</p>
            <p className="text-2xl font-bold">{aiMetrics.routeStabilityScore.toFixed(1)}%</p>
          </div>
          <div className={`rounded-lg p-4 border ${getMetricColor(aiMetrics.systemConfidenceScore)}`}>
            <p className="text-xs font-medium mb-1">System Confidence Score</p>
            <p className="text-2xl font-bold">{aiMetrics.systemConfidenceScore.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4 border-t border-gray-200">
        <button
          onClick={handleDownloadFullReport}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
        >
          {generating ? "Generating Comprehensive Report..." : "Download Comprehensive Report"}
        </button>
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating Comprehensive Report...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}