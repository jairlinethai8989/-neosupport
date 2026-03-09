import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  try {
    // 1. Calculate the date 30 days ago
    const DAYS_THRESHOLD = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);
    const dateStr = cutoffDate.toISOString();

    console.log("🚀 Starting 30-day cleanup. Threshold date:", dateStr);

    // 2. Find messages with media older than cutoff
    // We fetch metadata from the database first so we can "Backup" (log) it.
    const { data: messagesToCleanup, error: fetchError } = await supabaseAdmin
      .from("messages")
      .select(`
        id, 
        content, 
        message_type, 
        ticket_id,
        tickets (ticket_no)
      `)
      .in("message_type", ["image", "video"])
      .lt("created_at", dateStr);

    if (fetchError) throw fetchError;

    if (!messagesToCleanup || messagesToCleanup.length === 0) {
      return NextResponse.json({ success: true, message: "No old media to cleanup today." });
    }

    const filesToDelete: string[] = [];
    const messageIdsToUpdate: string[] = [];
    const logData: any[] = [];

    messagesToCleanup.forEach(msg => {
      // Extract filename from URL: .../attachments/filename.ext
      const parts = msg.content.split("/");
      const fileName = parts.pop();
      if (fileName && msg.content.includes("/attachments/")) {
        filesToDelete.push(fileName);
        messageIdsToUpdate.push(msg.id);
        
        // Prepare metadata for "Backup" Log
        logData.push({
          message_id: msg.id,
          ticket_id: msg.ticket_id,
          file_name: fileName,
          public_url: msg.content,
          file_type: msg.message_type,
          metadata: { ticket_no: (msg.tickets as any)?.ticket_no }
        });
      }
    });

    if (filesToDelete.length === 0) {
      return NextResponse.json({ success: true, message: "No actual files found in storage format." });
    }

    // 3. BACKUP: Save metadata to cleanup_logs table
    const { error: logError } = await supabaseAdmin
      .from("cleanup_logs")
      .insert(logData);
    
    if (logError) {
      console.error("Backup log error (skipping deletion to be safe):", logError);
      throw new Error("Failed to log backup. Deletion aborted.");
    }

    // 4. DELETE from Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from("attachments")
      .remove(filesToDelete);

    if (deleteError) {
      console.warn("Storage removal error (some files might be missing):", deleteError);
    }

    // 5. UPDATE Database records (Mark as deleted)
    const { error: updateError } = await supabaseAdmin
      .from("messages")
      .update({ 
        content: "⚠️ [ไฟล์ถูกลบอัตโนมัติตามนโยบาย 30 วัน / File deleted by 30-day policy]",
        message_type: "text"
      })
      .in("id", messageIdsToUpdate);

    if (updateError) throw updateError;

    console.log(`✅ Successfully cleaned up and backed up ${filesToDelete.length} files.`);

    return NextResponse.json({ 
      success: true, 
      count: filesToDelete.length,
      files: filesToDelete 
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
