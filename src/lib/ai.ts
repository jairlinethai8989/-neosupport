import { supabaseAdmin } from "./supabase";
import { logger } from "@/lib/logger";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

/**
 * Internal helper to call Gemini API
 */
async function callGemini(prompt: string, jsonMode = false) {
  if (!apiKey) {
    logger.warn("GOOGLE_GEMINI_API_KEY not configured.");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: jsonMode ? { response_mime_type: "application/json" } : {}
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errBody}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return content;
  } catch (err) {
    logger.error("Gemini API Call Error:", err);
    return null;
  }
}

/**
 * Categorize a ticket and suggest priority
 */
export async function categorizeTicket(ticketId: string, description: string) {
  try {
    const { data: depts } = await supabaseAdmin.from('departments').select('name');
    const categories = depts?.map(d => d.name).join(', ') || 'IT Support, Programmer, QA, System Admin, Network, DBA';

    const prompt = `
      You are an IT Support Dispatcher. Analyze this ticket and categorize it.
      Request: "${description}"
      Available Departments: ${categories}
      
      Output ONLY a JSON object with:
      - "predicted_category": The most likely department name.
      - "predicted_priority": Choose from ["Critical", "High", "Medium", "Low"].
      - "ai_reasoning": A short explanation in Thai explaining why.
    `;

    const content = await callGemini(prompt, true);
    if (!content) return;

    const prediction = JSON.parse(content);

    const { data: targetDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', prediction.predicted_category)
      .maybeSingle();

    const { data: currentTicket } = await supabaseAdmin
      .from("tickets")
      .select("ai_metadata")
      .eq("id", ticketId)
      .single();

    const ai_metadata = {
      ...(currentTicket?.ai_metadata || {}),
      suggested_category: prediction.predicted_category,
      suggested_priority: prediction.predicted_priority,
      ai_reasoning: prediction.ai_reasoning,
      last_updated_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from("tickets")
      .update({
        priority: prediction.predicted_priority,
        current_department_id: targetDept?.id || null,
        ai_metadata
      })
      .eq("id", ticketId);

    logger.info(`AI Categorized Ticket ${ticketId}: ${prediction.predicted_category} / ${prediction.predicted_priority}`);
  } catch (err) {
    logger.error("AI Categorization Error:", err);
  }
}

/**
 * Summarize a ticket conversation
 */
export async function summarizeConversation(ticketId: string) {
  try {
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('content, direction, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) return { summary: "ไม่มีข้อความให้สรุป" };

    const chatLog = messages.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n');

    const prompt = `
      สรุปการสนทนาแจ้งซ่อมต่อไปนี้ให้เป็นภาษาไทยที่กระชับและได้ใจความ สำหรับเจ้าหน้าที่ IT
      Conversation:
      ${chatLog}
      
      สรุปเป็นหัวข้อดังนี้:
      1. สรุปปัญหา:
      2. วิธีแก้ไขที่ดำเนินการไปแล้ว:
      3. สิ่งที่ต้องติดตามต่อ:
    `;

    const summary = await callGemini(prompt);
    if (summary) {
       await supabaseAdmin
         .from("tickets")
         .update({ ai_summary: summary })
         .eq("id", ticketId);
       return { summary };
    }

    return { error: "Failed to generate summary" };
  } catch (err: any) {
    logger.error("Summarization Error:", err);
    return { error: err.message };
  }
}

/**
 * Suggest a professional reply in Thai
 */
export async function suggestReply(ticketId: string) {
  try {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('description, ai_summary')
      .eq('id', ticketId)
      .single();

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('content, direction')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(10);

    const chatLog = messages?.reverse().map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n') || "";

    const prompt = `
      คุณเป็นเจ้าหน้าที่ IT Support ที่สุภาพและเป็นมืออาชีพ
      รายละเอียดใบงาน: "${ticket?.description}"
      สรุปงานปัจจุบัน: "${ticket?.ai_summary || 'ยังไม่มี'}"
      บทสนทนาล่าสุด:
      ${chatLog}
      
      งานของคุณ: แนะนำคำตอบถัดไปที่เจ้าหน้าที่ควรพิมพ์หาลูกค้า
      - ตอบเป็นภาษาไทยที่สุภาพ (ใช้ครับ/ค่ะ)
      - แก้ไขปัญหาอย่างตรงจุด หรือสอบถามข้อมูลเพิ่มเติมที่จำเป็น
      - สั้น กระชับ เป็นกันเองแต่เป็นมืออาชีพ
      
      Output ONLY the suggested text in Thai.
    `;

    const suggestion = await callGemini(prompt);
    
    if (suggestion) {
       const { data: currentTicket } = await supabaseAdmin
         .from("tickets")
         .select("ai_metadata")
         .eq("id", ticketId)
         .single();

       const ai_metadata = {
         ...(currentTicket?.ai_metadata || {}),
         suggested_reply: suggestion,
         last_updated_at: new Date().toISOString()
       };

       await supabaseAdmin.from("tickets").update({ ai_metadata }).eq("id", ticketId);
       return { suggestion };
    }
    return { error: "Failed to suggest reply" };
  } catch (err: any) {
    logger.error("Suggest Reply Error:", err);
    return { error: err.message };
  }
}

/**
 * Generate a production-grade resolution summary
 */
export async function generateResolutionSummary(ticketId: string) {
  try {
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('content, direction')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const chatLog = messages?.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n') || "";

    const prompt = `
      วิเคราะห์บทสนทนาด้านล่างและสรุป "วิธีการแก้ไขปัญหา (Resolution)" เพื่อบันทึกเป็นฐานข้อมูล
      บทสนทนา:
      ${chatLog}
      
      Output ONLY a concise technical resolution summary in Thai (1-2 sentences).
      ตัวอย่าง: "ดำเนินการรีเซ็ตสิทธิ์การเข้าใช้งานในระบบ Active Directory และให้ผู้ใช้งานทดสอบ Login ใหม่ ผลการทดสอบผ่านปกติ"
    `;

    const resolution = await callGemini(prompt);
    
    if (resolution) {
       const { data: currentTicket } = await supabaseAdmin
         .from("tickets")
         .select("ai_metadata")
         .eq("id", ticketId)
         .single();

       const ai_metadata = {
         ...(currentTicket?.ai_metadata || {}),
         resolution_summary: resolution,
         last_updated_at: new Date().toISOString()
       };

       await supabaseAdmin.from("tickets").update({ 
         ai_metadata,
         resolution_summary: resolution // also update the dedicated column if exists
       }).eq("id", ticketId);
       
       return { resolution };
    }
    return { error: "Failed to generate resolution" };
  } catch (err: any) {
    logger.error("Resolution Summary Error:", err);
    return { error: err.message };
  }
}

/**
 * Generate Executive AI Insights for Dashboard
 */
export async function generateDashboardInsights() {
  try {
    // 1. Fetch statistics from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('ticket_no, description, status, priority, created_at, users(hospitals(name))')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!tickets || tickets.length === 0) return { message: "Not enough data" };

    const ticketDataString = tickets.map(t => 
      `[${t.ticket_no}] ${t.users?.hospitals?.name || 'Unknown'}: ${t.description.substring(0, 50)} (${t.status}, ${t.priority})`
    ).join('\n');

    const prompt = `
      คุณเป็น AI ที่ปรึกษาผู้บริหาร (Executive AI Consultant)
      วิเคราะห์ข้อมูลใบแจ้งซ่อมในรอบ 7 วันที่ผ่านมา และให้ข้อมูลเชิงลึกสำหรับผู้บริหาร
      ข้อมูล:
      ${ticketDataString}
      
      Output ONLY a JSON object with:
      - "summary": สรุปภาพรวมสั้นๆ (In Thai)
      - "top_issues": รายการปัญหาที่พบบ่อย 3 รายการ (Array of objects with "title" and "count")
      - "efficiency_insight": วิเคราะห์ประสิทธิภาพการทำงาน (Thai)
      - "recommendation": ข้อเสนอแนะเชิงกลยุทธ์สำหรับผู้บริหาร (Thai)
      - "risk_level": "Low", "Medium", "High"
    `;

    const content = await callGemini(prompt, true);
    if (!content) return { error: "AI failed" };

    const insights = JSON.parse(content);

    // 2. Save to ai_insights table
    await supabaseAdmin
      .from('ai_insights')
      .upsert({
        report_date: new Date().toISOString().split('T')[0],
        insight_type: 'executive_weekly',
        content: insights
      }, { onConflict: 'report_date, insight_type' });

    return insights;
  } catch (err) {
    logger.error("Dashboard AI Insights Error:", err);
    return { error: "Internal error" };
  }
}

/**
 * Answer from Knowledge Base (RAG)
 */
export async function getAIAnswerFromKB(query: string, context: any[]) {
  if (context.length === 0) {
    return "ขออภัยค่ะ/ครับ ไม่พบข้อมูลวิธีแก้ไขปัญหานี้ในฐานข้อมูลเบื้องต้น รบกวนกดปุ่ม 'แจ้งเหตุเสีย-แจ้งปัญหา' เพื่อให้เจ้าหน้าที่ดูแลให้นะคะ/ครับ";
  }

  const contextText = context.map((item, i) => `[ข้อมูลที่ ${i+1}]\nหัวข้อ: ${item.title}\nวิธีแก้ไข: ${item.content}`).join('\n\n');

  const prompt = `
    คุณเป็นผู้ช่วยสนับสนุนด้าน IT (IT Support Assistant)
    ใช้ข้อมูลจาก "ฐานความรู้" ต่อไปนี้เพื่อตอบคำถามผู้ใช้งาน
    ฐานความรู้: ${contextText}
    คำถามผู้ใช้งาน: "${query}"
    
    คำแนะนำ:
    - ตอบเป็นภาษาไทยที่สุภาพ (ค่ะ/ครับ)
    - สรุปวิธีแก้ไขให้เข้าใจง่ายเป็นข้อๆ
    - หากไม่ครอบคลุม แนะนำให้กด "แจ้งเหตุเสีย-แจ้งปัญหา"
  `;

  const response = await callGemini(prompt);
  return response || "ไม่สามารถประมวลผลคำตอบได้ในขณะนี้ค่ะ/ครับ";
}
