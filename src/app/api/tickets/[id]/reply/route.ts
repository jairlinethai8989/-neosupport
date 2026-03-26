import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const contentType = request.headers.get("content-type") || "";
    let text     = "";
    let lineUid  = "";
    let fileUrl  = "";
    let fileType = "image"; // "image" | "video"
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      text     = (formData.get("text")     as string) || "";
      lineUid  = (formData.get("lineUid")  as string) || "";
      fileUrl  = (formData.get("fileUrl")  as string) || "";
      fileType = (formData.get("fileType") as string) || "image";
      file     = formData.get("file") as File | null;
    } else {
      const body = await request.json();
      text    = body.text    || "";
      lineUid = body.lineUid || "";
      fileUrl = body.fileUrl || "";
      fileType = body.fileType || "image";
    }

    if ((!text && !fileUrl && !file) || !lineUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Upload file to Supabase Storage ─────────────────────
    if (file) {
      const isVideoFile = file.type.startsWith("video/");
      const isImageFile = file.type.startsWith("image/");
      const isAudioFile = file.type.startsWith("audio/");
      
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from("attachments")
        .upload(fileName, fileBuffer, { 
          contentType: file.type || "application/octet-stream",
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("Failed to upload file:", uploadError);
        return NextResponse.json({ error: "File upload failed" }, { status: 500 });
      }

      const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(fileName);
      fileUrl  = data.publicUrl;
      
      if (isImageFile) fileType = "image";
      else if (isVideoFile) fileType = "video";
      else if (isAudioFile) fileType = "audio";
      else fileType = "file";
    }

    const hasFile  = !!fileUrl;
    const dbContent = hasFile ? fileUrl : text;
    const dbType    = hasFile ? fileType : "text";

    // ── Save message to Supabase ─────────────────────────────
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        ticket_id:    ticketId,
        line_uid:     "SYSTEM",
        content:      dbContent,
        message_type: dbType,
        direction:    "outbound",
      })
      .select()
      .single();

    if (messageError) {
      console.error("Failed to save message:", messageError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }

    // ── Push message via LINE API ────────────────────────────
    try {
      let messagesPayload: any[];

      if (dbType === "image") {
        messagesPayload = [{ type: "image", originalContentUrl: fileUrl, previewImageUrl: fileUrl }];
      } else if (dbType === "video") {
        const previewUrl = `https://via.placeholder.com/480x270.png?text=Video`;
        messagesPayload = [{ type: "video", originalContentUrl: fileUrl, previewImageUrl: previewUrl }];
      } else if (dbType === "audio") {
        messagesPayload = [{ type: "audio", originalContentUrl: fileUrl, duration: 60000 }]; // Default 60s
      } else if (dbType === "file") {
        messagesPayload = [{ type: "text", text: `🧑‍💻 [IT Support: File Shared]\n${text || 'มีไฟล์แนบส่งถึงคุณ'}\nคลิกเพื่อดาวน์โหลด: ${fileUrl}` }];
      } else {
        messagesPayload = [{ type: "text", text: `🧑‍💻 [IT Support]\n${text}` }];
      }

      await pushMessage(lineUid, messagesPayload);
    } catch (pushError) {
      console.error("Failed to push via LINE:", pushError);
      return NextResponse.json({ success: true, warning: "Saved but LINE push failed" }, { status: 200 });
    }

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("Reply error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
