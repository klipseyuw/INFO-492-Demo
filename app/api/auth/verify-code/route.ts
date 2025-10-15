import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, code } = body;

    // Validate input
    if (!code || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: 'Email/phone and code are required' },
        { status: 400 }
      );
    }

    // Find user
    let user = null;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { verificationCodes: true }
      });
    } else if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      user = await prisma.user.findUnique({
        where: { phone: cleanPhone },
        include: { verificationCodes: true }
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find valid verification code
    const validCode = user.verificationCodes.find(
      vc => vc.code === code && new Date(vc.expiresAt) > new Date()
    );

    if (!validCode) {
      // Clean up expired codes
      await prisma.verificationCode.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() }
        }
      });

      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Delete used verification code
    await prisma.verificationCode.delete({
      where: { id: validCode.id }
    });

    // Generate JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
    );

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      phone: user.phone
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Token expires in 7 days
      .sign(secret);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        agentActive: user.agentActive
      }
    });

    // Set HttpOnly cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log(`✅ User authenticated: ${user.email || user.phone} (ID: ${user.id})`);

    return response;

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

