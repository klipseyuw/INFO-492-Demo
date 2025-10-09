"use client";
import { useState } from "react";
import axios from "axios";

interface AnalysisReportProps {
  shipmentId: string;
  alertId?: string;
  onClose: () => void;
}

export default function AnalysisReport({ shipmentId, alertId, onClose }: AnalysisReportProps) {
  interface ReportData {
    reportId: string;
    executiveSummary: { threatLevel: string; primaryThreat: string; riskAssessment: string; impactAssessment: string };
    incidentDetails: { shipmentId: string; driverName: string; detectionTime: string; delayMinutes: number; currentStatus: string; expectedETA: string };
    threatAnalysis: { description: string; indicators: string[]; potentialCauses: string[] };
    recommendations: { immediate: string[]; shortTerm: string[] };
    recoveryPlan: { containment: string[]; investigation: string[] };
    compliance: { reportingObligation: string; documentationNeeded: string[] };
    generatedAt: string;
  }
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (shipmentId) params.append('shipmentId', shipmentId);
      if (alertId) params.append('alertId', alertId);
      
      const response = await axios.get(`/api/analysis-report?${params}`);
      setReport(response.data);
    } catch (error) {
      console.error("Failed to generate report:", error);
      setError("Failed to generate analysis report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating Security Analysis Report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    generateReport();
    return null;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Generation Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Security Analysis Report</h2>
            <p className="text-sm text-gray-500">Report ID: {report.reportId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Executive Summary */}
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Executive Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Threat Level:</strong> <span className="text-red-700">{report.executiveSummary.threatLevel}</span></p>
                <p><strong>Primary Threat:</strong> {report.executiveSummary.primaryThreat}</p>
              </div>
              <div>
                <p><strong>Risk Assessment:</strong> {report.executiveSummary.riskAssessment}</p>
                <p><strong>Impact:</strong> {report.executiveSummary.impactAssessment}</p>
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Incident Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p><strong>Shipment ID:</strong> {report.incidentDetails.shipmentId}</p>
                <p><strong>Driver:</strong> {report.incidentDetails.driverName}</p>
              </div>
              <div>
                <p><strong>Detection Time:</strong> {new Date(report.incidentDetails.detectionTime).toLocaleString()}</p>
                <p><strong>Delay:</strong> {report.incidentDetails.delayMinutes} minutes</p>
              </div>
              <div>
                <p><strong>Status:</strong> {report.incidentDetails.currentStatus}</p>
                <p><strong>Expected ETA:</strong> {new Date(report.incidentDetails.expectedETA).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Threat Analysis */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Threat Analysis</h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Description:</p>
                <p className="text-gray-700">{report.threatAnalysis.description}</p>
              </div>
              <div>
                <p className="font-medium">Indicators:</p>
                <ul className="list-disc list-inside text-gray-700">
                  {report.threatAnalysis.indicators.map((indicator: string, index: number) => (
                    <li key={index}>{indicator}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Potential Causes:</p>
                <ul className="list-disc list-inside text-gray-700">
                  {report.threatAnalysis.potentialCauses.map((cause: string, index: number) => (
                    <li key={index}>{cause}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Security Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-blue-800 mb-2">Immediate Actions:</p>
                <ul className="list-disc list-inside text-blue-700 text-sm">
                  {report.recommendations.immediate.map((action: string, index: number) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-800 mb-2">Short-term Actions:</p>
                <ul className="list-disc list-inside text-blue-700 text-sm">
                  {report.recommendations.shortTerm.map((action: string, index: number) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recovery Plan */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Recovery & Response Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-green-800 mb-2">Containment:</p>
                <ul className="list-disc list-inside text-green-700">
                  {report.recoveryPlan.containment.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-800 mb-2">Investigation:</p>
                <ul className="list-disc list-inside text-green-700">
                  {report.recoveryPlan.investigation.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Compliance & Documentation</h3>
            <div className="text-sm space-y-2">
              <p><strong>Reporting Obligation:</strong> {report.compliance.reportingObligation}</p>
              <div>
                <p className="font-medium">Required Documentation:</p>
                <ul className="list-disc list-inside text-gray-700">
                  {report.compliance.documentationNeeded.map((doc: string, index: number) => (
                    <li key={index}>{doc}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}