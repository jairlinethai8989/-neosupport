import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { notes } = await req.json();

  if (!notes || notes.trim().length < 2) {
    return NextResponse.json({ error: "โปรดระบุรายละเอียดการแก้ไข (Resolution Notes)" }, { status: 400 });
  }

  try {
    // 1. Fetch current ticket state to ensure it's not already closed/resolved by someone else
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from("tickets")
      .select("status, ticket_no")
      .eq("id", id)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return NextResponse.json({ error: "หน้านี้ถูกปิดไปแล้ว (Ticket is already resolved)" }, { status: 400 });
    }

    // 2. Perform the update
    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "Resolved",
        notes: notes.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;

    logger.info(`Ticket ${ticket.ticket_no} resolved via Public Magic Link by external department`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Public Resolve Error:", error);
    return NextResponse.json({ error: "ไม่สามารถอัปเดตข้อมูลได้ในขณะนี้" }, { status: 500 });
  }
}
