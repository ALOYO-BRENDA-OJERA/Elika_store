"use client";

import AdminOrders from '@/pages/admin/Orders';
import { AdminGate } from '@/pages/admin/AdminGate';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin-1deec6581595';

export default function AdminOrdersPage() {
  return (
    <AdminGate adminBase={ADMIN_BASE}>
      <AdminOrders />
    </AdminGate>
  );
}
