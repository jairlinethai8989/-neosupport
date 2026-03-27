"use server";

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client (with service role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if a LINE user is already registered in our system
 */
export async function checkLiffRegistration(lineUid: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*, hospitals(name)")
      .eq("line_uid", lineUid)
      .single();

    if (error && error.code !== "PGRST116") { // Skip "no rows found" error
      console.error("Error checking registration:", error);
      return { success: false, isRegistered: false, error: error.message };
    }

    return { 
      success: true, 
      isRegistered: !!data, 
      user: data 
    };
  } catch (error: any) {
    return { success: false, isRegistered: false, error: error.message };
  }
}

/**
 * Fetch list of hospitals for registration
 */
export async function getLiffHospitals() {
  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Error fetching hospitals:", error);
    return [];
  }
  return data || [];
}

/**
 * Register a new LINE user
 */
export async function registerLiffUser(userData: {
  line_uid: string;
  display_name: string;
  hospital_id: string;
  department: string;
}) {
  try {
    // Check if user already exists
    const check = await checkLiffRegistration(userData.line_uid);
    if (check.success && check.isRegistered) {
      return { success: true, user: check.user };
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error("Error registering user:", error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new ticket from LIFF
 */
export async function createLiffTicket(ticketData: {
  reporter_id: string;
  hospital_id: string;
  description: string;
  issue_type: string;
  module?: string;
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .insert([{
        ...ticketData,
        source: 'LINE',
        status: 'Pending'
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      return { success: false, error: error.message };
    }

    return { success: true, ticket: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch ticket history for a specific user
 */
export async function getLiffTicketHistory(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select("*, hospitals(name)")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching history:", error);
    return [];
  }
  return data || [];
}

/**
 * Send a message from LIFF (Handled on server to bypass RLS)
 */
export async function sendLiffMessage(formData: FormData) {
  try {
    const ticketId = formData.get("ticketId") as string;
    const content = formData.get("content") as string;
    const messageType = (formData.get("messageType") as string) || "text";
    const file = formData.get("file") as File | null;

    if (!ticketId || (!content && !file)) {
      return { success: false, error: "Missing required fields" };
    }

    let finalContent = content;
    let finalMessageType = messageType;

    // 1. Handle File Upload if present
    if (file) {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("attachments")
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return { success: false, error: "Failed to upload file" };
      }

      const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(fileName);
      finalContent = data.publicUrl;
      
      if (file.type.startsWith("image/")) finalMessageType = "image";
      else if (file.type.startsWith("video/")) finalMessageType = "video";
      else finalMessageType = "file";
    }

    // 2. Insert into Database
    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        ticket_id: ticketId,
        content: finalContent,
        message_type: finalMessageType,
        direction: "inbound",
        status: "sent"
      })
      .select()
      .single();

    if (error) {
       console.error("Database insert error:", error);
       return { success: false, error: error.message };
    }

    return { success: true, message: data };
  } catch (error: any) {
    console.error("sendLiffMessage fatal error:", error);
    return { success: false, error: error.message };
  }
}
