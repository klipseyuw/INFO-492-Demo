import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';

type Role = 'ANALYST' | 'OPERATOR' | 'ADMIN';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

function getEnvDemoAccounts() {
  // Simple explicit envs for demo accounts
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

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const accounts = getEnvDemoAccounts();
    const match = accounts.find(
      (a) => a.email.toLowerCase() === String(email).trim().toLowerCase() && a.password === String(password)
    );

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Ensure a user exists with this email and role (mutually exclusive per demo design)
    const user = await prisma.user.upsert({
      where: { email: match.email },
      update: ({ role: match.role } as any),
      create: ({
        email: match.email,
        role: match.role,
        agentActive: false,
      } as any),
    });

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: match.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: match.role,
        agentActive: user.agentActive,
      },
    });
    res.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
