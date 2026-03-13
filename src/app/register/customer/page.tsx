"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function RegistrationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lineUid = searchParams?.get("uid");
  
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [department, setDepartment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // 1. Fetch Hospitals
      const { data: hospData } = await supabase
        .from("hospitals")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (hospData) setHospitals(hospData);

      // 2. Fetch Display Name from LINE if possible (Optional helper)
      // For now, we'll let them confirm their name
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUid || !selectedHospital || !department) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("users").insert({
      line_uid: lineUid,
      display_name: displayName || "LINE User",
      hospital_id: selectedHospital,
      department: department,
      role: "Customer"
    });

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        // Redirect to a landing page or close window
        window.location.href = "https://line.me/R/ti/p/@your_id"; // Change to your LINE OA ID
      }, 3000);
    }
  };

  if (!lineUid) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2 style={{ color: "var(--status-escalated-text)" }}>❌ ลิงก์ไม่ถูกต้อง</h2>
        <p>กรุณาทักแชท LINE OA เพื่อรับลิงก์ลงทะเบียนใหม่นะคะ/ครับ</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", animation: "fade-in 0.5s" }}>
        <h1 style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</h1>
        <h2 style={{ color: "var(--status-done-text)" }}>ลงทะเบียนสำเร็จ!</h2>
        <p>ตอนนี้คุณสามารถเริ่มแจ้งปัญหาผ่าน LINE ได้ทันทีค่ะ/ครับ</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2rem" }}>กำลังพาวนกลับไปยัง LINE...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "450px", padding: "2rem", backgroundColor: "var(--bg-surface)", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", border: "1px solid var(--border-color)" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" style={{ width: "50px", marginBottom: "1rem" }} />
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-heading)" }}>ลงทะเบียนผู้แจ้งซ่อม</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>ผูกบัญชี LINE กับหน่วยงานของคุณ</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-main)" }}>ระบุชื่อของคุณ (สำหรับให้เจ้าหน้าที่เรียก)</label>
          <input 
            type="text" 
            required 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            placeholder="เช่น คุณสมศักดิ์"
            style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-heading)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-main)" }}>เลือกโรงพยาบาลของคุณ</label>
          <select 
            required 
            value={selectedHospital} 
            onChange={(e) => setSelectedHospital(e.target.value)}
            style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-heading)", cursor: "pointer" }}
          >
            <option value="">-- กรุณาเลือก --</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-main)" }}>แผนก / หน่วยงาน</label>
          <input 
            type="text" 
            required 
            value={department} 
            onChange={(e) => setDepartment(e.target.value)} 
            placeholder="เช่น งานการเงิน, ห้องแล็บ"
            style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-heading)" }}
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting || loading}
          className="btn-primary"
          style={{ padding: "1rem", borderRadius: "12px", fontSize: "1rem", fontWeight: "bold", marginTop: "1rem" }}
        >
          {submitting ? "กำลังบันทึก..." : "ลงทะเบียนยืนยันตัวตน"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
        ID: <code style={{ color: "var(--primary)" }}>{lineUid}</code>
      </div>
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)", padding: "1rem" }}>
      <Suspense fallback={<div style={{ color: "var(--text-muted)" }}>กำลังโหลด...</div>}>
        <RegistrationForm />
      </Suspense>
    </div>
  );
}
