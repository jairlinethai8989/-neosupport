import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";

// POST /api/tickets/[id]/status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, lineUid, notes, module, issue_type } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // 1. Update ticket status in database
    const updatePayload: any = { status };
    if (notes !== undefined) updatePayload.notes = notes;
    if (module !== undefined) updatePayload.module = module;
    if (issue_type !== undefined) updatePayload.issue_type = issue_type;

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .update(updatePayload)
      .eq("id", id)
      .select("ticket_no")
      .single();

    if (error || !ticket) {
      console.error("Failed to update ticket status:", error);
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 }
      );
    }

    // 2. If status is Resolved or Closed, send a LINE notification WITHOUT awaiting
    if (lineUid && (status === "Resolved" || status === "Closed")) {
      pushMessage(lineUid, [
        {
          type: "text",
          text: `✅ Ticket ${ticket.ticket_no} ของคุณได้รับการแก้ไขและเปลี่ยนสถานะเป็น "${status}" เรียบร้อยแล้วครับ\n\nขอบคุณที่ใช้บริการ NEO Support 🙏`,
        },
      ]).catch(pushError => {
        console.error("Failed to push status notification in background:", pushError);
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
