// app/database/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/** ---------------------------
 * Mock Types
 * --------------------------*/
type Role = "ADMIN" | "ANALYST" | "OPERATOR";
type Region = "PNW" | "SW" | "NE" | "SE" | "MW";
type AccessAction = "SELECT" | "UPDATE" | "DELETE" | "EXPORT";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: Region;
  lastLoginIP: string;
  lastLoginLoc: string; // "City, CC"
  failedLogin10m: number;
  tableReads5m: number;
  sensitiveReadsMB5m: number; // approximate data read size from sensitive tables
};

type AccessEvent = {
  id: string;
  userId: string;
  action: AccessAction;
  tableName: string;
  estSizeMB?: number;
  ts: number;
  ip: string;
  location: string;
};

type Anomaly = {
  id: string;
  userId?: string;
  userEmail?: string;
  type:
    | "LOGIN_BRUTE_FORCE"
    | "NEW_GEO_LOGIN"
    | "RBAC_VIOLATION"
    | "EXPORT_SPIKE"
    | "SENSITIVE_READ_BURST";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  when: number;
};

/** ---------------------------
 * Utilities (pure client)
 * --------------------------*/
const names = [
  "Avery","Jordan","Taylor","Riley","Dakota","Skyler","Harper","Quinn","Rowan","Elliot",
  "Reese","Alex","Casey","Jamir","Mila","Isla","Kai","Owen","Noah","Liam","Maya","Zoe","Nina","Ivy","Beck"
];
const roles: Role[] = ["ADMIN", "ANALYST", "OPERATOR"];
const regions: Region[] = ["PNW", "SW", "NE", "SE", "MW"];
const tables = ["Shipments", "Alerts", "Analyses", "Users", "Billing", "Drivers", "Vehicles", "Warehouses"];
const cities = ["Seattle, US", "Portland, US", "San Jose, US", "Austin, US", "NYC, US", "Boston, US", "Miami, US", "Chicago, US"];
const ips = ["10.0.0.1","10.0.0.2","54.12.33.9","100.64.2.10","34.201.99.4","198.51.100.22","203.0.113.55","192.0.2.1"];

const rand = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const rid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

/** Mock user generator */
function makeUsers(n = 50): UserRow[] {
  return Array.from({ length: n }, () => {
    const first = rand(names);
    const last = rand(names);
    const role = rand(roles);
    const region = rand(regions);
    const email = `${first}.${last}@example.com`.toLowerCase().replace(/\s+/g, "");
    return {
      id: rid(),
      name: `${first} ${last}`,
      email,
      role,
      region,
      lastLoginIP: rand(ips),
      lastLoginLoc: rand(cities),
      failedLogin10m: Math.random() < 0.15 ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 3),
      tableReads5m: 5 + Math.floor(Math.random() * 40),
      sensitiveReadsMB5m: Math.random() < 0.2 ? Math.floor(20 + Math.random() * 200) : Math.floor(Math.random() * 20),
    };
  });
}

/** Mock recent access logs */
function makeAccessLog(users: UserRow[], n = 120): AccessEvent[] {
  return Array.from({ length: n }, () => {
    const u = rand(users);
    const action = Math.random() < 0.1 ? "EXPORT" : rand(["SELECT", "UPDATE", "DELETE"] as AccessAction[]);
    const tableName = rand(tables);
    const big = Math.random() < 0.15;
    return {
      id: rid(),
      userId: u.id,
      action,
      tableName,
      estSizeMB: action === "EXPORT" || big ? Math.floor(10 + Math.random() * 500) : Math.floor(Math.random() * 8),
      ts: now() - Math.floor(Math.random() * 1000 * 60 * 15),
      ip: rand(ips),
      location: rand(cities),
    };
  });
}

/** ---------------------------
 * Client-side "AI Agent" rules
 * --------------------------*/
type AgentConfig = {
  bruteForceFailures: number;       // >= triggers LOGIN_BRUTE_FORCE
  sensitiveBurstMB: number;         // >= in 5m triggers SENSITIVE_READ_BURST
  exportSpikeMB: number;            // >= per event triggers EXPORT_SPIKE
  operatorForbiddenTables: string[]; // RBAC_VIOLATION
  knownRegions: Record<string, string[]>; // userEmail -> allowed geo list (demo)
};

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  bruteForceFailures: 5,
  sensitiveBurstMB: 100,
  exportSpikeMB: 200,
  operatorForbiddenTables: ["Users", "Billing"],
  knownRegions: {}, // filled dynamically on first run
};

