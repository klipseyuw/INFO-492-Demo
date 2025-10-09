import AgentToggle from "@/components/AgentToggle";
import ShipmentTable from "@/components/ShipmentTable";
import AlertFeed from "@/components/AlertFeed";

// For demo purposes, using a static user ID
// In production, this would come from authentication
const DEMO_USER_ID = "user-1";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Logistics Defense AI Platform
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Cybersecurity defense for warehouse logistics operations
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Agent Control Panel */}
          <AgentToggle userId={DEMO_USER_ID} />

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipments - Takes 2/3 of the width on large screens */}
            <div className="lg:col-span-2">
              <ShipmentTable />
            </div>

            {/* Alerts - Takes 1/3 of the width on large screens */}
            <div className="lg:col-span-1">
              <AlertFeed />
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">AI Processing</p>
                  <p className="text-2xl font-semibold text-gray-900">Real-time</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Status</p>
                  <p className="text-2xl font-semibold text-gray-900">Protected</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Data Integrity</p>
                  <p className="text-2xl font-semibold text-gray-900">Verified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Getting Started
            </h3>
            <div className="text-blue-800 space-y-2">
              <p>1. <strong>Enable the AI Agent</strong> using the toggle above to start monitoring logistics data</p>
              <p>2. <strong>Run the simulation script</strong> to generate test shipment data: <code className="bg-blue-100 px-2 py-1 rounded">npm run simulate</code></p>
              <p>3. <strong>Monitor alerts</strong> in the right panel for detected anomalies</p>
              <p>4. <strong>Configure your environment</strong> with a PostgreSQL database and OpenRouter API key</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}