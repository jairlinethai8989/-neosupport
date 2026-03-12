"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function StaffRegForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lineUid = searchParams?.get("uid");
  const initialName = searchParams?.get("name") || "";
  
  const [displayName, setDisplayName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUid) return;

    setSubmitting(true);
    const supabase = createClient();

    // Staff are registered with status 'pending' and hospital_id of a dummy/master record if needed
    // or we can let it be null and Admin assigns hospital later.
    const { error } = await supabase.from("users").insert({
      line_uid: lineUid,
      display_name: displayName,
      role: "Staff",
      status: "pending" // Admin must approve before they can login
    });

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <h1 style={{ fontSize: "4rem" }}>⏳</h1>
        <h2 style={{ color: "var(--primary)" }}>ส่งคำขอลงทะเบียนแล้ว</h2>
        <p>กรุณารอ Admin อนุมัติสิทธิ์เข้าใช้งานแดชบอร์ดครับ</p>
        <button onClick={() => router.push("/login")} className="btn-secondary" style={{ marginTop: "2rem" }}>กลับไปหน้า Login</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "400px", padding: "2rem", backgroundColor: "var(--bg-surface)", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>ลงทะเบียนเจ้าหน้าที่ IT</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>ชื่อ-นามสกุล (เจ้าหน้าที่)</label>
          <input 
            type="text" 
            required 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-heading)" }}
          />
        </div>
        <div style={{ padding: "1rem", backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: "10px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          LINE ID: <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{lineUid}</span>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: "1rem", fontWeight: "bold" }}>
          {submitting ? "กำลังส่งข้อมูล..." : "ขอสิทธิ์เข้าใช้งาน"}
        </button>
      </form>
    </div>
  );
}

export default function StaffRegistrationPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)" }}>
      <Suspense fallback={<div>Loading...</div>}>
        <StaffRegForm />
      </Suspense>
    </div>
  );
}
