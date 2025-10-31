import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// super basic in-memory throttle (swap for Redis in prod)
const rateLimit = new Map<string, { n: number; resetAt: number }>();

function okToSend(ip: string) {
  const now = Date.now();
  const slot = rateLimit.get(ip);
  if (!slot || now > slot.resetAt) {
    rateLimit.set(ip, { n: 1, resetAt: now + 60_000 });
    return true;
  }
  if (slot.n >= 3) return false;
  slot.n += 1;
  return true;
}

const normEmail = (s: unknown) =>
  typeof s === "string" ? s.trim().toLowerCase() : "";
const normPhone = (s: unknown) =>
  typeof s === "string" ? s.replace(/\D/g, "") : "";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, phone: rawPhone } = await req.json().catch(() => ({} as any));
    const email = normEmail(rawEmail);
    const phone = normPhone(rawPhone);

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "Email or phone required" },
        { status: 400 }
      );
    }

    // basic format checks
    if (email) {
      const ok =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
      if (!ok) return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
    }
    if (phone) {
      if (!/^\d{10,15}$/.test(phone)) {
        return NextResponse.json(
          { success: false, error: "Phone must be 10–15 digits" },
          { status: 400 }
        );
      }
    }

    // throttle
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      // NextRequest has .ip sometimes (Vercel), Render may not
      ((req as any).ip ?? "unknown");
    if (!okToSend(String(ip))) {
      return NextResponse.json(
        { success: false, error: "Too many requests, try again in ~1 min" },
        { status: 429 }
      );
    }

    // ——— Prisma calls: NEVER pass undefined ———
    let user = null;
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, role: "ANALYST", agentActive: false },
        });
      }
    } else {
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: { phone, role: "ANALYST", agentActive: false },
        });
      }
    }

    // blow away stale codes and create a new one
    await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.verificationCode.create({
      data: { code, expiresAt, userId: user.id },
    });

    // dev convenience
    if (process.env.NODE_ENV !== "production") {
      console.log(`DEV login code for ${email || phone}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      testCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (e) {
    console.error("Send code error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to send code" },
      { status: 500 }
    );
  }
}
