import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-1';
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const aiReady = !!process.env.OPENROUTER_API_KEY;

    // Optional: perform a live provider check when validate=1
    let aiValidation: any = null;
    if (aiReady && (searchParams.get('validate') === '1' || searchParams.get('aiCheck') === '1')) {
      try {
        const res = await axios.get('https://openrouter.ai/api/v1/models', {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
            Referer: process.env.NEXTAUTH_URL || 'http://localhost:3000',
          }
        });
        aiValidation = { ok: true, status: res.status, count: Array.isArray(res.data?.data) ? res.data.data.length : undefined };
      } catch (e: any) {
        aiValidation = {
          ok: false,
          status: e?.response?.status,
          body: e?.response?.data
        };
      }
    }

    return NextResponse.json({
      success: true,
      agentActive: !!user?.agentActive,
      ai: {
        ready: aiReady,
        model: "deepseek/deepseek-chat-v3.1:free",
        referer: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        validation: aiValidation
      },
      timestamp: new Date()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