function runAgent(users: UserRow[], access: AccessEvent[], config: AgentConfig): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Seed known regions by user on first pass (demo heuristic)
  if (Object.keys(config.knownRegions).length === 0) {
    const map: Record<string, string[]> = {};
    for (const u of users) {
      map[u.email] = ["Seattle, US","Portland, US","San Jose, US","Austin, US","NYC, US"].slice(0, 2 + Math.floor(Math.random()*2));
      // Add their last known location as allowed
      if (!map[u.email].includes(u.lastLoginLoc)) map[u.email].push(u.lastLoginLoc);
    }
    config.knownRegions = map;
  }

  const byUser: Record<string, UserRow> = Object.fromEntries(users.map(u => [u.id, u]));

  // Rule 1: Brute force (failed logins)
  for (const u of users) {
    if (u.failedLogin10m >= config.bruteForceFailures) {
      anomalies.push({
        id: rid(),
        userId: u.id,
        userEmail: u.email,
        type: "LOGIN_BRUTE_FORCE",
        severity: u.failedLogin10m >= config.bruteForceFailures + 2 ? "CRITICAL" : "HIGH",
        description: `Detected ${u.failedLogin10m} failed logins in last 10m.`,
        when: now(),
      });
    }
  }

  // Rule 2: New geo login (simple heuristic: last login loc not in known list)
  for (const u of users) {
    const allowed = config.knownRegions[u.email] || [];
    if (!allowed.includes(u.lastLoginLoc)) {
      anomalies.push({
        id: rid(),
        userId: u.id,
        userEmail: u.email,
        type: "NEW_GEO_LOGIN",
        severity: "MEDIUM",
        description: `Recent login from unfamiliar region "${u.lastLoginLoc}".`,
        when: now(),
      });
    }
  }

  // Rule 3: RBAC violation (operator reading forbidden tables)
  for (const e of access) {
    const u = byUser[e.userId];
    if (!u) continue;
    if (u.role === "OPERATOR" && config.operatorForbiddenTables.includes(e.tableName)) {
      anomalies.push({
        id: rid(),
        userId: u.id,
        userEmail: u.email,
        type: "RBAC_VIOLATION",
        severity: "HIGH",
        description: `Operator accessed restricted table "${e.tableName}".`,
        when: e.ts,
      });
    }
  }

  // Rule 4: Large export spike
  for (const e of access) {
    if (e.action === "EXPORT" && (e.estSizeMB ?? 0) >= config.exportSpikeMB) {
      const u = byUser[e.userId];
      anomalies.push({
        id: rid(),
        userId: u?.id,
        userEmail: u?.email,
        type: "EXPORT_SPIKE",
        severity: (e.estSizeMB ?? 0) > config.exportSpikeMB * 2 ? "CRITICAL" : "HIGH",
        description: `Large data export ~${e.estSizeMB}MB from "${e.tableName}".`,
        when: e.ts,
      });
    }
  }

  // Rule 5: Sensitive read burst (5m window)
  for (const u of users) {
    if (u.sensitiveReadsMB5m >= config.sensitiveBurstMB) {
      anomalies.push({
        id: rid(),
        userId: u.id,
        userEmail: u.email,
        type: "SENSITIVE_READ_BURST",
        severity: u.sensitiveReadsMB5m > config.sensitiveBurstMB * 1.5 ? "HIGH" : "MEDIUM",
        description: `~${u.sensitiveReadsMB5m}MB sensitive reads in last 5m.`,
        when: now(),
      });
    }
  }

  // De-duplicate by (type,userId,when bucket) roughly
  const key = (a: Anomaly) => `${a.type}:${a.userId ?? "NA"}:${Math.floor(a.when / (1000*60))}`;
  const seen = new Set<string>();
  return anomalies.filter(a => {
    const k = key(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a,b) => b.when - a.when);
}

/** ---------------------------
 * UI
 * --------------------------*/
