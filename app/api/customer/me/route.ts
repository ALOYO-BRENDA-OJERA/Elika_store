import { jsonResponse } from '@/lib/api-utils';
import { getCustomerFromCookies } from '@/lib/auth';

export async function GET() {
  const user = await getCustomerFromCookies();
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  return jsonResponse({ user: { id: user.sub, name: user.name, email: user.email } });
}
