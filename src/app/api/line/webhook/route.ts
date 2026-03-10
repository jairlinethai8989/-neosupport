import { NextRequest, NextResponse } from "next/server";
import {
  verifySignature,
  LineWebhookBody,
  LineEvent,
  replyMessage,
} from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase";

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

    if (!verifySignature(body, signature, channelSecret)) {
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
  // Only process message events
  const SUPPORTED_TYPES = ["text", "image", "video", "sticker"];
  if (event.type !== "message" || !SUPPORTED_TYPES.includes(event.message?.type || "")) {
    console.log(`Skipping event type: ${event.type}/${event.message?.type}`);
    return;
  }

  const lineUserId = event.source?.userId;
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
    .select("id, display_name, hospital_id")
    .eq("line_uid", lineUserId)
    .maybeSingle(); 
  
  console.log(`[LINE Webhook] User lookup took ${Date.now() - startTime}ms`);

  if (userError) {
    console.error("User lookup error:", userError);
    return;
  }

  if (!user) {
    console.warn(`Unregistered LINE user: ${lineUserId}`);

    // Reply telling them to register
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text:
            "⚠️ คุณยังไม่ได้ลงทะเบียนในระบบ\n\n" +
            "กรุณาติดต่อผู้ดูแลระบบ IT เพื่อลงทะเบียนก่อนใช้งานระบบแจ้งปัญหาครับ\n\n" +
            "📞 ติดต่อ: ทีม IT Support",
        },
      ]);
    }
    return;
  }

  // ─── Step B: Check for existing open ticket ───────────────
  // An "open" ticket is one with status Pending or In Progress
  const { data: existingTicket } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_no")
    .eq("reporter_id", user.id)
    .in("status", ["Pending", "In Progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ticketId: string;
  let ticketNo: string;
  let isNewTicket = false;

  if (existingTicket) {
    // ─── Use existing open ticket ───────────────────────────
    ticketId = existingTicket.id;
    ticketNo = existingTicket.ticket_no;
    console.log(`Appending to existing ticket: ${ticketNo}`);
  } else {
    // ─── Create a new ticket ────────────────────────────────
    const createStartTime = Date.now();
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        description: messageType === "image" ? "🖼️ [รูปภาพแนบ]" : finalContent,
        reporter_id: user.id,
        source: "LINE",
        status: "Pending", // Will be shown as 'งานใหม่' in UI
        issue_type: null, // Removed default PB as per request
      })
      .select("id, ticket_no")
      .single();
    
    console.log(`[LINE Webhook] Ticket creation took ${Date.now() - createStartTime}ms`);

    if (ticketError || !newTicket) {
      console.error("Failed to create ticket:", ticketError);
      if (event.replyToken) {
        await replyMessage(event.replyToken, [
          {
            type: "text",
            text: "❌ เกิดข้อผิดพลาดในการสร้าง Ticket กรุณาลองใหม่อีกครั้งครับ",
          },
        ]);
      }
      return;
    }

    ticketId = newTicket.id;
    ticketNo = newTicket.ticket_no;
    isNewTicket = true;
    console.log(`Created new ticket: ${ticketNo}`);
  }

  // ─── Step D: Reply to user ONLY when a new ticket is created ───
  // We do NOT reply on every subsequent message to avoid spam.
  // Closing notification is sent separately via /api/tickets/[id]/status.
  if (isNewTicket && event.replyToken) {
    const displayMsg = messageType === "image"   ? "🖼️ [รูปภาพแนบ]" :
                       messageType === "video"   ? "🎬 [วิดีโอแนบ]" :
                       messageType === "sticker" ? "🎭 [สติกเกอร์]" :
                       finalContent;
    const replyText =
      `✅ สร้าง Ticket ใหม่เรียบร้อยแล้ว\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `📋 หมายเลข: ${ticketNo}\n` +
      `📝 รายละเอียด: ${displayMsg.substring(0, 100)}${displayMsg.length > 100 ? "..." : ""}\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `ทีมงานจะรับเรื่องและตรวจสอบให้เร็วที่สุดครับ 🙏`;

    const replyStartTime = Date.now();
    await replyMessage(event.replyToken, [
      { type: "text", text: replyText },
    ]);
    console.log(`[LINE Webhook] replyMessage took ${Date.now() - replyStartTime}ms`);
  }

  // ─── Step C: Save message to database ───────────────────────
  const savedContent = finalContent;
  const savedType    = finalMessageType;

  const { error: messageError } = await supabaseAdmin
    .from("messages")
    .insert({
      ticket_id: ticketId,
      line_uid: lineUserId,
      content: savedContent,
      message_type: savedType,
      line_message_id: lineMessageId,
      direction: "inbound",
    });

  if (messageError) {
    console.error("Failed to save message:", messageError);
  }

  console.log(`✅ Event processed successfully for ticket ${ticketNo} in ${Date.now() - startTime}ms`);
  
  // Clean up cache after some time (10 seconds) to prevent infinite memory growth
  setTimeout(() => {
    processingEventIds.delete(lineMessageId);
  }, 10000);
}
