'use client';

import AdminProducts from '@/pages/admin/Products';
import { AdminGate } from '@/pages/admin/AdminGate';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin';

export default function AdminProductsPage() {
  return (
    <AdminGate adminBase={ADMIN_BASE}>
      <AdminProducts />
    </AdminGate>
  );
}
