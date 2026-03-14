import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage, createRatingFlex } from "@/lib/line";

// POST /api/tickets/[id]/status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, lineUid, notes, module, issue_type, escalated_to } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // 1. Update ticket status in database
    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updatePayload.notes = notes;
    if (module !== undefined) updatePayload.module = module;
    if (issue_type !== undefined) updatePayload.issue_type = issue_type;
    if (escalated_to !== undefined) updatePayload.escalated_to = escalated_to;

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

    // 2. If status is Resolved or Closed, send a LINE notification
    if (lineUid && (status === "Resolved" || status === "Closed")) {
      const displayNotes = notes ? `\n📝 วิธีแก้ไข: ${notes.substring(0, 150)}${notes.length > 150 ? "..." : ""}` : "";
      
      const flexContent = createRatingFlex(id, ticket.ticket_no);

      try {
        await pushMessage(lineUid, [
          {
            type: "text",
            text: `✅ Ticket ${ticket.ticket_no} ของคุณได้รับการแก้ไขแล้ว!\n` +
                  `━━━━━━━━━━━━━━━━━\n` +
                  `สถานะ: ${status === "Resolved" ? "แก้ไขเสร็จสิ้น" : "ปิดงาน"}${displayNotes}\n` +
                  `━━━━━━━━━━━━━━━━━`
          },
          {
            type: "flex",
            altText: "ประเมินความพึงพอใจ ⭐",
            contents: flexContent
          }
        ]);
      } catch (pushError) {
        console.error("Failed to push status notification:", pushError);
      }
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
