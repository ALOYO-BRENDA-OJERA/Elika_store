"use client";

import AdminCategories from '@/pages/admin/Categories';
import { AdminGate } from '@/pages/admin/AdminGate';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin-1deec6581595';

export default function AdminCategoriesPage() {
  return (
    <AdminGate adminBase={ADMIN_BASE}>
      <AdminCategories />
    </AdminGate>
  );
}
