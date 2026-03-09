import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";

export const dynamic = "force-dynamic";

// Vercel Cron or External Service will call this endpoint daily (e.g., 08:30)
// Must be secured with a token if deployed
export async function GET(request: Request) {
  // Simple auth for the cron job hitting this public endpoint
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Note: For local testing we'll allow requests without token, 
    // but in production it's highly recommended to use CRON_SECRET
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 1. Get current time constraints
    const now = new Date();
    
    // We want today's data (New tickets created since midnight)
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 2. Fetch required ticket data from Supabase
    const { data: tickets, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        id, 
        ticket_no, 
        status, 
        priority, 
        created_at, 
        updated_at,
        assignee_name,
        users ( hospitals(name) )
      `);

    if (error || !tickets) {
      throw new Error(`Failed to fetch tickets: ${error?.message}`);
    }

    // 3. Calculate statistics
    const metrics = {
      totalActive: 0,
      newToday: 0,
      pending: 0,
      escalated: 0,
      breaching: {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
      }
    };

    // 4. Fetch SLA Settings to calculate breaches
    const { data: settings } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", "sla_policy")
      .single();
    
    const slaPolicy = settings?.value || { Critical: 1, High: 4, Medium: 8, Low: 24 };

    // Process each ticket
    tickets.forEach((t) => {
      // Is it a new ticket today?
      if (new Date(t.created_at) >= today) {
        metrics.newToday++;
      }

      // Check Active tickets (not Resolved or Closed)
      if (t.status !== "Resolved" && t.status !== "Closed") {
        metrics.totalActive++;

        if (t.status === "Pending") metrics.pending++;
        if (t.status === "Escalated") metrics.escalated++;

        // Calculate if breached
        const priority = t.priority || "Medium";
        const slaHours = slaPolicy[priority] || 8;
        const createdTime = new Date(t.created_at).getTime();
        const slaLimitMs = createdTime + (slaHours * 60 * 60 * 1000);

        if (now.getTime() > slaLimitMs) {
          // Type safe increment
          if (priority in metrics.breaching) {
             metrics.breaching[priority as keyof typeof metrics.breaching]++;
          }
        }
      }
    });

    const totalBreaches = Object.values(metrics.breaching).reduce((a, b) => a + b, 0);

    // 5. Construct LINE Message
    let messageText = `📊 สรุปรายงาน IT Support ประจำวัน 📊\n`;
    messageText += `วันที่: ${now.toLocaleDateString("th-TH")}\n`;
    messageText += `━━━━━━━━━━━━━━━━━\n`;
    messageText += `🔹 งานเข้าใหม่วันนี้: ${metrics.newToday} งาน\n`;
    messageText += `⚡ งานค้างในระบบทั้งหมด: ${metrics.totalActive} งาน\n`;
    messageText += `     • รอรับงาน (Pending): ${metrics.pending}\n`;
    messageText += `     • ถูกส่งต่อ (Escalated): ${metrics.escalated}\n`;
    
    if (totalBreaches > 0) {
      messageText += `━━━━━━━━━━━━━━━━━\n`;
      messageText += `⚠️ คิวงานที่เกินกำหนด SLA (${totalBreaches} งาน): ⚠️\n`;
      if (metrics.breaching.Critical > 0) messageText += `     🔥 คอขาดบาดตาย: ${metrics.breaching.Critical}\n`;
      if (metrics.breaching.High > 0) messageText += `     🔴 ด่วนมาก: ${metrics.breaching.High}\n`;
      if (metrics.breaching.Medium > 0) messageText += `     🟡 ปานกลาง: ${metrics.breaching.Medium}\n`;
      if (metrics.breaching.Low > 0) messageText += `     🟢 ทั่วไป: ${metrics.breaching.Low}\n`;
      messageText += `(กรุณาให้ความสำคัญกับงานที่เกินกำหนดเป็นพิเศษ!)\n`;
    }

    messageText += `━━━━━━━━━━━━━━━━━\n`;
    messageText += `สามารถเข้าระบบเพื่อจัดการงานต่อได้ที่:\n`;
    messageText += `${process.env.NEXT_PUBLIC_APP_URL || "https://neosupport.vercel.app"}`;

    const itGroupId = process.env.LINE_IT_GROUP_ID || process.env.LINE_ADMIN_UID;
    
    // 6. Send summary to IT Admin Group (or predefined user)

    if (!itGroupId) {
      console.warn("LINE_IT_GROUP_ID or LINE_ADMIN_UID not set. Only returning JSON.");
      return NextResponse.json({ success: true, warning: 'No Target IT Group Set', metrics });
    }

    // Try sending message
    await pushMessage(itGroupId, [
      {
        type: "text",
        text: messageText,
      },
    ]);

    return NextResponse.json({ success: true, message: "Summary sent", metrics });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
