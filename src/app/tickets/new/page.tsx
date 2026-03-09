import { supabaseAdmin } from "@/lib/supabase";
import NewTicketClient from "./NewTicketClient";

export const revalidate = 0;

export default async function NewTicketPage() {
  // Fetch hospitals for dropdown
  const { data: hospitals } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, abbreviation")
    .order("name", { ascending: true });

  // Fetch settings for module and issue type
  const { data: settings } = await supabaseAdmin
    .from("global_settings")
    .select("*");

  const initialSettings = {
    modules: settings?.find(s => s.key === "modules")?.value || ["ห้องพยาบาล", "ห้องแพทย์", "ผู้ป่วยใน (IPD)", "ผู้ป่วยนอก (OPD)", "การเงิน/บัญชี", "จัดซื้อ/พัสดุ", "Network/Infra", "อื่นๆ"],
    issue_types: settings?.find(s => s.key === "issue_types")?.value || ["PB", "REQ", "แนะนำ", "Q&A"],
  };

  return <NewTicketClient hospitals={hospitals || []} initialSettings={initialSettings} />;
}
