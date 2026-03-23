import { NextRequest, NextResponse } from "next/server";
import {
  verifySignature,
  LineWebhookBody,
  LineEvent,
  replyMessage,
  pushMessage,
  createStaffAlertFlex,
  createReportPromptFlex,
  createConfirmTicketFlex,
} from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase";
import { categorizeTicket, getAIAnswerFromKB } from "@/lib/ai";
import { searchKnowledgeBase } from "@/lib/knowledge";
import { logger } from "@/lib/logger";

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
    logger.debug("LINE Webhook received body length:", body.length);

    // ─── Step 2: Verify LINE signature ──────────────────────
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      logger.warn("Webhook request missing x-line-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 },
      );
    }

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      logger.error("Missing LINE_CHANNEL_SECRET environment variable");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const isValid = verifySignature(body, signature, channelSecret);
    logger.debug("LINE Webhook signature verification status:", isValid);

    if (!isValid) {
      logger.warn("Invalid LINE webhook signature");
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
        logger.error(
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
    logger.error("Webhook fatal error:", error);
    // Return 200 to prevent LINE from retrying on unrecoverable errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// ============================================================
// Event Handler
// ============================================================

// Memory cache to prevent duplicate webhook processing for the same message ID
// Using a Map with timestamps to enable automatic cleanup
const processingEventIds = new Map<string, number>();
const EVENT_CACHE_TTL = 60000; // 1 minute TTL

// Cleanup function to remove old event IDs
function cleanupOldEventIds() {
  const now = Date.now();
  for (const [id, timestamp] of processingEventIds.entries()) {
    if (now - timestamp > EVENT_CACHE_TTL) {
      processingEventIds.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof global !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  if (!(global as any).__lineWebhookCleanup) {
    (global as any).__lineWebhookCleanup = setInterval(cleanupOldEventIds, CLEANUP_INTERVAL);
  }
}

/**
 * Unified Helper to Start Ticket Creation Flow
 */
async function startTicketFlow(userId: string, replyToken: string | undefined): Promise<void> {
  const startTime = Date.now();
  
  // 1. Update user state in Supabase
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      line_metadata: {
        state: "AWAITING_DESCRIPTION",
        state_at: new Date().toISOString(),
        temp_attachments: [],
        temp_description: ""
      }
    })
    .eq("id", userId);

  if (error) {
    logger.error("Failed to update user state for ticket flow:", error);
    if (replyToken) {
      await replyMessage(replyToken, [{ type: "text", text: "❌ ระบบขัดข้องชั่วคราว ไม่สามารถเริ่มแจ้งซ่อมได้ในขณะนี้" }]);
    }
    return;
  }

  // 2. Send the enhanced prompt Flex Message
  if (replyToken) {
    const flexContent = createReportPromptFlex();
    await replyMessage(replyToken, [
      {
        type: "flex",
        altText: "📝 เริ่มต้นระบบแจ้งซ่อม — กรุณาระบุรายละเอียด",
        contents: flexContent
      }
    ]);
  }
  
  logger.info(`[TicketFlow] Started for ${userId} in ${Date.now() - startTime}ms`);
}

/**
 * Unified Helper to Start Knowledge Search Flow
 */
async function startKnowledgeSearchFlow(userId: string, replyToken: string | undefined): Promise<void> {
  const startTime = Date.now();
  
  await supabaseAdmin
    .from("users")
    .update({
      line_metadata: {
        state: "AWAITING_KNOWLEDGE_QUERY",
        state_at: new Date().toISOString()
      }
    })
    .eq("id", userId);

  if (replyToken) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "สวัสดีค่ะ/ครับ รบกวนพิมพ์ปัญหาที่คุณพบ หรือคำถามที่ต้องการให้ AI ช่วยตรวจสอบได้เลยนะคะ/ครับ (เช่น พิมพ์ไม่ได้, เข้าเครื่องไม่ได้)"
      }
    ]);
  }
  
  logger.info(`[KnowledgeFlow] Started for ${userId} in ${Date.now() - startTime}ms`);
}

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
    logger.debug(`Skipping event type: ${event.type}/${event.message?.type}`);
    return;
  }

  const lineGroupId = event.source?.type === "group" ? (event.source as any).groupId : null;
  const lineRoomId = event.source?.type === "room" ? (event.source as any).roomId : null;
  const sourceType = event.source?.type || "user";
  const lineMessageId = event.message?.id;
  const messageType = event.message?.type || "text";
  let messageText = event.message?.text || "";

  // 🆔 COMMAND: /id — Let the bot tell its own ID/Group ID
  if (messageText.trim() === "/id" && event.replyToken) {
    const targetId = lineGroupId || lineRoomId || lineUserId || "Unknown";
    await replyMessage(event.replyToken, [
      { type: "text", text: `Your ${sourceType} ID is:\n${targetId}` }
    ]);
    return;
  }

  // Helpful logging for discovering Group IDs (development only)
  if (lineGroupId || lineRoomId) {
    logger.debug(`[LINE SOURCE DISCOVERY] Group: ${lineGroupId} | Room: ${lineRoomId} | Type: ${sourceType}`);
  }

  // ─── Ticketing Restriction ──────────────────────────────────
  // Only process ticket creation for private 1-on-1 chats.
  if (sourceType !== "user") {
    return;
  }

  // Handle sticker — convert to image URL from LINE Sticker CDN
  if (messageType === "sticker") {
    const packageId = event.message?.packageId;
    const stickerId = event.message?.stickerId;
    if (packageId && stickerId) {
      messageText = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
    } else {
      messageText = "🎭 [สติกเกอร์ / Sticker]";
    }
  }

  logger.debug(`>>> Handling event: ${lineMessageId} from ${lineUserId} type=${messageType}`);

  // For binary media (image/video/sticker), messageText is empty — that's OK
  const isMediaType = ["image", "video", "sticker"].includes(messageType);
  if (!lineUserId || !lineMessageId || (!messageText && !isMediaType)) {
    logger.warn("Event missing userId or required content");
    return;
  }

  // Prevent duplicate processing
  if (processingEventIds.has(lineMessageId)) {
    logger.debug(`Duplicate event detected, skipping: ${lineMessageId}`);
    return;
  }
  processingEventIds.set(lineMessageId, Date.now());

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
      logger.info(`${isVideo ? "Video" : "Image"} uploaded successfully:`, finalContent);
    } catch (e) {
      logger.error("Media process error:", e);
      finalContent = messageType === "video"
        ? "⚠️ [ไม่สามารถโหลดวิดีโอได้]"
        : "⚠️ [ไม่สามารถโหลดรูปภาพได้]";
    }
  }

  logger.info(`Processing message from ${lineUserId}: type=${messageType}`);

  // ─── Step A: Look up user by LINE UID ─────────────────────
  const startTime = Date.now();
  logger.info(`[LINE Webhook] Starting user lookup for ${lineUserId}`);

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, display_name, hospital_id, line_metadata")
    .eq("line_uid", lineUserId)
    .maybeSingle();

  logger.info(`[LINE Webhook] User lookup took ${Date.now() - startTime}ms`);

  if (userError) {
    logger.error("User lookup error in LINE Webhook:", userError);
    return;
  }

  if (!user) {
    logger.warn(`Unregistered LINE user: ${lineUserId}`);

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

  // 1. COMMAND: "แจ้งซ่อม" (From Rich Menu or Typed)
  const ticketCommands = ["แจ้งซ่อม", "แจ้งเหตุเสีย-แจ้งปัญหา"];
  if (ticketCommands.includes(messageText.trim())) {
    await startTicketFlow(user.id, event.replyToken);
    return;
  }

  // 1.1 COMMAND: "ค้นหาวิธีแก้ไข" (From Rich Menu)
  const kbCommands = ["ค้นหาวิธีแก้ไข", "ค้นหาวิธีแก้ไขปัญหาเบื้องต้น"];
  if (kbCommands.includes(messageText.trim())) {
    await startKnowledgeSearchFlow(user.id, event.replyToken);
    return;
  }

  // 2. STATE: AWAITING_DESCRIPTION
  if (currentState === "AWAITING_DESCRIPTION" && !isExpired) {
    const tempAttachments = metadata.temp_attachments || [];
    const currentDesc = metadata.temp_description || "";

    // If user sends media (Image/Video)
    if (isMediaType) {
      const newAttachments = [...tempAttachments, { content: finalContent, type: finalMessageType, id: lineMessageId }];
      
      await supabaseAdmin
        .from("users")
        .update({
          line_metadata: {
            ...metadata,
            temp_attachments: newAttachments,
            state_at: new Date().toISOString() // refresh timeout
          }
        })
        .eq("id", user.id);

      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          {
            type: "flex",
            altText: "🚀 ยืนยันการเปิดใบงาน",
            contents: createConfirmTicketFlex(currentDesc, newAttachments.length)
          }
        ]);
      }
      return;
    }

    // If user sends text -> Update description but don't close yet
    if (messageType === "text" && finalContent) {
      let ticketDescription = finalContent.trim();
      const prefixes = ["เปิดใบงาน:", "ระบุปัญหา:"];
      for (const p of prefixes) {
        if (ticketDescription.startsWith(p)) {
          ticketDescription = ticketDescription.replace(p, "").trim();
        }
      }

      await supabaseAdmin
        .from("users")
        .update({
          line_metadata: {
            ...metadata,
            temp_description: ticketDescription,
            state_at: new Date().toISOString() // refresh timeout
          }
        })
        .eq("id", user.id);

      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          {
            type: "flex",
            altText: "🚀 ยืนยันการเปิดใบงาน",
            contents: createConfirmTicketFlex(ticketDescription, tempAttachments.length)
          }
        ]);
      }
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
            text: "หากข้อมูลข้างต้นยังไม่สามารถแก้ปัญหาได้ คุณสามารถกดปุ่ม 'แจ้งเหตุเสีย-แจ้งปัญหา' เพื่อเปิดใบงานส่งข้อมูลให้เจ้าหน้าที่ได้ทันทีนะคะ/ครับ"
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
    logger.info(`Appending to existing ticket: ${ticketNo}`);

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

    logger.info(`✅ Message appended successfully to ticket ${ticketNo}`);
    return;
  }

  // ─── Step D: Default behavior ─────────────────────────────
  // If no open ticket and not in a command state, we can either prompt them to click "แจ้งซ่อม"
  // or just ignore if it's random chat.
  if (event.replyToken && messageType === "text" && !isExpired) {
    await replyMessage(event.replyToken, [{ type: "text", text: "ต้องการทิ้งข้อความแจ้งเรื่องให้เจ้าหน้าที่หรือไม่คะ? กรุณากดปุ่ม 'แจ้งเหตุเสีย-แจ้งปัญหา' จากหน้าเมนูด้านล่างก่อนนะคะ/ครับ" }]);
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
    const ticketRef = params.get("ticket_id")?.trim();
    const rating = parseInt(params.get("rating") || "0");

    logger.info(`[Postback:Rate] TicketRef: ${ticketRef}, Rating: ${rating}`);

    if (ticketRef && rating >= 1 && rating <= 5) {
      // Try update by UUID first
      const isUuid = /^[0-9a-f-]{36}$/i.test(ticketRef);
      let query = supabaseAdmin.from("tickets").update({
        rating,
        rated_at: new Date().toISOString()
      });

      if (isUuid) {
        query = query.eq("id", ticketRef);
      } else {
        query = query.eq("ticket_no", ticketRef);
      }

      const { data: updated, error } = await query.select("id").maybeSingle();

      if (event.replyToken) {
        if (error) {
          logger.error("[Postback:Rate] DB Update Error:", error);
          await replyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่สามารถบันทึกคะแนนได้ในขณะนี้ (" + (error.message || "DB Error") + ") กรุณาลองใหม่อีกครั้งนะคะ/ครับ" }]);
        } else if (!updated) {
          logger.warn("[Postback:Rate] Ticket not found:", ticketRef);
          await replyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลใบงานนี้ในระบบ หรือใบงานอาจถูกลบไปแล้วค่ะ/ครับ" }]);
        } else {
          await replyMessage(event.replyToken, [
            {
              type: "text",
              text: `ขอบคุณที่ให้คะแนน ${rating} ดาว นะคะ/ครับ! ✨\nทีมงานได้รับคะแนนความพึงพอใจของคุณเรียบร้อยแล้วค่ะ/ครับ 🙏`
            }
          ]);
        }
      }
    } else {
      logger.warn("[Postback:Rate] Invalid params:", { ticketRef, rating });
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
       if (event.replyToken) {
         const regUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/customer?uid=${lineUserId}`;
         await replyMessage(event.replyToken, [{ type: "text", text: `กรุณาลงทะเบียนก่อนแจ้งซ่อมที่นี่นะคะ/ครับ: ${regUrl}` }]);
       }
       return;
    }

    // Use unified helper to start flow without showing text message on user screen
    await startTicketFlow(user.id, event.replyToken);
    return;
  }

  if (action === "knowledge_search") {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("line_uid", lineUserId)
      .maybeSingle();

    if (!user) return;
    await startKnowledgeSearchFlow(user.id, event.replyToken);
    return;
  }

  if (action === "cancel_ticket") {
    // Clear user metadata state
    await supabaseAdmin
      .from("users")
      .update({ line_metadata: {} })
      .eq("line_uid", lineUserId);

    if (event.replyToken) {
      await replyMessage(event.replyToken, [{ type: "text", text: "ยกเลิกรายการเรียบร้อยแล้วค่ะ/ครับ หากต้องการแจ้งใหม่สามารถกดปุ่มจากเมนูได้ทุกเมื่อค่ะ/ครับ" }]);
    }
    return;
  }

  if (action === "finalize_ticket") {
    // 1. Look up user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, display_name, line_uid, line_metadata, hospitals(name)")
      .eq("line_uid", lineUserId)
      .maybeSingle();

    if (!user) return;
    const metadata = (user.line_metadata as any) || {};
    const description = metadata.temp_description || "";
    const attachments = metadata.temp_attachments || [];

    if (!description && attachments.length === 0) {
      if (event.replyToken) {
        await replyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบรายละเอียดสำหรับเปิดใบงาน กรุณากดปุ่ม 'แจ้งเหตุเสีย-แจ้งปัญหา' เพื่อเริ่มใหม่อีกครั้งนะคะ/ครับ" }]);
      }
      return;
    }

    // 2. Create the ticket
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        description: description || "แจ้งซ่อมผ่านรูปภาพ/วิดีโอ",
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
      logger.error("Finalize ticket error:", ticketError);
      if (event.replyToken) {
        await replyMessage(event.replyToken, [{ type: "text", text: "❌ เกิดข้อผิดพลาดในการเปิดใบงาน กรุณาลองใหม่นะคะ/ครับ" }]);
      }
      return;
    }

    const ticketId = newTicket.id;
    const ticketNo = newTicket.ticket_no;

    // 3. Reply to user
    if (event.replyToken) {
      const replyText =
        `✅ สร้างใบงานสำเร็จแล้วค่ะ/ครับ!\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `📋 หมายเลข: ${ticketNo}\n` +
        `📝 รายละเอียด: ${description.substring(0, 100)}${description.length > 100 ? "..." : ""}\n` +
        (attachments.length > 0 ? `🖼️ ไฟล์แนบ: ${attachments.length} ไฟล์\n` : "") +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `ทีมงานได้รับเรื่องแล้ว และจะรีบตรวจสอบให้นะคะ/ครับ 🙏`;
      await replyMessage(event.replyToken, [{ type: "text", text: replyText }]);
    }

    // 4. Save messages and reset state
    const messagesToInsert = [
      ...attachments.map((att: any) => ({
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
        content: description || "[เปิดใบงาน]",
        message_type: "text",
        direction: "inbound"
      }
    ];

    await Promise.all([
      supabaseAdmin.from("messages").insert(messagesToInsert),
      supabaseAdmin.from("users").update({ line_metadata: {} }).eq("id", user.id),
      // Notify Staff
      (async () => {
        const staffGroupId = process.env.LINE_STAFF_GROUP_ID;
        if (staffGroupId) {
          const flexContent = createStaffAlertFlex({
            ticket_no: ticketNo,
            description: description || "แจ้งซ่อมผ่านภาพประกอบ",
            hospital_name: (user as any).hospitals?.name || "Unknown Hospital",
            reporter_name: user.display_name,
            priority: newTicket.priority || "Medium"
          });
          await pushMessage(staffGroupId, [{ type: "flex", altText: `🚨 งานใหม่: ${ticketNo}`, contents: flexContent }]);
        }
      })(),
      categorizeTicket(ticketId, description || "Image/Video Report")
    ]);

    return;
  }
}
