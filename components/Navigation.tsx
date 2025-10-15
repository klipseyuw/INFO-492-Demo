"use client";

import { useRouter } from "next/navigation";

export default function Navigation() {
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogout = async () => {
    try {
      // Send logout request to clear server-side session cookie
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Ensure cookies are sent and cleared
      });

      // Wait for successful response
      if (response.ok) {
        // Redirect to login page after successful logout
        router.push("/login");
        router.refresh(); // Refresh to clear any cached data
      } else {
        throw new Error(`Logout failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even on error to clear client state
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('dashboard')}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-200 py-4 border-b-2 border-transparent hover:border-blue-300"
            >
              Dashboard
            </button>
            <button
              onClick={() => scrollToSection('ai-agent')}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-200 py-4 border-b-2 border-transparent hover:border-blue-300"
            >
              AI Agent
            </button>
            <button
              onClick={() => scrollToSection('alerts')}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-200 py-4 border-b-2 border-transparent hover:border-blue-300"
            >
              Alerts
            </button>
            <button
              onClick={() => scrollToSection('predictive')}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-200 py-4 border-b-2 border-transparent hover:border-blue-300"
            >
              Predictive Analytics
            </button>
            <button
              onClick={() => scrollToSection('simulation')}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-200 py-4 border-b-2 border-transparent hover:border-blue-300"
            >
              Simulation
            </button>
          </div>

          {/* System Status & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">System Online</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


