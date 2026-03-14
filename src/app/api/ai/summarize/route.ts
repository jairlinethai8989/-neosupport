import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { ticketId } = await req.json();
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
    }

    // 1. Fetch ticket and messages
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("*, users!reporter_id(display_name, hospitals(name))")
      .eq("id", ticketId)
      .single();

    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    // 2. Prepare prompt for Gemini
    const chatLog = messages?.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n') || '';
    
    const prompt = `
      คุณเป็นผู้ช่วยสรุปงาน IT Support กรุณาสรุปเหตุระเบียบการซ่อมในรูปแบบที่เป็นทางการ:
      
      ข้อมูลเบื้องต้น:
      - เลขที่ตั๋ว: ${ticket.ticket_no}
      - ผู้แจ้ง: ${ticket.users?.display_name} (${ticket.users?.hospitals?.name})
      - อาการที่แจ้ง: ${ticket.description}
      
      ประวัติการสนทนา:
      ${chatLog}
      
      คำสั่ง:
      1. สรุปปัญหาที่เกิดขึ้นจริง (The Real Issue)
      2. สรุปวิธีแก้ปัญหาที่ทำไป (The Resolution)
      3. แนะนำสิ่งที่ควรระวังในอนาคต (Future Advice)
      
      ตอบเป็นภาษาไทย โดยแบ่งเป็นข้อๆ ให้สวยงาม
    `;

    // 3. Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const aiData = await response.json();
    const aiSummary = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "ไม่สามารถสรุปได้";

    // 4. Update Ticket with AI Summary
    await supabaseAdmin
      .from("tickets")
      .update({ ai_summary: aiSummary })
      .eq("id", ticketId);

    return NextResponse.json({ summary: aiSummary });

  } catch (error: any) {
    console.error('AI Summary Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
