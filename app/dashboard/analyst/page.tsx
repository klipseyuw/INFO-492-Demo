// app/dashboard/analyst/page.tsx
import AlertFeed from '@/components/AlertFeed';
import RecentAnalyses from '@/components/RecentAnalyses';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default function AnalystHome() {
  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Security Analyst Console</h1>
          <p className="text-sm text-gray-500">
            High-signal alerts, risk summaries, and analysis tools.
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* Alerts stream */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Recent Alerts</h2>
        <AlertFeed />
      </div>

      {/* AI analyses */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Recent Analyses</h2>
        <RecentAnalyses />
      </div>
    </div>
  );
}
