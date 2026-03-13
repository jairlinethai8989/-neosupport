import { supabaseAdmin } from "./supabase";

/**
 * Categorize a ticket using Google Gemini AI
 */
export async function categorizeTicket(ticketId: string, description: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEMINI_API_KEY not configured. Skipping auto-categorization.");
    return;
  }

  try {
    // 1. Fetch possible categories from departments (Escalation targets)
    const { data: depts } = await supabaseAdmin.from('departments').select('name');
    const categories = depts?.map(d => d.name).join(', ') || 'IT Support, Programmer, QA, System Admin, Network, DBA';

    // 2. Format Prompt
    const prompt = `
      You are an IT Support Dispatcher. Analyze the following IT support request and categorize it.
      
      Request: "${description}"
      
      Available Categories (Departments): ${categories}
      
      Output ONLY a JSON object with:
      - "predicted_category": The most likely department name.
      - "predicted_priority": Choose from ["Critical", "High", "Medium", "Low"].
      - "ai_reasoning": A short explanation in Thai.
      
      JSON Only.
    `;

    // 3. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Empty response from Gemini");

    const prediction = JSON.parse(content);

    // 4. Update the ticket
    const { data: targetDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', prediction.predicted_category)
      .maybeSingle();

    await supabaseAdmin
      .from("tickets")
      .update({
        priority: prediction.predicted_priority,
        current_department_id: targetDept?.id,
        ai_summary: `[Auto-Categorization]\nPriority: ${prediction.predicted_priority}\nReason: ${prediction.ai_reasoning}`
      })
      .eq("id", ticketId);

    console.log(`AI Categorized Ticket ${ticketId}: ${prediction.predicted_category} / ${prediction.predicted_priority}`);

  } catch (err) {
    console.error("AI Categorization Error:", err);
  }
}

/**
 * Summarize a ticket conversation
 */
export async function summarizeConversation(ticketId: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return { error: "AI API Key not configured" };

  try {
    // 1. Fetch messages
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('content, direction, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) return { summary: "ไม่มีข้อความให้สรุป" };

    // 2. Format Conversation for Prompt
    const chatLog = messages.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n');

    const prompt = `
      สรุปการสนทนาแจ้งซ่อมต่อไปนี้ให้เป็นภาษาไทยที่กระชับและได้ใจความ
      
      Conversation:
      ${chatLog}
      
      สรุปเป็นข้อๆ:
      1. ปัญหาคืออะไร:
      2. สิ่งที่ทำไปแล้ว:
      3. สิ่งที่ต้องทำต่อ (ถ้ามี):
    `;

    // 3. Call Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const result = await response.json();
    const summary = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (summary) {
       await supabaseAdmin
         .from("tickets")
         .update({ ai_summary: summary })
         .eq("id", ticketId);
       return { summary };
    }

    return { error: "Failed to generate summary" };
  } catch (err: any) {
    console.error("Summarization Error:", err);
    return { error: err.message };
  }
}

/**
 * Generate an answer based on knowledge base context
 */
export async function getAIAnswerFromKB(query: string, context: any[]) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return "ขออภัยค่ะ/ครับ ระบบ AI ยังไม่พร้อมใช้งานในขณะนี้";

  if (context.length === 0) {
    return "ขออภัยค่ะ/ครับ ไม่พบข้อมูลวิธีแก้ไขปัญหานี้ในฐานข้อมูลเบื้องต้น รบกวนกดปุ่ม 'แจ้งซ่อม' เพื่อให้เจ้าหน้าที่ดูแลให้นะคะ/ครับ";
  }

  const contextText = context.map((item, i) => `[ข้อมูลที่ ${i+1}]\nหัวข้อ: ${item.title}\nวิธีแก้ไข: ${item.content}`).join('\n\n');

  const prompt = `
    คุณเป็นผู้ช่วยสนับสนุนด้าน IT (IT Support Assistant)
    ใช้ข้อมูลจาก "ฐานความรู้" ต่อไปนี้เพื่อตอบคำถามผู้ใช้งาน
    
    ฐานความรู้:
    ${contextText}
    
    คำถามผู้ใช้งาน: "${query}"
    
    คำแนะนำ:
    - ตอบเป็นภาษาไทยที่สุภาพ เป็นกันเอง และใช้หางเสียง "ค่ะ/ครับ" หรือ "นะคะ/ครับ"
    - หากข้อมูลในฐานความรู้ไม่เพียงพอ ให้บอกลูกค้าตามตรงและแนะนำให้กด "แจ้งซ่อม"
    - สรุปวิธีแก้ไขให้เข้าใจง่ายเป็นข้อๆ
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "ไม่สามารถประมวลผลคำตอบได้ในขณะนี้ค่ะ/ครับ";
  } catch (err) {
    console.error("KB AI Answer Error:", err);
    return "เกิดข้อผิดพลาดในการค้นหาคำตอบค่ะ/ครับ รบกวนลองใหม่อีกครั้งนะคะ";
  }
}
