"use client";

import AdminMessages from '@/pages/admin/Messages';
import { AdminGate } from '@/pages/admin/AdminGate';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin-1deec6581595';

export default function AdminMessagesPage() {
  return (
    <AdminGate adminBase={ADMIN_BASE}>
      <AdminMessages />
    </AdminGate>
  );
}
