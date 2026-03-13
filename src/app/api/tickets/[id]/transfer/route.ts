import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { 
    newAssigneeName, 
    newDepartmentId,
    notes,
    status = "Escalated" 
  } = await req.json();

  try {
    // 1. Get current user (who is doing the transfer)
    // In a real app, we'd get this from the session, 
    // but here we might need to pass it or rely on the caller.
    // For now, let's look up the ticket's current state to log the 'from_department'
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("current_department_id, assignee_name")
      .eq("id", id)
      .single();

    // 2. Perform the update
    const updateData: any = {
      status: status,
      handover_notes: notes,
      updated_at: new Date().toISOString()
    };

    if (newAssigneeName !== undefined) updateData.assignee_name = newAssigneeName;
    if (newDepartmentId) updateData.current_department_id = newDepartmentId;

    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Log the handover if it's a department or staff change
    if (newDepartmentId || newAssigneeName) {
       // GET ACTUAL USER from session
       const supabase = await createClient();
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       }

       await supabaseAdmin
         .from("handover_logs")
         .insert({
           ticket_id: id,
           from_department_id: ticket?.current_department_id,
           to_department_id: newDepartmentId || ticket?.current_department_id, // Keep current if only staff changed
           handed_over_by: user.id,
           notes: notes
         });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Transfer Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
