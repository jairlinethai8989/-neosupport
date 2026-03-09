import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./DashboardClient";
import Link from "next/link";

export const revalidate = 0; // Disable caching to fetch real-time data on load

// Supabase fetching helper
async function getDashboardData() {
  const { data: tickets, error } = await supabaseAdmin
    .from("tickets")
    .select(`
      id,
      ticket_no,
      description,
      status,
      priority,
      issue_type,
      created_at,
      assignee_name,
      users (
        display_name,
        department,
        hospitals (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }

  return tickets || [];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tickets = await getDashboardData();
  
  const { data: settings } = await supabaseAdmin
    .from("global_settings")
    .select("value")
    .eq("key", "sla_policy")
    .single();

  const displayUser = user?.email?.replace("@neosupport.local", "") || user?.email;
  const slaPolicy = settings?.value || { Critical: 1, High: 4, Medium: 8, Low: 24 };

  return <DashboardClient initialTickets={tickets} userEmail={displayUser} slaPolicy={slaPolicy} />;
}
