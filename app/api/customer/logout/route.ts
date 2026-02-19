import { NextResponse } from 'next/server';
import { clearCustomerCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({}, { status: 204 });
  clearCustomerCookie(response);
  return response;
}
