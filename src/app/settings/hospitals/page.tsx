import { createClient } from "@/utils/supabase/server";
import HospitalsClient from "./HospitalsClient";
import { redirect } from "next/navigation";

export default async function HospitalsConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, abbreviation, ticket_prefix, ticket_padding, ticket_format_mode")
    .order("name");

  const displayUser = user?.email?.replace("@neosupport.local", "") || user?.email;

  return <HospitalsClient initialHospitals={hospitals || []} userEmail={displayUser} />;
}
