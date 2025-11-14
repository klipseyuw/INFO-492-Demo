// app/api/auth/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackLoginAttempt } from '@/lib/databaseMonitoring';
import { getLocationFromIP } from '@/lib/ipLocation';

type Role = 'ANALYST' | 'OPERATOR' | 'ADMIN';

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

function getEnvDemoAccounts() {
  const entries = [
    {
      email: process.env.DEMO_ADMIN_EMAIL,
      password: process.env.DEMO_ADMIN_PASSWORD,
      role: 'ADMIN' as Role,
    },
    {
      email: process.env.DEMO_ANALYST_EMAIL,
      password: process.env.DEMO_ANALYST_PASSWORD,
      role: 'ANALYST' as Role,
    },
    {
      email: process.env.DEMO_OPERATOR_EMAIL,
      password: process.env.DEMO_OPERATOR_PASSWORD,
      role: 'OPERATOR' as Role,
    },
  ];
  return entries.filter((e) => e.email && e.password) as Array<{ email: string; password: string; role: Role }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normEmail(body.email);
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate credentials against demo accounts
    const accounts = getEnvDemoAccounts();
    const match = accounts.find(
      (a) => a.email.toLowerCase() === email && a.password === password
    );

    if (!match) {
      // Track failed login attempt
      const location = await getLocationFromIP(ip);
      const userAgent = request.headers.get('user-agent') || undefined;
      
      // Try to find existing user for tracking (won't create if doesn't exist)
      const existingUser = await prisma.user.findFirst({
        where: { email },
        select: { role: true },
      });
      
      if (existingUser) {
        await trackLoginAttempt({
          email,
          role: existingUser.role as Role,
          success: false,
          ip,
          location,
          userAgent,
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find or create user with the matched role
    let user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: match.role,
          agentActive: false,
        },
        select: { id: true, email: true, role: true },
      });
    } else if (user.role !== match.role) {
      // Update role if it changed in env
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: match.role },
        select: { id: true, email: true, role: true },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
    await prisma.verificationCode.create({
      data: { code, expiresAt, userId: user.id },
    });

    // Always log to server logs (visible in Render logs)
    console.log(`🔐 Code for ${user.email} (${match.role}) -> ${code} (expires ${expiresAt.toISOString()})`);

    // Allow returning the test code in PROD when explicitly enabled
    const allowTestCodes = process.env.ALLOW_TEST_CODES === 'true';

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      testCode: allowTestCodes ? code : undefined,
      destination: user.email || 'unknown',
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