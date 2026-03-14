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
        users!reporter_id ( hospitals(name) )
      `);

    if (error || !tickets) {
      throw new Error(`Failed to fetch tickets: ${error?.message}`);
    }

    // 3. Calculate statistics
    const metrics = {
      totalActive: 0,
      newToday: 0,
      closedToday: 0,
      pending: 0,
      escalated: 0,
      breaching: {
        critical: 0, high: 0, medium: 0, low: 0
      }
    };

    // 4. Fetch SLA Settings to calculate breaches
    const { data: settings } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", "sla_policy")
      .single();
    
    // Normalize keys to lowercase for type safety during lookup
    const rawSla = settings?.value || { Critical: 1, High: 4, Medium: 8, Low: 24 };
    const slaPolicy: Record<string, number> = {};
    Object.keys(rawSla).forEach(k => slaPolicy[k.toLowerCase()] = rawSla[k]);

    // Process each ticket
    tickets.forEach((t) => {
      const createdAt = new Date(t.created_at);
      const updatedAt = new Date(t.updated_at);

      // Is it a new ticket today?
      if (createdAt >= today) {
        metrics.newToday++;
      }

      // Is it closed today? (Closed or Resolved in the current day)
      if ((t.status === "Resolved" || t.status === "Closed") && updatedAt >= today) {
        metrics.closedToday++;
      }

      // Check Active tickets (not Resolved or Closed)
      if (t.status !== "Resolved" && t.status !== "Closed") {
        metrics.totalActive++;

        if (t.status === "Pending") metrics.pending++;
        if (t.status === "Escalated") metrics.escalated++;

        // Calculate if breached
        const priority = (t.priority || "Medium").toLowerCase();
        const slaHours = slaPolicy[priority] || 8;
        const createdTime = createdAt.getTime();
        const slaLimitMs = createdTime + (slaHours * 60 * 60 * 1000);

        if (now.getTime() > slaLimitMs) {
          if (priority in metrics.breaching) {
             metrics.breaching[priority as keyof typeof metrics.breaching]++;
          }
        }
      }
    });

    const totalBreaches = Object.values(metrics.breaching).reduce((a, b) => a + b, 0);

    // 5. Construct LINE Message
    // Determine report type based on hour (TH time is UTC+7)
    const hour = now.getHours();
    let reportTitle = "📊 สรุปรายงาน IT Support 📊";
    let timeRangeInfo = "";

    if (hour >= 17 && hour < 20) {
      reportTitle = "🌆 สรุปผลงานรอบกะเช้า (จบที่ 17:30) 🌆";
      timeRangeInfo = "ช่วงเวลา: 08:30 - 17:30 น.";
    } else if (hour >= 23 || hour < 2) {
      reportTitle = "🌑 สรุปปิดยอดประจำวัน (จบที่ 24:00) 🌑";
      timeRangeInfo = "ช่วงเวลาสะสม: 08:30 - 24:00 น.";
    }

    let messageText = `${reportTitle}\n`;
    messageText += `ประจำวันที่: ${now.toLocaleDateString("th-TH")}\n`;
    if (timeRangeInfo) messageText += `${timeRangeInfo}\n`;
    messageText += `━━━━━━━━━━━━━━━━━\n`;
    messageText += `✅ ปิดยอดวันนี้สะสม: ${metrics.closedToday} งาน\n`;
    messageText += `🔹 งานเข้าใหม่วันนี้: ${metrics.newToday} งาน\n`;
    messageText += `⚡ งานค้างในระบบปัจจุบัน: ${metrics.totalActive} งาน\n`;
    messageText += `     • รอรับงาน (Pending): ${metrics.pending}\n`;
    messageText += `     • ส่งต่อ (Escalated): ${metrics.escalated}\n`;
    
    if (totalBreaches > 0) {
      messageText += `━━━━━━━━━━━━━━━━━\n`;
      messageText += `⚠️ คิวงานเกินกำหนด SLA (${totalBreaches} งาน): ⚠️\n`;
      if (metrics.breaching.critical > 0) messageText += `     🔥 คอขาดบาดตาย: ${metrics.breaching.critical}\n`;
      if (metrics.breaching.high > 0) messageText += `     🔴 ด่วนมาก: ${metrics.breaching.high}\n`;
      if (metrics.breaching.medium > 0) messageText += `     🟡 ปานกลาง: ${metrics.breaching.medium}\n`;
      if (metrics.breaching.low > 0) messageText += `     🟢 ทั่วไป: ${metrics.breaching.low}\n`;
    }

    messageText += `━━━━━━━━━━━━━━━━━\n`;
    messageText += `จัดการงานต่อได้ที่: ${process.env.NEXT_PUBLIC_APP_URL || "https://neosupport.vercel.app"}`;

    const itGroupId = process.env.LINE_IT_GROUP_ID || process.env.LINE_ADMIN_UID;
    
    // 6. Send summary to IT Admin Group (or predefined user)
    if (!itGroupId) {
      console.warn("LINE_IT_GROUP_ID or LINE_ADMIN_UID not set.");
      return NextResponse.json({ success: true, warning: 'No Target IT Group Set', metrics });
    }

    await pushMessage(itGroupId, [{ type: "text", text: messageText }]);

    return NextResponse.json({ success: true, message: "Summary sent", metrics });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
