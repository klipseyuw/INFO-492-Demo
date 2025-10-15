import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 3) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    // Validate input
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate phone format if provided (basic validation for numbers)
    if (phone) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number format (10-15 digits)' },
          { status: 400 }
        );
      }
    }

    // Find or create user
    let user = null;
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, agentActive: false }
        });
      }
    } else if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (!user) {
        user = await prisma.user.create({
          data: { phone: cleanPhone, agentActive: false }
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing codes for this user
    await prisma.verificationCode.deleteMany({
      where: { userId: user.id }
    });

    // Store verification code
    await prisma.verificationCode.create({
      data: {
        code,
        expiresAt,
        userId: user.id
      }
    });

    // Log code to console (for testing - in production, send via email/SMS service)
    console.log(`\n🔐 VERIFICATION CODE for ${email || phone}:`);
    console.log(`📧 Code: ${code}`);
    console.log(`⏰ Expires: ${expiresAt.toLocaleString()}`);
    console.log(`👤 User ID: ${user.id}\n`);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      // In production, don't return this - only for testing
      testCode: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

