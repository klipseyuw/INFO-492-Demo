"use client";
import { useState, useEffect } from "react";
import axios from "axios";

interface AgentStatusProps {
  userId: string;
  agentActive: boolean;
}

interface AgentActivity {
  id: string;
  type: string;
  status: string;
  shipment: string | null;
  description: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  metadata: { riskScore?: number | string } | null;
}

interface AgentStatus {
  state: 'active' | 'inactive' | 'idle';
  active: boolean;
  currentTask: string;
  currentActivity: {
    id: string;
    type: string;
    description: string;
    startTime: string;
    shipment?: string | null;
  } | null;
}

export default function AgentStatusMonitor({ userId, agentActive }: AgentStatusProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [statistics, setStatistics] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStatus();
    // Refresh every 1.5 seconds for real-time monitoring
    const interval = setInterval(() => {
      fetchAgentStatus();
    }, 1500);
    return () => clearInterval(interval);
  }, [userId, agentActive]);

  const fetchAgentStatus = async () => {
    try {
      // Increase limit to 20 to show more activities
      const response = await axios.get(`/api/agent/status?userId=${userId}&limit=20`);
      const data = response.data;
      setStatus(data.agentStatus);
      setActivities(data.activities || []);
      setStatistics(data.statistics || {});
      setError(null);
    } catch (error) {
      console.error("Failed to fetch agent status:", error);
      setError("Unable to fetch agent status");
    } finally {
      setLoading(false);
    }
  };

  const triggerSystemCheck = async () => {
    if (!agentActive) return;
    
    try {
      await axios.post('/api/agent/status', {
        userId,
        action: 'system_check'
      });
      
      // Refresh status after triggering check
      setTimeout(() => fetchAgentStatus(), 500);
    } catch (error) {
      console.error("Failed to trigger system check:", error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'threat_detected':
        return (
          <div className="p-2 bg-red-100 rounded-full">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'threat_analysis':
      case 'routine_analysis':
        return (
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        );
      case 'system_check':
        return (
          <div className="p-2 bg-green-100 rounded-full">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'active': return 'text-green-700 bg-green-50 border-green-200';
      case 'inactive': return 'text-red-700 bg-red-50 border-red-200';
      case 'idle': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="card p-6 border-l-4 border-blue-500">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-l-4 border-blue-500">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 font-['Rajdhani']">Agent Activity Monitor</h3>
            <p className="text-sm text-gray-700">Real-time defense agent status and activity</p>
          </div>
          <div className="flex items-center space-x-2">
            {status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status.state)}`}>
                {status.state.toUpperCase()}
              </span>
            )}
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Current Status */}
        {status && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Current Task:</p>
                <p className="text-sm text-gray-700">{status.currentTask}</p>
                {status.currentActivity && (
                  <p className="text-xs text-gray-600 mt-1">
                    Started: {new Date(status.currentActivity.startTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
              {agentActive && (
                <button
                  onClick={triggerSystemCheck}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-all duration-200"
                >
                  System Check
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Performance Statistics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalAnalyses || 0}</div>
            <div className="text-xs text-gray-700">Total Analyses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.threatsDetected || 0}</div>
            <div className="text-xs text-gray-700">Threats Detected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {typeof statistics.avgAnalysisTime === 'number' && statistics.avgAnalysisTime > 0 
                ? formatDuration(Number(statistics.avgAnalysisTime)) 
                : '0ms'}
            </div>
            <div className="text-xs text-gray-700">Avg Analysis Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{statistics.agentUptime || 'Inactive'}</div>
            <div className="text-xs text-gray-700">Agent Status</div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="p-6">
        <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
        
        {error && (
          <div className="text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-700">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No recent activity</p>
            <p className="text-xs text-gray-600">Agent activity will appear here when active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <span className={`px-2 py-1 text-xs rounded ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-700">
                    <span>{new Date(activity.startTime).toLocaleTimeString()}</span>
                    {activity.duration && <span>Duration: {formatDuration(activity.duration)}</span>}
                    {activity.shipment && <span>Shipment: {activity.shipment}</span>}
                  </div>
                  {activity.status === 'failed' && (activity.metadata as any)?.error === 'ai_unavailable' && (
                    <div className="mt-2 text-xs">
                      <span className="px-2 py-1 rounded bg-red-100 text-red-800">AI analysis unavailable</span>
                    </div>
                  )}
                  {(() => {
                    const scoreRaw = activity.metadata?.riskScore;
                    const score = typeof scoreRaw === 'number' ? scoreRaw : Number(scoreRaw);
                    if (!Number.isFinite(score)) return null;
                    const badgeClass = score > 70 ? 'bg-red-100 text-red-800'
                      : score > 40 ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800';
                    return (
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-1 rounded ${badgeClass}`}>
                          Risk Score: {score}/100
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}