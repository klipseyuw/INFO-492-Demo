"use client";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import AgentToggle from "@/components/AgentToggle";
import ShipmentTable from "@/components/ShipmentTable";
import AlertFeed from "@/components/AlertFeed";
import RecentAnalyses from "@/components/RecentAnalyses";
import SimulateAttackButton from "@/components/SimulateAttackButton";
import AgentStatusMonitor from "@/components/AgentStatusMonitor";
import DelayPredictionChart from "@/components/DelayPredictionChart";
import RoutePerformance from "@/components/RoutePerformance";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header id="dashboard" className="relative bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              Logistics Defense <span className="text-blue-600">AI Platform</span>
            </h1>
            <p className="text-gray-700 text-base sm:text-lg mt-2">
              Cybersecurity defense for warehouse logistics operations
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Control Panel */}
          <div id="ai-agent" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-20">
            <AgentToggle userId={DEMO_USER_ID} onToggle={handleAgentToggle} />
            <div id="simulation">
              <SimulateAttackButton 
                userId={DEMO_USER_ID} 
                agentActive={agentActive} 
                onAttackSimulated={handleAttackSimulated}
              />
            </div>
          </div>

          {/* Agent Status Monitor */}
          <AgentStatusMonitor userId={DEMO_USER_ID} agentActive={agentActive} />

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipments - Takes 2/3 of the width on large screens */}
            <div className="lg:col-span-2">
              <ShipmentTable refreshTrigger={refreshKey} />
            </div>

            {/* Right Sidebar - Alerts and Analyses */}
            <div className="lg:col-span-1 space-y-6">
              {/* Alerts */}
              <div id="alerts" className="scroll-mt-20">
                <AlertFeed refreshTrigger={refreshKey} />
              </div>

              {/* Recent Analyses - Shows ALL predictions including safe ones */}
              <div id="analyses" className="scroll-mt-20">
                <RecentAnalyses refreshTrigger={refreshKey} />
              </div>
            </div>
          </div>

          {/* Predictive Analytics Section */}
          <div id="predictive" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-20">
            <DelayPredictionChart refreshTrigger={refreshKey} />
            
            {/* Route Performance */}
            <RoutePerformance />
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">AI Processing</p>
                  <p className="text-2xl font-semibold text-blue-600">Real-time</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Security Status</p>
                  <p className="text-2xl font-semibold text-green-600">Protected</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Data Integrity</p>
                  <p className="text-2xl font-semibold text-purple-600">Verified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 font-['Rajdhani']">
              Getting Started
            </h3>
            <div className="text-gray-700 space-y-2">
              <p>1. <strong>Enable the AI Agent</strong> using the toggle above to start monitoring logistics data</p>
              <p>2. <strong>Run the simulation script</strong> to generate test shipment data: <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">npm run simulate</code></p>
              <p>3. <strong>Monitor alerts</strong> in the right panel for detected anomalies</p>
              <p>4. <strong>Configure your environment</strong> with a PostgreSQL database and OpenRouter API key</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}