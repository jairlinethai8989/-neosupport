import { createClient } from "@/utils/supabase/server";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const searchParams = await props.searchParams;
  const initialTab = searchParams?.tab || "modules";

  if (!user) {
    redirect("/login");
  }

  const [
    { data: settings },
    { data: hospitals },
    { data: pendingUsers },
    { data: activeUsers }
  ] = await Promise.all([
    supabase.from("global_settings").select("*"),
    supabase.from("hospitals").select("*").order("name", { ascending: true }),
    supabase.from("users").select("*, hospitals(name)").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("users").select("*, hospitals(name)").eq("is_staff", true).neq("status", "pending").order("status", { ascending: true })
  ]);

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
    cleanup_policy: settings?.find(s => s.key === "cleanup_policy")?.value || { days: 30, enabled: true },
    upload_limits: settings?.find(s => s.key === "upload_limits")?.value || { max_video_size_mb: 10, max_image_size_mb: 5 },
    sla_policy: settings?.find(s => s.key === "sla_policy")?.value || { Critical: 1, High: 4, Medium: 8, Low: 24 },
  };

  const displayUser = user?.email?.replace("@neosupport.local", "") || user?.email;

  return (
    <SettingsClient 
      initialSettings={initialSettings} 
      initialHospitals={hospitals || []} 
      initialPending={pendingUsers || []}
      initialActive={activeUsers || []}
      userEmail={displayUser} 
      initialTab={initialTab}
    />
  );
}
