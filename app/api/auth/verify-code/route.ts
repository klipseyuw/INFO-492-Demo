import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

type Role = "ANALYST" | "OPERATOR" | "ADMIN";

const normEmail = (s: unknown) =>
  typeof s === "string" ? s.trim().toLowerCase() : "";
const normPhone = (s: unknown) =>
  typeof s === "string" ? s.replace(/\D/g, "") : "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email: rawEmail,
      phone: rawPhone,
      code,
      desiredRole,
    }: { email?: string; phone?: string; code?: string; desiredRole?: Role } = body || {};

    const email = normEmail(rawEmail);
    const phone = normPhone(rawPhone);

    if (!code || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: "Email/phone and 6-digit code required" },
        { status: 400 }
      );
    }

    // Build a clean OR filter (no undefined entries)
    const ors: Array<any> = [];
    if (email) ors.push({ email });
    if (phone) ors.push({ phone });

    const user = await prisma.user.findFirst({
      where: { OR: ors },
      select: {
        id: true,
        email: true,
        phone: true,
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
    if (!match) {
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

    // Optional: honor client-selected role ONLY when explicitly allowed in env.
    const allowedRoles: Role[] = ["ANALYST", "OPERATOR", "ADMIN"];
    let effectiveRole: Role = user.role as Role;

    if (
      process.env.ALLOW_DEMO_ROLE_SELECTOR === "true" &&
      desiredRole &&
      allowedRoles.includes(desiredRole) &&
      desiredRole !== user.role
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: desiredRole },
      });
      effectiveRole = desiredRole;
    }

    // issue JWT with effectiveRole
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret"
    );

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      phone: user.phone,
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
        phone: user.phone,
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