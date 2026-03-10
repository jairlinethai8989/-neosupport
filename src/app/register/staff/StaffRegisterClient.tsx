"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Building2, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";

function RegisterForm({ hospitals }: { hospitals: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const lineUid = searchParams.get("uid");
  const lineName = searchParams.get("name") || "";
  const linePic = searchParams.get("pic") || "";

  const [form, setForm] = useState({
    fullName: lineName,
    hospitalId: "",
    department: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUid) return alert("ไม่พบข้อมูล LINE ID");
    
    setLoading(true);
    try {
      const res = await fetch("/api/register/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUid,
          displayName: lineName,
          pictureUrl: linePic,
          fullName: form.fullName,
          hospitalId: form.hospitalId,
          department: form.department
        })
      });

      if (!res.ok) throw new Error("Registration failed");
      setSuccess(true);
    } catch (err) {
      alert("การลงทะเบียนผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle2 size={48} />
        </div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>ส่งคำขอเรียบร้อยแล้ว!</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "2rem" }}>
          ข้อมูลของคุณถูกส่งไปยังผู้ดูแลระบบเพื่ออนุมัติสิทธิ์แล้ว<br />
          คุณจะได้รับแจ้งเตือนผ่าน LINE เมื่อสิทธิ์ของคุณได้รับการอนุมัติ
        </p>
        <button onClick={() => router.push("/login")} className="btn-secondary" style={{ padding: "0.75rem 2rem" }}>
          กลับไปที่หน้า Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "500px", padding: "2.5rem", background: "var(--bg-surface)", borderRadius: "24px", border: "1px solid var(--border-color)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        {linePic ? (
          <img src={linePic} style={{ width: "80px", height: "80px", borderRadius: "50%", border: "3px solid var(--primary)", marginBottom: "1rem" }} alt="LINE Profile" />
        ) : (
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--bg-color)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <User size={40} color="var(--primary)" />
          </div>
        )}
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 800 }}>ลงทะเบียนพนักงานใหม่</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>สวัสดีคุณ <b>{lineName}</b> กรุณาแจ้งข้อมูลเพื่อยืนยันตัวตน</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
             <User size={16} /> ชื่อ-นามสกุล จริง
          </label>
          <input 
            required
            value={form.fullName}
            onChange={e => setForm({...form, fullName: e.target.value})}
            style={{ width: "100%", padding: "0.85rem 1.1rem", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "white", outline: "none" }}
            placeholder="โปรดระบุชื่อ-นามสกุลภาษาไทย"
          />
        </div>

        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
             <Building2 size={16} /> สังกัดโรงพยาบาล
          </label>
          <select 
            required
            value={form.hospitalId}
            onChange={e => setForm({...form, hospitalId: e.target.value})}
            style={{ width: "100%", padding: "0.85rem 1.1rem", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "white", outline: "none" }}
          >
            <option value="">เลือกโรงพยาบาลที่สังกัด</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
             <ShieldCheck size={16} /> แผนก / ตำแหน่ง
          </label>
          <input 
            required
            value={form.department}
            onChange={e => setForm({...form, department: e.target.value})}
            style={{ width: "100%", padding: "0.85rem 1.1rem", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "white", outline: "none" }}
            placeholder="เช่น ฝ่ายไอที / Programmer"
          />
        </div>

        <button 
          disabled={loading}
          className="btn-primary" 
          style={{ marginTop: "1rem", padding: "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
        >
          {loading ? <RefreshCw size={20} className="spin" /> : "ส่งข้อมูลสมัครสมาชิก"}
        </button>
      </form>
    </div>
  );
}

export default function StaffRegisterClient({ hospitals }: { hospitals: any[] }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-color)", display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
      <Suspense fallback={<div>กำลังโหลด...</div>}>
        <RegisterForm hospitals={hospitals} />
      </Suspense>
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
