import { supabaseAdmin } from "@/lib/supabase";
import TicketDetailClient from "./TicketDetailClient";
import { notFound } from "next/navigation";

export const revalidate = 0; // Disable caching

async function getTicketDetails(id: string) {
  // Fetch ticket and user relations
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select(`
      *,
      users!tickets_reporter_id_fkey(
        id,
        line_uid,
        display_name,
        department,
        hospitals(
          name
        )
      )
    `)
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    console.error("Error fetching ticket:", ticketError);
    return null;
  }

  // Fetch messages ordered by created_at ascending
  const { data: messages, error: messageError } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (messageError) {
    console.error("Error fetching messages:", messageError);
  }

  // Fetch settings from DB
  const { data: settings } = await supabaseAdmin
    .from("global_settings")
    .select("*");

  const initialSettings = {
    modules: settings?.find(s => s.key === "modules")?.value || ["ห้องพยาบาล", "ห้องแพทย์", "ผู้ป่วยใน (IPD)", "ผู้ป่วยนอก (OPD)", "การเงิน/บัญชี", "จัดซื้อ/พัสดุ", "Network/Infra", "อื่นๆ"],
    issue_types: settings?.find(s => s.key === "issue_types")?.value || ["PB", "REQ", "แนะนำ", "Q&A"],
    resolution_notes: settings?.find(s => s.key === "resolution_notes")?.value || ["แก้ไขเสร็จเรียบร้อย", "ปรับปรุงค่าระบบและทดสอบแล้ว"],
    quick_replies: settings?.find(s => s.key === "quick_replies")?.value || [
      "รับเรื่องแล้วครับ กำลังตรวจสอบให้",
      "รบกวนส่งภาพหน้าจอประกอบด้วยนะครับ",
      "ขอบคุณที่แจ้งมาครับ จะรีบดำเนินการให้",
      "แก้ไขเสร็จเรียบร้อยแล้วครับ กรุณาลองใหม่อีกครั้ง"
    ],
    sla_policy: settings?.find(s => s.key === "sla_policy")?.value || { Critical: 1, High: 4, Medium: 8, Low: 24 },
  };

  return { ticket, messages: messages || [], initialSettings };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getTicketDetails(id);

  if (!data) {
    return notFound();
  }

  return <TicketDetailClient initialTicket={data.ticket} initialMessages={data.messages} initialSettings={data.initialSettings} />;
}
