// In-memory agent activity logging utility (non-persistent, dev/demo only)
// For production, replace with Prisma model persistence.

export interface AgentActivityLogEntry {
  id: string;
  userId: string;
  type: string; // routine_analysis | threat_analysis | threat_detected | system_check
  status: string; // started | in_progress | completed | failed
  shipmentId?: string | null;
  description: string;
  timestamp: Date;
  duration?: number; // ms
  metadata?: Record<string, unknown>;
}

const MAX_ACTIVITIES = 50;
const activityLog: AgentActivityLogEntry[] = [];

function trim() {
  if (activityLog.length > MAX_ACTIVITIES) activityLog.splice(MAX_ACTIVITIES);
}

export function logActivity(entry: Omit<AgentActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Date }) {
  const full: AgentActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    timestamp: entry.timestamp || new Date(),
    ...entry,
  };
  activityLog.unshift(full);
  trim();
  return full;
}

export function updateActivity(id: string, patch: Partial<AgentActivityLogEntry>) {
  const idx = activityLog.findIndex(a => a.id === id);
  if (idx !== -1) {
    activityLog[idx] = { ...activityLog[idx], ...patch };
    return activityLog[idx];
  }
  return null;
}

export function getUserActivities(userId: string, limit = 10) {
  return activityLog.filter(a => a.userId === userId).slice(0, limit);
}

export function getRecentInProgress(userId: string) {
  const now = Date.now();
  return activityLog.find(a => a.userId === userId && a.status === 'in_progress' && (now - a.timestamp.getTime()) < 10000);
}
