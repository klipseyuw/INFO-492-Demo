// app/dashboard/operator/page.tsx
import ShipmentTable from '@/components/ShipmentTable';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default function OperatorHome() {
  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operations View</h1>
          <p className="text-sm text-gray-500">Read-only shipment status and ETAs.</p>
        </div>
        <LogoutButton />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Shipments</h2>
        <ShipmentTable />
      </div>
    </div>
  );
}
