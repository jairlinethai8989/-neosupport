'use server'

import { supabaseAdmin } from "@/lib/supabase"
import { logger } from "@/lib/logger"

export async function registerCustomer(data: {
  line_uid: string;
  display_name: string;
  hospital_id: string;
  department: string;
}) {
  try {
    logger.info(`Registering customer: ${data.line_uid} (${data.display_name})`)

    const { error } = await supabaseAdmin
      .from("users")
      .insert({
        line_uid: data.line_uid,
        display_name: data.display_name || "LINE User",
        hospital_id: data.hospital_id,
        department: data.department,
        role: "Customer"
      })

    if (error) {
      logger.error("Registration Error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    logger.error("Registration Fatal Error:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}

export async function getHospitals() {
  try {
    const { data, error } = await supabaseAdmin
      .from("hospitals")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
       logger.error("Fetch Hospitals Error:", error);
       return [];
    }
    return data || [];
  } catch (error) {
    logger.error("Fetch Hospitals Fatal Error:", error);
    return [];
  }
}