export default function DatabaseConsole() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [access, setAccess] = useState<AccessEvent[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ ...DEFAULT_AGENT_CONFIG });
  const [filter, setFilter] = useState("");
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [running, setRunning] = useState(false);

  // Seed mock data on mount
  useEffect(() => {
    const u = makeUsers(50);
    const ev = makeAccessLog(u, 150);
    setUsers(u);
    setAccess(ev);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.region.toLowerCase().includes(q)
    );
  }, [users, filter]);

  const runOnce = () => {
    const res = runAgent(users, access, { ...agentConfig });
    setAnomalies(res);
  };

  const runLiveFor10s = async () => {
    setRunning(true);
    const start = Date.now();
    // simulate small new events & re-run every 1s
    while (Date.now() - start < 10_000) {
      // add a handful of recent events
      setAccess(prev => {
        const extra = makeAccessLog(users, 5).map(e => ({ ...e, ts: now() }));
        return [...extra, ...prev].slice(0, 300);
      });
      // slight random fluctuations in sensitive reads
      setUsers(prev =>
        prev.map(u => ({
          ...u,
          sensitiveReadsMB5m: Math.max(
            0,
            Math.min(
              500,
              Math.round(u.sensitiveReadsMB5m + (Math.random() * 20 - 10))
            )
          ),
          failedLogin10m: Math.max(
            0,
            Math.min(10, u.failedLogin10m + (Math.random() < 0.25 ? 1 : 0) - (Math.random() < 0.15 ? 1 : 0))
          ),
        }))
      );
      // recompute
      setAnomalies(runAgent(users, access, { ...agentConfig }));
      await new Promise(r => setTimeout(r, 1000));
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Database <span className="text-blue-600"></span>
            </h1>
            <p className="text-gray-600 text-sm">
              50 users • {access.length} recent access events
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
    </main>
        {/* Controls */}
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name, email, role, region..."
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Brute Failures</label>
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={agentConfig.bruteForceFailures}
                  onChange={(e) =>
                    setAgentConfig((c) => ({ ...c, bruteForceFailures: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Sensitive Burst MB</label>
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={agentConfig.sensitiveBurstMB}
                  onChange={(e) =>
                    setAgentConfig((c) => ({ ...c, sensitiveBurstMB: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Export Spike MB</label>
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={agentConfig.exportSpikeMB}
                  onChange={(e) =>
                    setAgentConfig((c) => ({ ...c, exportSpikeMB: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={runOnce}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
                >
                  Run AI Agent
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                disabled={running}
                onClick={runLiveFor10s}
                className={`rounded-lg px-4 py-2 font-medium text-white ${running ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {running ? "Live Scan (10s)..." : "Live Scan (10s)"}
              </button>
            </div>
          </div>
        </section>

        {/* Two-column: Users & Anomalies */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users table */}
          <div className="lg:col-span-2 rounded-2xl border bg-white p-0 overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Users</h3>
              <p className="text-sm text-gray-600">Scrollable list (50). Click Live Scan to see anomalies update.</p>
            </div>

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
                  {filteredUsers.map(u => {
                    const rowAnoms = anomalies.filter(a => a.userId === u.id);
                    const flag = rowAnoms.length > 0;
                    return (
                      <tr key={u.id} className={`border-t ${flag ? "bg-red-50/60" : ""}`}>
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                            u.role === "ANALYST" ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
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
                          <div className="text-gray-800">{u.lastLoginLoc}</div>
                          <div className="text-xs text-gray-500">{u.lastLoginIP}</div>
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
              <button
                className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50"
                onClick={() => setUsers(makeUsers(50))}
              >
                Regenerate Users
              </button>
            </div>
          </div>

          {/* Anomaly panel */}
          <div className="rounded-2xl border bg-white p-0 overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">AI Agent Anomalies</h3>
              <p className="text-sm text-gray-600">Results from last run.</p>
            </div>

            <div className="h-[520px] overflow-auto divide-y">
              {anomalies.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  No anomalies detected yet. Click <b>Run AI Agent</b> or try a <b>Live Scan</b>.
                </div>
              ) : anomalies.map(a => (
                <div key={a.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{a.type.replaceAll("_"," ")}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      a.severity === "CRITICAL" ? "bg-red-600 text-white" :
                      a.severity === "HIGH" ? "bg-red-100 text-red-700" :
                      a.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 mt-1">{a.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {a.userEmail ? `User: ${a.userEmail} • ` : ""}{new Date(a.when).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total: <b>{anomalies.length}</b>
              </div>
              <button
                className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  // quick “see more” to dashboard link in this simple setup
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Scroll to Top
              </button>
            </div>
          </div>
        </section>

        {/* Tiny “API-like” playground area */}
        <section className="rounded-2xl border bg-white p-6">
          <h4 className="text-md font-semibold mb-2">Quick Event Tweaks</h4>
          <p className="text-sm text-gray-600 mb-4">
            Add a few random access events to see how the agent responds, then click <b>Run AI Agent</b>.
          </p>
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              onClick={() => setAccess(prev => [...makeAccessLog(users, 10), ...prev].slice(0, 300))}
            >
              +10 Access Events
            </button>
            <button
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              onClick={() => setAccess(makeAccessLog(users, 150))}
            >
              Reset Access Log
            </button>
            <span className="text-sm text-gray-600">Current: {access.length}</span>
          </div>
        </section>
    </div>
  );
}