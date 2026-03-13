import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import TicketRatingClient from "./TicketRatingClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Verify ticket exists
  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("ticket_no, status, rating")
    .eq("id", id)
    .single();

  if (!ticket) notFound();
  
  // If already rated, we could show a different message or just the thank you
  // For now let's allow them to rate again or see their rating

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <TicketRatingClient ticketNo={ticket.ticket_no} ticketId={id} />
    </div>
  );
}
