"use client";
import { useState } from "react";
import axios from "axios";

interface AlertFeedbackModalProps {
  // Target being rated can be an alert or an analysis (safe prediction)
  targetType?: 'alert' | 'analysis';
  id: string; // alertId or analysisId depending on targetType
  alertType: string;
  severity: string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AlertFeedbackModal({
  targetType = 'alert',
  id,
  alertType,
  severity,
  onClose,
  onSubmit
}: AlertFeedbackModalProps) {
  const [riskScoreAccurate, setRiskScoreAccurate] = useState<boolean | null>(null);
  const [attackTypeCorrect, setAttackTypeCorrect] = useState<boolean | null>(null);
  const [actualAttackType, setActualAttackType] = useState("");
  const [actualRiskScore, setActualRiskScore] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Derive risk score from severity
  const aiRiskScore = severity === 'high' ? 75 : severity === 'medium' ? 50 : 25;

  const handleSubmit = async () => {
    if (riskScoreAccurate === null || attackTypeCorrect === null) {
      alert("Please rate both risk score and attack type accuracy");
      return;
    }

    setSubmitting(true);
    try {
      if (targetType === 'alert') {
        await axios.post("/api/alerts/feedback", {
          alertId: id,
          riskScoreAccurate,
          attackTypeCorrect,
          actualAttackType: attackTypeCorrect ? null : actualAttackType,
          actualRiskScore: riskScoreAccurate ? null : parseInt(actualRiskScore) || null,
          notes,
          aiRiskScore,
          aiAttackType: alertType,
          shipmentContext: JSON.stringify({ id, severity, alertType, type: 'alert' })
        });
      } else {
        await axios.post("/api/analyses/feedback", {
          analysisId: id,
          riskScoreAccurate,
          attackTypeCorrect,
          actualAttackType: attackTypeCorrect ? null : actualAttackType,
          actualRiskScore: riskScoreAccurate ? null : parseInt(actualRiskScore) || null,
          notes
        });
      }

  alert("✅ Feedback submitted! The AI will learn from your input.");
      onSubmit();
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const attackTypes = [
    "ROUTE_MANIPULATION",
    "GPS_SPOOFING",
    "CARGO_TAMPERING",
    "ETA_FRAUD",
    "DRIVER_IMPERSONATION",
    "CYBER_ATTACK",
    "NORMAL_OPERATION"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            🎯 Rate Alert Accuracy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Alert Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">AI Agent&apos;s Assessment:</h3>
            <p className="text-sm text-gray-700">
              <strong>Severity:</strong> {severity.toUpperCase()} (Risk Score: ~{aiRiskScore})
            </p>
            <p className="text-sm text-gray-700">
              <strong>Attack Type:</strong> {alertType}
            </p>
          </div>

          {/* Risk Score Rating */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-900">
              Was the risk score appropriate?
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setRiskScoreAccurate(true)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  riskScoreAccurate === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 hover:border-green-400"
                }`}
              >
                ✓ Yes, accurate
              </button>
              <button
                onClick={() => setRiskScoreAccurate(false)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  riskScoreAccurate === false
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300 hover:border-red-400"
                }`}
              >
                ✗ No, incorrect
              </button>
            </div>
          </div>

          {/* Actual Risk Score Input */}
          {riskScoreAccurate === false && (
            <div className="space-y-2">
              <label className="block font-semibold text-gray-900">
                What should the risk score have been? (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={actualRiskScore}
                onChange={(e) => setActualRiskScore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter 0-100"
              />
            </div>
          )}

          {/* Attack Type Rating */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-900">
              Was the attack type correctly identified?
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setAttackTypeCorrect(true)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  attackTypeCorrect === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 hover:border-green-400"
                }`}
              >
                ✓ Yes, correct
              </button>
              <button
                onClick={() => setAttackTypeCorrect(false)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  attackTypeCorrect === false
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300 hover:border-red-400"
                }`}
              >
                ✗ No, incorrect
              </button>
            </div>
          </div>

          {/* Actual Attack Type Selection */}
          {attackTypeCorrect === false && (
            <div className="space-y-2">
              <label className="block font-semibold text-gray-900">
                What was the actual attack type?
              </label>
              <select
                value={actualAttackType}
                onChange={(e) => setActualAttackType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select actual type --</option>
                {attackTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-900">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Any additional context or observations..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 How this helps:</strong> Your feedback trains the AI agent using few-shot learning. 
              The next time it analyzes similar scenarios, it will reference your corrections to make more accurate predictions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || riskScoreAccurate === null || attackTypeCorrect === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
