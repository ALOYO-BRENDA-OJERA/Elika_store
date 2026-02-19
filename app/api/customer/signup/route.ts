import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import { setCustomerCookie, signCustomerToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const fullName = body?.fullName ? String(body.fullName) : '';
    const email = body?.email ? String(body.email).toLowerCase() : '';
    const password = body?.password ? String(body.password) : '';

    if (!fullName || !email || !password) {
      return jsonResponse({ error: 'Full name, email, and password are required' }, 400);
    }

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return jsonResponse({ error: 'Email already in use' }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const customer = await prisma.customer.create({
      data: {
        fullName,
        email,
        passwordHash,
      },
    });

    const token = signCustomerToken({ id: customer.id, email: customer.email, full_name: customer.fullName });
    const response = NextResponse.json({ id: customer.id, email: customer.email, fullName: customer.fullName });
    setCustomerCookie(response, token);
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return jsonResponse({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}
