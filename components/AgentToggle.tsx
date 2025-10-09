"use client";
import { useState, useEffect } from "react";
import axios from "axios";

interface AgentToggleProps {
  userId: string;
  onToggle?: (newStatus: boolean) => void;
}

export default function AgentToggle({ userId, onToggle }: AgentToggleProps) {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStatus();
  }, [userId]);

  const fetchAgentStatus = async () => {
    try {
      const response = await axios.get(`/api/agent/toggle?userId=${userId}`);
      if (response.data.success) {
        setIsActive(response.data.user.agentActive);
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error);
      setError("Failed to fetch agent status");
    }
  };

  const toggleAgent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newState = !isActive;
      const response = await axios.post("/api/agent/toggle", { 
        userId, 
        activate: newState 
      });
      
      if (response.data.success) {
        setIsActive(newState);
        onToggle?.(newState); // Notify parent component
      } else {
        throw new Error("Failed to toggle agent");
      }
    } catch (error) {
      console.error("Failed to toggle agent:", error);
      setError("Failed to toggle agent status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#F4F6FF] font-['Rajdhani'] text-glow">
            AI Defense Agent
          </h3>
          <p className="text-sm text-[#D0D6EB] mt-1">
            {isActive 
              ? "Agent is actively monitoring logistics data for anomalies"
              : "Agent is disabled - no AI monitoring active"
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isActive 
              ? "bg-green-100 text-green-800" 
              : "bg-gray-100 text-gray-800"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isActive ? "bg-green-500" : "bg-gray-400"
            }`}></div>
            <span>{isActive ? "Active" : "Inactive"}</span>
          </div>
          
          <button
            onClick={toggleAgent}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:brightness-110 ${
              isActive
                ? "bg-gradient-to-r from-[#EC4899] to-[#F43F5E] text-white shadow-md hover:shadow-red-500/40"
                : "bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white shadow-md hover:shadow-blue-500/40"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "..." : isActive ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}