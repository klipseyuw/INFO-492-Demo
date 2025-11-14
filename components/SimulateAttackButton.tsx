"use client";
import { useState } from "react";
import axios from "axios";

interface SimulateAttackButtonProps {
  userId: string;
  agentActive?: boolean;
  onAttackSimulated?: () => void;
}

export default function SimulateAttackButton({ userId, agentActive = false, onAttackSimulated }: SimulateAttackButtonProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastAttack, setLastAttack] = useState<string | null>(null);

  const simulateAttack = async () => {
    setIsSimulating(true);
    try {
      const response = await axios.post("/api/simulate-attack", { userId });
      const { scenario, agentActive, defenseAnalysis, message } = response.data;
      
      setLastAttack(`${scenario.type}: ${scenario.description}`);
      
      // Show clear distinction between agent active/inactive
      let alertMessage;
      if (agentActive && defenseAnalysis?.threatDetected) {
        const usingFallback = defenseAnalysis.agentAnalysis?.usingFallback;
        const fallbackInfo = usingFallback ? `\n\n⚠️ Using Fallback AI: ${defenseAnalysis.agentAnalysis?.fallbackReason || 'OpenRouter API unavailable'}` : '';
        alertMessage = `🛡️ THREAT DETECTED!\n\nDefense Agent Analysis:\n• Risk Score: ${defenseAnalysis.agentAnalysis?.riskScore || 'N/A'}/100\n• Threat: ${defenseAnalysis.agentAnalysis?.alertType || 'Unknown'}\n• Severity: ${defenseAnalysis.agentAnalysis?.severity || 'Unknown'}${fallbackInfo}\n\nAlert created and recommendations generated!\n\nCheck the alerts panel for details.`;
      } else if (agentActive) {
        const usingFallback = defenseAnalysis?.agentAnalysis?.usingFallback;
        const fallbackInfo = usingFallback ? `\n\n⚠️ Using Fallback AI: ${defenseAnalysis.agentAnalysis?.fallbackReason || 'OpenRouter API unavailable'}` : '';
        alertMessage = `✅ Defense Agent Active\n\nShipment analyzed but no threat detected.\nAgent is monitoring for anomalies...${fallbackInfo}\n\nCheck the shipments table for the new entry.`;
      } else {
        alertMessage = `⚠️ DEFENSE AGENT INACTIVE!\n\nSuspicious shipment created but NOT analyzed.\nThreats may go undetected!\n\nEnable the AI Agent to detect attacks.\nCheck the shipments table for the new entry.`;
      }
      
      alert(alertMessage);
      
      // Notify parent component to refresh data immediately
      if (onAttackSimulated) {
        setTimeout(() => onAttackSimulated(), 100); // Small delay to ensure server processing is complete
      }
      
    } catch (error) {
      console.error("Failed to simulate attack:", error);
      alert("Failed to simulate attack. Check console for details.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="card p-6 border-l-4 border-red-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 font-['Rajdhani']">
            Attack Simulation
          </h3>
          <p className="text-sm text-gray-700">
            Generate a realistic cyber-physical attack scenario for testing
          </p>
          <div className={`mt-2 inline-flex items-center px-2 py-1 rounded text-xs ${
            agentActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              agentActive ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            Defense Agent: {agentActive ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>
        <div className="p-2 bg-red-100 rounded-lg">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      </div>

      {lastAttack && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            <strong>Last Simulation:</strong> {lastAttack}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={simulateAttack}
          disabled={isSimulating}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isSimulating
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {isSimulating ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Simulating Attack...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Simulate Attack
            </div>
          )}
        </button>
        
        <div className="flex items-center text-xs text-gray-600 px-2">
          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Safe testing only
        </div>
      </div>
    </div>
  );
}