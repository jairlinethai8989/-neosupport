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
    const chatLog = messages?.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n') || 'ไม่มีประวัติการสนทนา';
    
    const prompt = `
      คุณเป็นผู้ช่วยผู้เชี่ยวชาญด้าน IT Support ของบริษัท NEO Support
      หน้าที่ของคุณคือสรุป "ใบแจ้งซ่อม" (Service Report) จากข้อมูลที่ได้รับ
      
      ข้อมูลใบแจ้งซ่อม:
      - เลขที่ตั๋ว: ${ticket.ticket_no}
      - ผู้แจ้ง: ${ticket.users?.display_name} (${ticket.users?.hospitals?.name})
      - อาการที่แจ้ง (Description): ${ticket.description}
      - บันทึกการแก้ไข (Resolution Notes): ${ticket.notes || 'ยังไม่มีบันทึกการแก้ไข'}
      
      ประวัติการสนทนาระหว่างลูกค้าและทีมงาน:
      ${chatLog}
      
      คำสั่งสรุปงาน:
      1. สรุปปัญหาที่เกิดขึ้นจริง (The Real Issue): วิเคราะห์จากรายละเอียดและแชท
      2. สรุปวิธีแก้ปัญหาที่ทำไป (The Resolution): ดูจากทั้งบันทึกการแก้ไขและขั้นตอนในแชท
      3. แนะนำสิ่งที่ควรระวังหรือแนวทางในอนาคต (Future Advice): ข้อแนะนำเชิงเทคนิค
      
      กฎการตอบกลับ:
      - ตอบเป็นภาษาไทยที่สุภาพและเป็นทางการ
      - ใช้เครื่องหมายหัวข้อ (Bullet points) ให้ดูง่าย
      - หากข้อมูลน้อยเกินไป ให้พยายามสรุปจากข้อมูลเท่าที่มีให้ดีที่สุด
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
    
    if (aiData.error) {
      console.error('Gemini API Error Payload:', JSON.stringify(aiData.error, null, 2));
      return NextResponse.json({ error: `AI API Error: ${aiData.error.message}` }, { status: 500 });
    }

    const candidate = aiData.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const aiSummary = candidate?.content?.parts?.[0]?.text;

    if (!aiSummary) {
      console.warn('Gemini returned no content. FinishReason:', finishReason, 'Full Response:', JSON.stringify(aiData));
      let fallbackMsg = "ไม่สามารถสรุปได้ในขณะนี้";
      if (finishReason === 'SAFETY') fallbackMsg = "ไม่สามารถสรุปได้เนื่องจากติดข้อจำกัดด้านความปลอดภัยของเนื้อหา";
      else if (finishReason === 'OTHER') fallbackMsg = "ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
      
      return NextResponse.json({ summary: fallbackMsg });
    }

    // 4. Update Ticket with AI Summary
    await supabaseAdmin
      .from("tickets")
      .update({ ai_summary: aiSummary })
      .eq("id", ticketId);

    return NextResponse.json({ summary: aiSummary });

  } catch (error: any) {
    console.error('AI Summary Backend Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
