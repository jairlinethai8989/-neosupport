import { createClient } from "@/utils/supabase/server";
import AuditLogClient from "./AuditLogClient";

export const metadata = {
  title: "Audit Logs - Cleanup History",
  description: "View history of automated cleanup and file backups.",
};

export default async function AuditLogPage() {
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("cleanup_logs")
    .select("*")
    .order("deleted_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching audit logs:", error);
  }

  return <AuditLogClient initialLogs={logs || []} />;
}
