import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hospitalId, module, issue_type, description, imageUrl } = body;
    console.log("Creating ticket for hospital:", hospitalId, "description:", description);

    if (!hospitalId || !description) {
      console.warn("Missing required fields: hospitalId or description");
      return NextResponse.json(
        { error: "Hospital and Description are required" },
        { status: 400 }
      );
    }

    // Attempt to find any user belonging to the selected hospital to use as the dummy reporter 
    // This allows the DB trigger to generate the correct ticket_no sequence based on hospital abbreviation.
    let { data: users, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('hospital_id', hospitalId)
      .limit(1);

    let reporterId = null;

    if (fetchErr) {
      console.error("Error fetching user for hospital:", fetchErr);
    }

    if (users && users.length > 0) {
      reporterId = users[0].id;
    } else {
      // If no user exists for this hospital, we create a temporary "System" reporter
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({
          hospital_id: hospitalId,
          display_name: "IT System (Manual)",
          line_uid: "manual_" + Date.now().toString(),
          department: "IT Dept"
        })
        .select()
        .single();
        
      if (createErr) {
        console.error("Error creating temporary system user:", createErr);
        throw new Error("Cannot find or create a user for this Hospital to generate the ticket.");
      }
      
      if (newUser) {
        reporterId = newUser.id;
      } else {
        throw new Error("Cannot find or create a user for this Hospital to generate the ticket.");
      }
    }

    // Now insert the ticket.
    // Notice we pass `source = "IT"` or "MANUAL"
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        description,
        reporter_id: reporterId,
        source: "MANUAL",
        status: "Pending",
        issue_type: issue_type || null,
        module,
        assignee_name: "IT Support", // Claimed automatically as per request
      })
      .select("id, ticket_no")
      .single();

    if (ticketError) throw ticketError;

    // If an image was provided, add it as the first message
    if (imageUrl) {
      await supabaseAdmin.from("messages").insert({
        ticket_id: newTicket.id,
        content: imageUrl,
        message_type: "image",
        direction: "inbound",
        line_uid: "manual"
      });
    }

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
