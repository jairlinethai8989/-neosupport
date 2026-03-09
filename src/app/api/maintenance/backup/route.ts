import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Backup API: Export database to JSON
 * Returns all tickets and messages as a downloadable JSON response.
 */

export async function GET() {
  try {
    // 1. Fetch all tickets
    const { data: tickets, error: tErr } = await supabaseAdmin
      .from("tickets")
      .select("*, users!reporter_id(display_name, line_uid)");

    if (tErr) throw tErr;

    // 2. Fetch all messages
    const { data: messages, error: mErr } = await supabaseAdmin
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;

    const backupData = {
      exported_at: new Date().toISOString(),
      ticket_count: tickets?.length || 0,
      message_count: messages?.length || 0,
      tickets,
      messages
    };

    // Return as a JSON file download response
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="it_support_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
