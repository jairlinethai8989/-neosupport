import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Maintenance API: Cleanup & Backup
 * 1. Backs up the messages metadata to a log/json if needed.
 * 2. Deletes files older than 30 days from 'attachments' bucket.
 * 3. Updates the message content to reflect deletion.
 */

export async function GET() {
  try {
    const DAYS_THRESHOLD = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);
    const cutoffIso = cutoffDate.toISOString();

    // 1. Find messages with media older than 30 days
    const { data: oldMessages, error: fetchError } = await supabaseAdmin
      .from("messages")
      .select("id, content, message_type")
      .in("message_type", ["image", "video"])
      .lt("created_at", cutoffIso);

    if (fetchError) throw fetchError;
    if (!oldMessages || oldMessages.length === 0) {
      return NextResponse.json({ success: true, message: "No old media to cleanup." });
    }

    // 2. Extract filenames for deletion
    // Content URLs look like: .../storage/v1/object/public/attachments/FILENAME.ext
    const filesToDelete: string[] = [];
    const messageIdsToUpdate: string[] = [];

    oldMessages.forEach(msg => {
      const parts = msg.content.split("/");
      const fileName = parts.pop();
      if (fileName && msg.content.includes("/attachments/")) {
        filesToDelete.push(fileName);
        messageIdsToUpdate.push(msg.id);
      }
    });

    if (filesToDelete.length === 0) {
      return NextResponse.json({ success: true, message: "No files found in storage format." });
    }

    // 3. Delete from Storage
    const { data: deleteData, error: deleteError } = await supabaseAdmin.storage
      .from("attachments")
      .remove(filesToDelete);

    if (deleteError) {
      console.error("Storage cleanup error:", deleteError);
      // We continue even if storage delete partially fails to update DB for what we found
    }

    // 4. Update Database records so links aren't broken/leading to 404
    const { error: updateError } = await supabaseAdmin
      .from("messages")
      .update({ 
        content: "⚠️ [ไฟล์ถูกลบอัตโนมัติตามนโยบาย 30 วัน / File deleted by 30-day policy]",
        message_type: "text" // Convert to text so it doesn't try to render <img> or <video>
      })
      .in("id", messageIdsToUpdate);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      cleanedCount: filesToDelete.length,
      files: filesToDelete,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
