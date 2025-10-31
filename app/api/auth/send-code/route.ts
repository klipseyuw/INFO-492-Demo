// app/api/auth/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

const normEmail = (s?: string) => (s ?? '').trim().toLowerCase();
const normPhone = (s?: string) => (s ?? '').replace(/\D/g, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normEmail(body.email);
    const phone = normPhone(body.phone);

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Try again in a minute.' },
        { status: 429 }
      );
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }
    if (phone) {
      if (phone.length < 10 || phone.length > 15) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone format (10–15 digits)' },
          { status: 400 }
        );
      }
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || null,
          phone: phone || null,
          agentActive: false,
        },
        select: { id: true, email: true, phone: true },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
    await prisma.verificationCode.create({
      data: { code, expiresAt, userId: user.id },
    });

    // Always log to server logs (visible in Render logs)
    console.log(`🔐 Code for ${user.email || user.phone} -> ${code} (expires ${expiresAt.toISOString()})`);

    // Allow returning the test code in PROD when explicitly enabled
    const allowTestCodes = process.env.ALLOW_TEST_CODES === 'true';

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      testCode: allowTestCodes ? code : undefined,
      destination: user.email || user.phone || 'unknown',
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Send code error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}