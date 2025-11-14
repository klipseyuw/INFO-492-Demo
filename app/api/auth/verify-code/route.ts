import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { trackLoginAttempt } from "@/lib/databaseMonitoring";
import { getLocationFromIP } from "@/lib/ipLocation";

type Role = "ANALYST" | "OPERATOR" | "ADMIN";

const normEmail = (s: unknown) =>
  typeof s === "string" ? s.trim().toLowerCase() : "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email: rawEmail,
      code,
    }: { email?: string; code?: string } = body || {};

    const email = normEmail(rawEmail);

    if (!code || !email) {
      return NextResponse.json(
        { success: false, error: "Email and 6-digit code required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        agentActive: true,
        role: true,
        verificationCodes: {
          select: { id: true, code: true, expiresAt: true },
          orderBy: { expiresAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const match = user.verificationCodes.find(
      (vc) => vc.code === String(code) && new Date(vc.expiresAt) > now
    );
    
    // Get IP and location for tracking
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;
    const location = await getLocationFromIP(ip);
    
    if (!match) {
      // Track failed login attempt
      if (user.email) {
        await trackLoginAttempt({
          email: user.email,
          role: user.role as Role,
          success: false,
          ip,
          location,
          userAgent,
        });
      }
      
      // cleanup any expired codes
      await prisma.verificationCode.deleteMany({
        where: { userId: user.id, expiresAt: { lt: now } },
      });
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    // consume the code
    await prisma.verificationCode.delete({ where: { id: match.id } });

    // Use the role already set during send-code (credentials validation)
    const effectiveRole: Role = user.role as Role;

    // Track successful login attempt
    if (user.email) {
      await trackLoginAttempt({
        email: user.email,
        role: effectiveRole,
        success: true,
        ip,
        location,
        userAgent,
      });
    }

    // issue JWT with effectiveRole
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret"
    );

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: effectiveRole,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: effectiveRole,
        agentActive: user.agentActive,
      },
    });

    res.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    console.error("Verify code error:", e);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}