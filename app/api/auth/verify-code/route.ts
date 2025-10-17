// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

type Role = 'ANALYST' | 'OPERATOR' | 'ADMIN';
type CodeLite = { id: string; code: string; expiresAt: Date };

function normalizePhone(phone?: string) {
  return phone ? phone.replace(/[\s\-\(\)]/g, '') : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, code } = body as { email?: string; phone?: string; code?: string };

    // 1) Validate input
    if (!code || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: 'Email/phone and code are required' },
        { status: 400 }
      );
    }

    // 2) Find user by email OR normalized phone; explicitly select `role` and codes
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          normalizePhone(phone) ? { phone: normalizePhone(phone) } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        agentActive: true,
        role: true, // <-- ensure TS knows role is present
        verificationCodes: {
          select: { id: true, code: true, expiresAt: true, createdAt: true, userId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 3) Validate verification code (not expired)
    const validCode = user.verificationCodes.find(
      (vc: CodeLite) => vc.code === code && new Date(vc.expiresAt) > new Date()
    );

    if (!validCode) {
      // Clean up expired codes
      await prisma.verificationCode.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      });
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // 4) Consume the one-time code
    await prisma.verificationCode.delete({ where: { id: validCode.id } });

    // 5) Create JWT (pack role for RBAC)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
    );

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role as Role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // 6) Response body (non-sensitive)
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role as Role,
        agentActive: user.agentActive,
      },
    });

    // 7) Set HttpOnly cookie (name MUST match middleware)
    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log(`✅ Auth OK: ${user.email || user.phone} (id=${user.id}, role=${user.role})`);
    return response;
  } catch (err) {
    console.error('Verify code error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}