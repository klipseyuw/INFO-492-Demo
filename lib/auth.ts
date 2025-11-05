import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

export type Role = 'ANALYST' | 'OPERATOR' | 'ADMIN';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export type SessionPayload = {
  sub: string;
  email?: string;
  role?: Role;
  iat?: number;
  exp?: number;
};

/**
 * Extracts JWT session from either NextRequest or Web Request by reading the 'cookie' header.
 */
export async function getSessionFromRequest(req: Request | NextRequest): Promise<SessionPayload | null> {
  try {
    const cookieHeader = (req as any).headers?.get?.('cookie') ?? (req as NextRequest).cookies?.toString?.() ?? '';
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader, 'auth');
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function requireRole(session: SessionPayload | null, allowed: Role[]): { ok: boolean; reason?: string } {
  if (!session?.role) return { ok: false, reason: 'No session or role' };
  if (!allowed.includes(session.role)) return { ok: false, reason: `Role ${session.role} not permitted` };
  return { ok: true };
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (decodeURIComponent(k.trim()) === name) {
      return rest.join('=');
    }
  }
  return null;
}
