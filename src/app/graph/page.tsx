import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import GraphClient from "./GraphClient";

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
      updated_at,
      assignee_name,
      users!reporter_id (
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

export default async function GraphPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tickets = await getDashboardData();
  
  // Fetch Advanced SLA configuration
  const { data: slaSettings } = await supabaseAdmin
    .from("global_settings")
    .select("key, value");

  const slaPolicy = slaSettings?.find(s => s.key === 'sla_config_by_type')?.value || { Default: 8 };
  const businessHours = slaSettings?.find(s => s.key === 'business_hours')?.value || { exclude_periods: [] };

  const displayUser = user?.email?.replace("@neosupport.local", "") || user?.email;

  return (
    <GraphClient 
      initialTickets={tickets} 
      userEmail={displayUser} 
      slaPolicy={slaPolicy} 
      businessHours={businessHours}
    />
  );
}
