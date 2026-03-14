import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch all ticket data with relations
    const { data: tickets, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        ticket_no,
        description,
        status,
        priority,
        issue_type,
        module,
        created_at,
        assignee_name,
        handover_notes,
        users!reporter_id (display_name),
        hospitals (name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Format data for Excel
    const formattedData = tickets.map((t: any) => ({
      "Ticket No": t.ticket_no,
      "Reporter": t.users?.display_name || "N/A",
      "Hospital": t.hospitals?.name || "N/A",
      "Status": t.status,
      "Priority": t.priority,
      "Category": t.issue_type,
      "Module": t.module,
      "Description": t.description,
      "Assignee": t.assignee_name,
      "Handover Notes": t.handover_notes,
      "Created At": new Date(t.created_at).toLocaleString('th-TH'),
    }));

    // 3. Create Workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

    // 4. Generate Buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 5. Return as Downloadable File
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="NEO_Support_Tickets_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
