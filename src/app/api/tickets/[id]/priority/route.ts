import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { priority } = await request.json();

    if (!priority) {
      return NextResponse.json({ error: "Priority is required" }, { status: 400 });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .update({ priority })
      .eq("id", id)
      .select("ticket_no, priority")
      .single();

    if (error || !ticket) {
      console.error("Failed to update ticket priority:", error);
      return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
    }

    return NextResponse.json({ success: true, priority: ticket.priority });
  } catch (error) {
    console.error("Update priority error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
