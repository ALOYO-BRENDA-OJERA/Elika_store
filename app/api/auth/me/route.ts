
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function GET() {
  const user = await getAdminFromCookies();
  console.log('/api/auth/me: user from cookie', user);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  return jsonResponse({ user: { id: user.sub, username: user.username, role: user.role } });
}
