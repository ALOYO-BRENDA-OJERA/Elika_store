import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({}, { status: 204 });
  clearAdminCookie(response);
  return response;
}
