import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/tickets/[id]/assign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { assigneeName } = body;

    // We allow setting to null/empty to unassign
    const finalAssignee = assigneeName?.trim() || null;

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .update({ assignee_name: finalAssignee })
      .eq("id", id)
      .select("ticket_no")
      .single();

    if (error || !ticket) {
      console.error("Failed to update ticket assignee:", error);
      return NextResponse.json(
        { error: "Failed to assign ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, assigneeName: finalAssignee });
  } catch (error) {
    console.error("Assign ticket error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
