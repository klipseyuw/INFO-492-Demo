"use client";
import { useState, useEffect } from "react";
import AgentToggle from "@/components/AgentToggle";
import ShipmentTable from "@/components/ShipmentTable";
import AlertFeed from "@/components/AlertFeed";
import SimulateAttackButton from "@/components/SimulateAttackButton";
import AgentStatusMonitor from "@/components/AgentStatusMonitor";
import DelayPredictionChart from "@/components/DelayPredictionChart";
import axios from "axios";

// For demo purposes, using a static user ID
// In production, this would come from authentication
const DEMO_USER_ID = "user-1";

export default function Dashboard() {
  const [agentActive, setAgentActive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const response = await axios.get(`/api/agent/toggle?userId=${DEMO_USER_ID}`);
      if (response.data.success) {
        setAgentActive(response.data.user.agentActive);
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error);
    }
  };

  const handleAgentToggle = (newStatus: boolean) => {
    setAgentActive(newStatus);
  };

  const handleAttackSimulated = () => {
    // Force refresh of child components by updating the key
    setRefreshKey(prev => prev + 1);
  };
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#312E81] shadow-lg border-b border-[#334155]/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.4)] tracking-tight">
              Logistics Defense <span className="text-[#A5B4FC]">AI Platform</span>
            </h1>
            <p className="text-[#E0E7FF]/90 text-base sm:text-lg mt-2 tracking-wide">
              Cybersecurity defense for warehouse logistics operations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#4ADE80] rounded-full shadow-[0_0_10px_#4ADE80]"></div>
            <span className="text-[#BBF7D0] font-medium text-sm sm:text-base">System Online</span>
          </div>
        </div>

        {/* Subtle glow line */}
        <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-[#60A5FA]/30 via-[#818CF8]/30 to-[#A78BFA]/30"></div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentToggle userId={DEMO_USER_ID} onToggle={handleAgentToggle} />
            <SimulateAttackButton 
              userId={DEMO_USER_ID} 
              agentActive={agentActive} 
              onAttackSimulated={handleAttackSimulated}
            />
          </div>

          {/* Agent Status Monitor */}
          <AgentStatusMonitor userId={DEMO_USER_ID} agentActive={agentActive} />

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipments - Takes 2/3 of the width on large screens */}
            <div className="lg:col-span-2">
              <ShipmentTable refreshTrigger={refreshKey} />
            </div>

            {/* Alerts - Takes 1/3 of the width on large screens */}
            <div className="lg:col-span-1">
              <AlertFeed refreshTrigger={refreshKey} />
            </div>
          </div>

          {/* Predictive Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DelayPredictionChart refreshTrigger={refreshKey} />
            
            {/* Additional Analytics Placeholder */}
            <div className="bg-[#201C3D]/85 border-[#3C3470]/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-[#F4F6FF] font-['Rajdhani'] text-glow">
                Route Performance
              </h3>
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-[#D0D6EB]">Route analytics coming soon</p>
                <p className="text-sm text-[#D0D6EB] mt-1">
                  Performance metrics by route and driver
                </p>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-[#F4F6FF] p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#3B82F6]/20 rounded-lg">
                  <svg className="w-6 h-6 text-[#60A5FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#D0D6EB]">AI Processing</p>
                  <p className="text-2xl font-semibold text-[#60A5FA]">Real-time</p>
                </div>
              </div>
            </div>

            <div className="card text-[#F4F6FF] p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#34D399]/20 rounded-lg">
                  <svg className="w-6 h-6 text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#D0D6EB]">Security Status</p>
                  <p className="text-2xl font-semibold text-[#34D399]">Protected</p>
                </div>
              </div>
            </div>

            <div className="card text-[#F4F6FF] p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#A855F7]/20 rounded-lg">
                  <svg className="w-6 h-6 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#D0D6EB]">Data Integrity</p>
                  <p className="text-2xl font-semibold text-[#A78BFA]">Verified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="card text-[#F4F6FF] p-6">
            <h3 className="text-lg font-semibold text-[#F4F6FF] mb-2 font-['Rajdhani'] text-glow">
              Getting Started
            </h3>
            <div className="text-[#D0D6EB] space-y-2">
              <p>1. <strong>Enable the AI Agent</strong> using the toggle above to start monitoring logistics data</p>
              <p>2. <strong>Run the simulation script</strong> to generate test shipment data: <code className="bg-[#3B82F6]/30 text-[#EAF0FF] px-2 py-1 rounded font-mono">npm run simulate</code></p>
              <p>3. <strong>Monitor alerts</strong> in the right panel for detected anomalies</p>
              <p>4. <strong>Configure your environment</strong> with a PostgreSQL database and OpenRouter API key</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}