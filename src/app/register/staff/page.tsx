import { createClient } from "@/utils/supabase/server";
import StaffRegisterClient from "./StaffRegisterClient";

export const metadata = {
  title: "ลงทะเบียนพนักงานไอที - IT Support",
  description: "กรอกข้อมูลเพื่อขอสิทธิ์เข้าใช้งานระบบไอที",
};

export default async function StaffRegisterPage() {
  const supabase = await createClient();

  // Fetch hospitals for selection
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name")
    .order("name");

  return <StaffRegisterClient hospitals={hospitals || []} />;
}
