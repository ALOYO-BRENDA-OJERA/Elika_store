'use client';

import AdminDashboard from '@/pages/admin/Dashboard';
import { AdminGate } from '@/pages/admin/AdminGate';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin';

export default function AdminDashboardPage() {
  return (
    <AdminGate adminBase={ADMIN_BASE}>
      <AdminDashboard />
    </AdminGate>
  );
}
