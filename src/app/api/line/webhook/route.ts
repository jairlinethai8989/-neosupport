import { NextRequest, NextResponse } from "next/server";
import {
  verifySignature,
  LineWebhookBody,
  LineEvent,
  replyMessage,
  pushMessage,
  createStaffAlertFlex,
} from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase";
import { categorizeTicket, getAIAnswerFromKB } from "@/lib/ai";
import { searchKnowledgeBase } from "@/lib/knowledge";

// ============================================================
// LINE Webhook API Route
// POST /api/line/webhook
// ============================================================
// This endpoint receives webhook events from LINE Messaging API.
//
// Flow for each text message:
// 1. Verify the request signature (security)
// 2. Look up the user by LINE UID
// 3. Check if there's an existing open ticket for the user
// 4. If no open ticket → create a new ticket (auto-generates ticket_no)
// 5. Save the message linked to the ticket
// 6. Reply to the user with a confirmation
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // ─── Step 1: Read raw body ──────────────────────────────
    const body = await request.text();
    console.log("LINE Webhook received body length:", body.length);

    // ─── Step 2: Verify LINE signature ──────────────────────
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      console.warn("Webhook request missing x-line-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 },
      );
    }

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error("Missing LINE_CHANNEL_SECRET environment variable");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const isValid = verifySignature(body, signature, channelSecret);
    console.log("LINE Webhook signature verification status:", isValid);

    if (!isValid) {
      console.warn("Invalid LINE webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    // ─── Step 3: Parse the webhook payload ──────────────────
    const payload: LineWebhookBody = JSON.parse(body);

    // LINE sends a verification request with 0 events on webhook URL setup
    if (!payload.events || payload.events.length === 0) {
      return NextResponse.json({ message: "No events" }, { status: 200 });
    }

    // ─── Step 4: Process each event concurrently ────────────
    const results = await Promise.allSettled(
      payload.events.map((event) => handleEvent(event)),
    );

    // Log any failed event handlers
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to handle event ${index}:`,
          result.reason,
        );
      }
    });

    // ─── Step 5: Always return 200 to LINE ──────────────────
    // LINE will retry if we don't return 200, so always return
    // success even if individual event processing fails.
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook fatal error:", error);
    // Return 200 to prevent LINE from retrying on unrecoverable errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// ============================================================
// Event Handler
// ============================================================

// Memory cache to prevent duplicate webhook processing for the same message ID
const processingEventIds = new Set<string>();

async function handleEvent(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  // 1. Handle POSTBACK (e.g., Rating Stars)
  if (event.type === "postback" && event.postback) {
    await handlePostback(event, lineUserId);
    return;
  }

  // 2. Handle MESSAGE events
  const SUPPORTED_TYPES = ["text", "image", "video", "sticker"];
  if (event.type !== "message" || !SUPPORTED_TYPES.includes(event.message?.type || "")) {
    console.log(`Skipping event type: ${event.type}/${event.message?.type}`);
    return;
  }

  const lineGroupId = event.source?.type === "group" ? (event.source as any).groupId : null;
  const lineRoomId = event.source?.type === "room" ? (event.source as any).roomId : null;
  const sourceType = event.source?.type || "user";
  const lineMessageId = event.message?.id;
  const messageType = event.message?.type || "text"; // "text", "image", or "sticker"
  let messageText = event.message?.text || "";

  // 🆔 COMMAND: /id — Let the bot tell its own ID/Group ID
  if (messageText.trim() === "/id" && event.replyToken) {
    const targetId = lineGroupId || lineRoomId || lineUserId || "Unknown";
    await replyMessage(event.replyToken, [
      { type: "text", text: `Your ${sourceType} ID is:\n${targetId}` }
    ]);
    return;
  }

  // Helpful logging for discovering Group IDs
  if (lineGroupId || lineRoomId) {
    console.log(`[LINE SOURCE DISCOVERY] Group: ${lineGroupId} | Room: ${lineRoomId} | Type: ${sourceType}`);
  }

  // ─── Ticketing Restriction ──────────────────────────────────
  // Only process ticket creation for private 1-on-1 chats.
  if (sourceType !== "user") {
    // console.log(`[LINE Webhook] Skipping ticketing: Source is ${sourceType}`);
    return;
  }

  // Handle sticker — convert to image URL from LINE Sticker CDN
  if (messageType === "sticker") {
    const packageId = event.message?.packageId;
    const stickerId = event.message?.stickerId;
    if (packageId && stickerId) {
      // LINE Sticker CDN URL (animated stickers use .gif, regular use .png)
      messageText = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
    } else {
      messageText = "🎭 [สติกเกอร์ / Sticker]";
    }
  }

  console.log(`>>> Handling event: ${lineMessageId} from ${lineUserId} type=${messageType}`);

  // For binary media (image/video/sticker), messageText is empty — that's OK
  const isMediaType = ["image", "video", "sticker"].includes(messageType);
  if (!lineUserId || !lineMessageId || (!messageText && !isMediaType)) {
    console.warn("Event missing userId or required content");
    return;
  }

  // Prevent duplicate processing
  if (processingEventIds.has(lineMessageId)) {
    console.log(`Duplicate event detected, skipping: ${lineMessageId}`);
    return;
  }
  processingEventIds.add(lineMessageId);

  let finalContent = messageText;
  let finalMessageType = messageType === "sticker" ? "image" : messageType; // sticker saved as image

  // Download image/video from LINE Content API
  if (messageType === "image" || messageType === "video") {
    try {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (!token) throw new Error("No LINE token");

      const res = await fetch(`https://api-data.line.me/v2/bot/message/${lineMessageId}/content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch content from LINE");

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isVideo = messageType === "video";
      const ext = isVideo ? "mp4" : "jpg";
      const contentTypeMime = isVideo ? "video/mp4" : "image/jpeg";
      const fileName = `${Date.now()}_${lineMessageId}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("attachments")
        .upload(fileName, buffer, { contentType: contentTypeMime });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(fileName);
      finalContent = data.publicUrl;
      finalMessageType = isVideo ? "video" : "image";
      console.log(`${isVideo ? "Video" : "Image"} uploaded successfully:`, finalContent);
    } catch (e) {
      console.error("Media process error:", e);
      finalContent = messageType === "video"
        ? "⚠️ [ไม่สามารถโหลดวิดีโอได้]"
        : "⚠️ [ไม่สามารถโหลดรูปภาพได้]";
    }
  }

  console.log(`Processing message from ${lineUserId}: type=${messageType}`);

  // ─── Step A: Look up user by LINE UID ─────────────────────
  const startTime = Date.now();
  console.log(`[LINE Webhook] Starting user lookup for ${lineUserId}`);
  
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, display_name, hospital_id, line_metadata")
    .eq("line_uid", lineUserId)
    .maybeSingle(); 
  
  console.log(`[LINE Webhook] User lookup took ${Date.now() - startTime}ms`);

  if (userError) {
    console.error("User lookup error in LINE Webhook:", userError);
    return;
  }

  if (!user) {
    console.warn(`Unregistered LINE user: ${lineUserId}`);

    // REPLY: Invite user to register via Flex Message
    if (event.replyToken) {
      const regUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/customer?uid=${lineUserId}`;
      
      await replyMessage(event.replyToken, [
        {
          type: "flex",
          altText: "กรุณาลงทะเบียนเพื่อใช้งานระบบแจ้งซ่อม",
          contents: {
            type: "bubble",
            hero: {
              type: "image",
              url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop",
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "cover"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "ยินดีต้อนรับสู่ NEO Support 🏥",
                  weight: "bold",
                  size: "lg"
                },
                {
                  type: "text",
                  text: "เพื่อความรวดเร็วในการบริการ กรุณาลงทะเบียนยืนยันตัวตน (ครั้งเดียว) ก่อนเริ่มงานนะคะ/ครับ",
                  wrap: true,
                  size: "sm",
                  color: "#666666",
                  margin: "md"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#06C755",
                  action: {
                    type: "uri",
                    label: "✍️ ลงทะเบียนแจ้งซ่อม",
                    uri: regUrl
                  }
                }
              ]
            }
          }
        }
      ]);
    }
    return;
  }

  // ─── Step B: State-based Workflow ────────────────────────────
  const metadata = (user.line_metadata as any) || {};
  const currentState = metadata.state;
  const stateAt = metadata.state_at ? new Date(metadata.state_at) : null;
  const isExpired = stateAt && (Date.now() - stateAt.getTime() > 30 * 60 * 1000); // 30 mins

  // 1. COMMAND: "แจ้งซ่อม" (From Rich Menu)
  if (messageText.trim() === "แจ้งซ่อม") {
    // Start DB update
    const dbPromise = supabaseAdmin
      .from("users")
      .update({
        line_metadata: {
          state: "AWAITING_DESCRIPTION",
          state_at: new Date().toISOString(),
          temp_attachments: []
        }
      })
      .eq("id", user.id);

    // Reply immediately
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "สวัสดีค่ะ/ครับ รบกวนช่วยพิมพ์ระบุรายละเอียดปัญหา หรือถ่ายรูปส่งมาเพื่อเปิดใบงานได้เลยนะคะ/ครับ",
          quickReply: {
            items: [
              {
                type: "action",
                action: { type: "message", label: "📄 พิมพ์รายละเอียด", text: "เปิดใบงาน: " }
              }
            ]
          }
        }
      ]);
    }
    await dbPromise; // Ensure DB updated
    return;
  }

  // 1.1 COMMAND: "ค้นหาวิธีแก้ไข" (From Rich Menu)
  if (messageText.trim() === "ค้นหาวิธีแก้ไข") {
    await supabaseAdmin
      .from("users")
      .update({
        line_metadata: {
          state: "AWAITING_KNOWLEDGE_QUERY",
          state_at: new Date().toISOString()
        }
      })
      .eq("id", user.id);

    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "สวัสดีค่ะ/ครับ รบกวนพิมพ์ปัญหาที่คุณพบ หรือคำถามที่ต้องการให้ AI ช่วยตรวจสอบได้เลยนะคะ/ครับ (เช่น พิมพ์ไม่ได้, เข้าเครื่องไม่ได้)"
        }
      ]);
    }
    return;
  }

  // 2. STATE: AWAITING_DESCRIPTION
  if (currentState === "AWAITING_DESCRIPTION" && !isExpired) {
    // If user sends media (Image/Video)
    if (isMediaType) {
      const newAttachments = [...(metadata.temp_attachments || []), { content: finalContent, type: finalMessageType, id: lineMessageId }];
      
      await supabaseAdmin
        .from("users")
        .update({
          line_metadata: {
            ...metadata,
            temp_attachments: newAttachments
          }
        })
        .eq("id", user.id);

      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          {
            type: "text",
            text: "ได้รับไฟล์เรียบร้อยแล้วค่ะ/ครับ รบกวนช่วยพิมพ์สรุปปัญหาที่พบสักนิด เพื่อใช้เป็นหัวข้อและเปิดใบงานให้นะคะ/ครับ"
          }
        ]);
      }
      return;
    }

    // If user sends text -> This becomes the ticket description and OPENS the ticket
    if (messageType === "text" && finalContent) {
      const ticketDescription = finalContent;
      const tempAttachments = metadata.temp_attachments || [];

      // ─── Create the ticket ────────────────────────────────
      const { data: newTicket, error: ticketError } = await supabaseAdmin
        .from("tickets")
        .insert({
          description: ticketDescription,
          reporter_id: user.id,
          source: "LINE",
          status: "Pending",
        })
        .select(`
          id, 
          ticket_no, 
          description, 
          priority,
          users!reporter_id (
            display_name,
            hospitals (name)
          )
        `)
        .single();

      if (ticketError || !newTicket) {
        console.error("Failed to create ticket:", ticketError);
        if (event.replyToken) {
          await replyMessage(event.replyToken, [{ type: "text", text: "❌ เกิดข้อผิดพลาดในการสร้าง Ticket กรุณาลองใหม่อีกครั้งนะคะ/ครับ" }]);
        }
        return;
      }

      const ticketId = newTicket.id;
      const ticketNo = newTicket.ticket_no;

      // ─── Reply to user IMMEDIATELY for perceived speed ───────
      if (event.replyToken) {
        const hasMedia = tempAttachments.length > 0;
        const replyText =
          `✅ เปิดใบงานใหม่เรียบร้อยแล้วค่ะ/ครับ\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `📋 หมายเลข: ${ticketNo}\n` +
          `📝 รายละเอียด: ${ticketDescription.substring(0, 100)}${ticketDescription.length > 100 ? "..." : ""}\n` +
          (hasMedia ? `🖼️ ไฟล์แนบ: ${tempAttachments.length} ไฟล์\n` : "") +
          `━━━━━━━━━━━━━━━━━\n\n` +
          `ทีมงานจะรับเรื่องและตรวจสอบให้เร็วที่สุดนะคะ/ครับ 🙏`;

        // Send and await reply before finishing other DB tasks
        await replyMessage(event.replyToken, [{ type: "text", text: replyText }]);
      }

      // ─── Run remaining tasks in background or parallel ─────
      const messagesToInsert = [
        ...tempAttachments.map((att: any) => ({
          ticket_id: ticketId,
          line_uid: lineUserId,
          content: att.content,
          message_type: att.type,
          line_message_id: att.id,
          direction: "inbound"
        })),
        {
          ticket_id: ticketId,
          line_uid: lineUserId,
          content: ticketDescription,
          message_type: "text",
          line_message_id: lineMessageId,
          direction: "inbound"
        }
      ];

      // Use Promise.all to run non-dependent operations faster
      await Promise.all([
        supabaseAdmin.from("messages").insert(messagesToInsert),
        supabaseAdmin.from("users").update({ line_metadata: {} }).eq("id", user.id),
        // Notify Staff Group in background
        (async () => {
          const staffGroupId = process.env.LINE_STAFF_GROUP_ID;
          if (staffGroupId) {
            const flexContent = createStaffAlertFlex({
              ticket_no: ticketNo,
              description: ticketDescription,
              hospital_name: (newTicket.users as any)?.hospitals?.name || "Unknown Hospital",
              reporter_name: (newTicket.users as any)?.display_name || "Unknown User",
              priority: newTicket.priority || "Medium"
            });
            await pushMessage(staffGroupId, [{ type: "flex", altText: `🚨 งานใหม่: ${ticketNo}`, contents: flexContent }]);
          }
        })(),
        // Trigger AI Categorization in background
        categorizeTicket(ticketId, ticketDescription)
      ]);
      
      return;
    }
  }

  // 2.1 STATE: AWAITING_KNOWLEDGE_QUERY
  if (currentState === "AWAITING_KNOWLEDGE_QUERY" && !isExpired) {
    if (messageType === "text" && finalContent) {
      // Search KB
      const context = await searchKnowledgeBase(finalContent);
      
      // Get AI Answer
      const aiResponse = await getAIAnswerFromKB(finalContent, context);

      // Clear State and Reply
      await supabaseAdmin
        .from("users")
        .update({ line_metadata: null })
        .eq("id", user.id);

      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          {
            type: "text",
            text: aiResponse
          },
          {
            type: "text",
            text: "หากข้อมูลข้างต้นยังไม่สามารถแก้ปัญหาได้ คุณสามารถกดเมนู 'แจ้งซ่อม' เพื่อเปิดใบงานหาเจ้าหน้าที่ได้ทันทีนะคะ/ครับ"
          }
        ]);
      }
      return;
    }
  }

  // ─── Step C: Append to existing open ticket ───────────────
  // If not in AWAITING_DESCRIPTION state or state expired, check for open tickets to append messages
  const { data: existingTicket } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_no")
    .eq("reporter_id", user.id)
    .in("status", ["Pending", "In Progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTicket) {
    const ticketId = existingTicket.id;
    const ticketNo = existingTicket.ticket_no;
    console.log(`Appending to existing ticket: ${ticketNo}`);

    // Save message to database
    await supabaseAdmin
      .from("messages")
      .insert({
        ticket_id: ticketId,
        line_uid: lineUserId,
        content: finalContent,
        message_type: finalMessageType,
        line_message_id: lineMessageId,
        direction: "inbound",
      });

    console.log(`✅ Message appended successfully to ticket ${ticketNo}`);
    
    // Clean up cache
    setTimeout(() => {
      processingEventIds.delete(lineMessageId);
    }, 10000);
    return;
  }

  // ─── Step D: Default behavior ─────────────────────────────
  // If no open ticket and not in a command state, we can either prompt them to click "แจ้งซ่อม"
  // or just ignore if it's random chat.
  if (event.replyToken && messageType === "text" && !isExpired) {
    await replyMessage(event.replyToken, [{ type: "text", text: "ต้องการแจ้งซ่อมหรือไม่คะ? กรุณากดปุ่ม 'แจ้งซ่อม' จากเมนู Rich Menu หรือพิมพ์ 'แจ้งซ่อม' เพื่อเริ่มแจ้งงานนะคะ/ครับ" }]);
  }

  // Clean up cache for handled event
  setTimeout(() => {
    processingEventIds.delete(lineMessageId);
  }, 10000);
}

/**
 * Handle Postback events (Rating, etc.)
 */
async function handlePostback(event: LineEvent, lineUserId: string): Promise<void> {
  const data = event.postback?.data || "";
  const params = new URLSearchParams(data);
  const action = params.get("action");

  if (action === "rate") {
    const ticketId = params.get("ticket_id");
    const rating = parseInt(params.get("rating") || "0");

    if (ticketId && rating > 0) {
      const { error } = await supabaseAdmin
        .from("tickets")
        .update({
          rating,
          rated_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      if (event.replyToken) {
        if (error) {
          await replyMessage(event.replyToken, [{ type: "text", text: "❌ เกิดข้อผิดพลาดในการบันทึกคะแนน กรุณาลองใหม่อีกครั้งนะคะ/ครับ" }]);
        } else {
          await replyMessage(event.replyToken, [
            { 
              type: "text", 
              text: `ขอบคุณที่ให้คะแนน ${rating} ดาว นะคะ/ครับ! ✨\nทีมงานจะมุ่งมั่นพัฒนาการบริการให้ดียิ่งขึ้นไปอีกค่ะ/ครับ 🙏` 
            }
          ]);
        }
      }
    }
    return;
  }

  if (action === "report") {
    // Look up user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("line_uid", lineUserId)
      .maybeSingle();

    if (!user) {
       // Not registered, same as Step A in handleEvent
       if (event.replyToken) {
         const regUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/customer?uid=${lineUserId}`;
         await replyMessage(event.replyToken, [{ type: "text", text: `กรุณาลงทะเบียนก่อนแจ้งซ่อมที่นี่นะคะ/ครับ: ${regUrl}` }]);
       }
       return;
    }

    // Update state to AWAITING_DESCRIPTION
    await supabaseAdmin
      .from("users")
      .update({
        line_metadata: {
          state: "AWAITING_DESCRIPTION",
          state_at: new Date().toISOString(),
          temp_attachments: []
        }
      })
      .eq("id", user.id);

    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "สวัสดีค่ะ/ครับ รบกวนช่วยพิมพ์ระบุรายละเอียดปัญหา หรือถ่ายรูปส่งมาเพื่อเปิดใบงานได้เลยนะคะ/ครับ",
          quickReply: {
            items: [
              {
                type: "action",
                action: { type: "message", label: "📄 พิมพ์รายละเอียด", text: "เปิดใบงาน: " }
              }
            ]
          }
        }
      ]);
    }
  }
}
