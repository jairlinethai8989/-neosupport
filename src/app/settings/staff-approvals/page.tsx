import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import StaffApprovalsClient from "./StaffApprovalsClient";

export const metadata = {
  title: "อนุมัติสิทธิ์พนักงาน - IT Support",
  description: "จัดการสิทธิ์พนักงานเข้าใช้งานระบบ",
};

export default async function StaffApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch pending staff
  const { data: pendingUsers } = await supabase
    .from("users")
    .select("*, hospitals(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch all staff to show current team
  const { data: activeUsers } = await supabase
    .from("users")
    .select("*, hospitals(name)")
    .eq("is_staff", true)
    .neq("status", "pending")
    .order("status", { ascending: true });

  const displayUser = user?.email?.replace("@neosupport.local", "") || user?.email;

  return (
    <StaffApprovalsClient 
      initialPending={pendingUsers || []} 
      initialActive={activeUsers || []}
      userEmail={displayUser}
    />
  );
}
