import { NextRequest, NextResponse } from 'next/server';
import { suggestReply } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { ticketId } = await req.json();
    if (!ticketId) return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });

    const result = await suggestReply(ticketId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
