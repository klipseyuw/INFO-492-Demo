// app/database/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "ADMIN" | "ANALYST" | "OPERATOR";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: string;
  lastLoginIP: string | null;
  lastLoginLocation: string | null;
  failedLogin10m: number;
  tableReads5m: number;
  sensitiveReadsMB5m: number;
};

type AccessEvent = {
  id: string;
  userId: string;
  action: string;
  tableName: string;
  estSizeMB?: number;
  timestamp: string;
  ip: string;
  location: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    region: string;
  };
};

type Anomaly = {
  id: string;
  userId?: string | null;
  type: string;
  severity: string;
  description: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
};

type AgentConfig = {
  bruteForceFailures: number;
  sensitiveBurstMB: number;
  exportSpikeMB: number;
};

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  bruteForceFailures: 5,
  sensitiveBurstMB: 100,
  exportSpikeMB: 200,
};

export default function DatabaseConsole() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [access, setAccess] = useState<AccessEvent[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    ...DEFAULT_AGENT_CONFIG,
  });
  const [filter, setFilter] = useState("");
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, eventsRes, anomaliesRes] = await Promise.all([
        fetch("/api/database/users"),
        fetch("/api/database/access-events?limit=150"),
        fetch("/api/database/anomalies?limit=100"),
      ]);

      if (!usersRes.ok || !eventsRes.ok || !anomaliesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();
      const anomaliesData = await anomaliesRes.json();

      setUsers(usersData.users || []);
      setAccess(eventsData.events || []);
      setAnomalies(anomaliesData.anomalies || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.region.toLowerCase().includes(q)
    );
  }, [users, filter]);

  const runAgent = async () => {
    try {
      const response = await fetch("/api/database/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCount: 0,
          loginCount: 0,
          accessCount: 0,
          runAgent: true,
        }),
      });

      if (!response.ok) throw new Error("Agent run failed");

      const result = await response.json();
      console.log("Agent detected", result.stats.anomaliesDetected, "anomalies");
      await fetchData();
    } catch (err) {
      console.error("Error running agent:", err);
      setError("Failed to run agent. Please try again.");
    }
  };

  const simulateData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/database/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCount: 25,
          loginCount: 50,
          accessCount: 100,
          runAgent: true,
        }),
      });

      if (!response.ok) throw new Error("Simulation failed");

      const result = await response.json();
      console.log("Simulation completed:", result.stats);
      await fetchData();
    } catch (err) {
      console.error("Error simulating data:", err);
      setError("Failed to simulate data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const runLiveFor10s = async () => {
    setRunning(true);
    const start = Date.now();

    while (Date.now() - start < 10_000) {
      await fetch("/api/database/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCount: 0,
          loginCount: 5,
          accessCount: 10,
          runAgent: true,
        }),
      });

      await fetchData();
      await new Promise((r) => setTimeout(r, 1000));
    }

    setRunning(false);
  };

  const clearAllData = async () => {
    if (!confirm("Are you sure you want to clear all database monitoring data? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/database/simulate", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Clear failed");
      setUsers([]);
      setAccess([]);
      setAnomalies([]);
    } catch (err) {
      console.error("Error clearing data:", err);
      setError("Failed to clear data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Database <span className="text-blue-600">Security Monitor</span>
            </h1>
            <p className="text-gray-600 text-sm">
              {users.length} users  {access.length} recent access events  {anomalies.length} anomalies
            </p>
          </div>
          <Link href="/dashboard" className="text-sm rounded-lg border px-4 py-2 hover:bg-gray-50">
             Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Agent Controls</h3>
              <div className="flex gap-2">
                <button onClick={fetchData} disabled={loading} className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50">
                  {loading ? "Loading..." : "Refresh Data"}
                </button>
                <button onClick={clearAllData} disabled={loading} className="rounded-lg border border-red-300 text-red-600 px-4 py-2 hover:bg-red-50 disabled:opacity-50">
                  Clear All Data
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by name, email, role, region..." className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Brute Failures</label>
                  <input type="number" className="w-full rounded-lg border px-2 py-2" value={agentConfig.bruteForceFailures} onChange={(e) => setAgentConfig((c) => ({ ...c, bruteForceFailures: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Sensitive Burst MB</label>
                  <input type="number" className="w-full rounded-lg border px-2 py-2" value={agentConfig.sensitiveBurstMB} onChange={(e) => setAgentConfig((c) => ({ ...c, sensitiveBurstMB: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Export Spike MB</label>
                  <input type="number" className="w-full rounded-lg border px-2 py-2" value={agentConfig.exportSpikeMB} onChange={(e) => setAgentConfig((c) => ({ ...c, exportSpikeMB: Number(e.target.value || 0) }))} />
                </div>
                <div className="flex items-end">
                  <button onClick={runAgent} disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                    Run AI Agent
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button disabled={running || loading} onClick={runLiveFor10s} className={`rounded-lg px-4 py-2 font-medium text-white ${running || loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                {running ? "Live Scan (10s)..." : "Live Scan (10s)"}
              </button>
              <button onClick={simulateData} disabled={loading || running} className="rounded-lg border border-green-600 text-green-600 px-4 py-2 hover:bg-green-50 disabled:opacity-50">
                Simulate Data
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-white p-0 overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Users</h3>
              <p className="text-sm text-gray-600">Real-time database user monitoring. Data stored in PostgreSQL.</p>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">No users found</p>
                <p className="text-sm">Click <b>Simulate Data</b> to generate sample users and activity.</p>
              </div>
            ) : (
              <>
                <div className="h-[520px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Region</th>
                        <th className="px-4 py-3">Failed(10m)</th>
                        <th className="px-4 py-3">Reads(5m)</th>
                        <th className="px-4 py-3">SensitiveMB(5m)</th>
                        <th className="px-4 py-3">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const rowAnoms = anomalies.filter((a) => a.userId === u.id);
                        const flag = rowAnoms.length > 0;
                        return (
                          <tr key={u.id} className={`border-t ${flag ? "bg-red-50/60" : ""}`}>
                            <td className="px-4 py-3 font-medium">{u.name}</td>
                            <td className="px-4 py-3">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : u.role === "ANALYST" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">{u.region}</td>
                            <td className={`px-4 py-3 ${u.failedLogin10m >= agentConfig.bruteForceFailures ? "text-red-600 font-semibold" : ""}`}>
                              {u.failedLogin10m}
                            </td>
                            <td className="px-4 py-3">{u.tableReads5m}</td>
                            <td className={`px-4 py-3 ${u.sensitiveReadsMB5m >= agentConfig.sensitiveBurstMB ? "text-red-600 font-semibold" : ""}`}>
                              {u.sensitiveReadsMB5m}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-800">{u.lastLoginLocation || "N/A"}</div>
                              <div className="text-xs text-gray-500">{u.lastLoginIP || "N/A"}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-3 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing <b>{filteredUsers.length}</b> of {users.length}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-0 overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">AI Agent Anomalies</h3>
              <p className="text-sm text-gray-600">Detected security threats and violations.</p>
            </div>

            <div className="h-[520px] overflow-auto divide-y">
              {anomalies.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  No anomalies detected yet. Click <b>Run AI Agent</b> or try a <b>Live Scan</b>.
                </div>
              ) : (
                anomalies.map((a) => (
                  <div key={a.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{a.type.replaceAll("_", " ")}</span>
                      <span className={`text-xs px-2 py-1 rounded ${a.severity === "CRITICAL" ? "bg-red-600 text-white" : a.severity === "HIGH" ? "bg-red-100 text-red-700" : a.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800 mt-1">{a.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {a.user?.email ? `User: ${a.user.email}  ` : ""}
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">Total: <b>{anomalies.length}</b></div>
              <button className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Scroll to Top
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h4 className="text-md font-semibold mb-4">Recent Access Events</h4>
          {access.length === 0 ? (
            <p className="text-sm text-gray-500">No access events recorded yet.</p>
          ) : (
            <div className="h-[300px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Action</th>
                    <th className="px-4 py-2">Table</th>
                    <th className="px-4 py-2">Size (MB)</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {access.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2">{e.user?.email || "Unknown"}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${e.action === "EXPORT" ? "bg-red-100 text-red-700" : e.action === "DELETE" ? "bg-orange-100 text-orange-700" : e.action === "UPDATE" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-2">{e.tableName}</td>
                      <td className="px-4 py-2">{e.estSizeMB ? Math.round(e.estSizeMB * 10) / 10 : "N/A"}</td>
                      <td className="px-4 py-2 text-xs">
                        <div>{e.location}</div>
                        <div className="text-gray-500">{e.ip}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
