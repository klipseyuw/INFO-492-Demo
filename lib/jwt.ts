import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'dev_secret_change_me');

export async function createSession(payload: { sub: string; email: string; role: 'ANALYST'|'OPERATOR'|'ADMIN' }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as { sub: string; email: string; role: 'ANALYST'|'OPERATOR'|'ADMIN'; exp: number; iat: number };
}