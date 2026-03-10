"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, UserX, Clock, Building2, ShieldCheck, Mail, RefreshCw } from "lucide-react";

export default function StaffApprovalsClient({ 
  initialPending, 
  initialActive,
  userEmail 
}: { 
  initialPending: any[], 
  initialActive: any[],
  userEmail?: string 
}) {
  const [pending, setPending] = useState(initialPending);
  const [active, setActive] = useState(initialActive);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/admin/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status: action })
      });

      if (!res.ok) throw new Error("Action failed");

      // Update UI
      if (action === 'approved') {
        const approvedUser = pending.find(u => u.id === id);
        if (approvedUser) {
          setActive(prev => [{ ...approvedUser, status: 'approved', is_staff: true }, ...prev]);
        }
      }
      setPending(prev => prev.filter(u => u.id !== id));
      if (action === 'rejected') {
        setActive(prev => prev.filter(u => u.id !== id));
      }

    } catch (error) {
      alert("เกิดข้อผิดพลาดในการดำเนินการ");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="dashboard-container dark" style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      {/* Top Bar */}
      <div style={{
        height: "60px", background: "var(--bg-glass)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", 
        padding: "0 2rem", gap: "1rem", position: "sticky", top: 0, zIndex: 100
      }}>
        <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={18} /> Settings
        </Link>
        <span style={{ color: "var(--text-heading)", fontWeight: 700 }}>👥 Staff Approvals</span>
      </div>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Pending Requests */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.25rem", marginBottom: "1.5rem", color: "#f59e0b" }}>
            <Clock size={22} /> รอการอนุมัติ ({pending.length})
          </h2>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            {pending.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", background: "var(--bg-surface)", borderRadius: "16px", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>
                ไม่มีพนักงานรอการอนุมัติในขณะนี้
              </div>
            ) : (
              pending.map(user => (
                <div key={user.id} style={{ 
                  background: "var(--bg-surface)", padding: "1.25rem", borderRadius: "16px", 
                  border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" 
                }}>
                  <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                    {user.line_picture_url ? (
                      <img src={user.line_picture_url} alt="" style={{ width: "50px", height: "50px", borderRadius: "50%", border: "2px solid var(--primary)" }} />
                    ) : (
                      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "var(--bg-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <UserCheck size={24} color="var(--text-muted)" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-heading)" }}>{user.full_name || user.display_name}</div>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Building2 size={14} /> {user.hospitals?.name || 'ไม่ระบุ'}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><ShieldCheck size={14} /> {user.department || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button 
                      onClick={() => handleAction(user.id, 'approved')}
                      disabled={processingId === user.id}
                      style={{ background: "#10b981", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      {processingId === user.id ? <RefreshCw size={16} className="spin" /> : <UserCheck size={16} />} อนุมัติ
                    </button>
                    <button 
                      onClick={() => handleAction(user.id, 'rejected')}
                      disabled={processingId === user.id}
                      style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid #ef4444", padding: "0.6rem 1.25rem", borderRadius: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Active Staff */}
        <section>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.25rem", marginBottom: "1.5rem", color: "var(--primary)" }}>
            <UserCheck size={22} /> รายชื่อพนักงานในระบบ ({active.length})
          </h2>
          <div style={{ background: "var(--bg-surface)", borderRadius: "20px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "1rem 1.5rem" }}>ชื่อพนักงาน</th>
                  <th style={{ padding: "1rem" }}>ข้อมูลระบบ</th>
                  <th style={{ padding: "1rem" }}>สถานะ</th>
                  <th style={{ padding: "1rem 1.5rem", textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {active.map(user => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-color)", overflow: "hidden" }}>
                          {user.line_picture_url ? <img src={user.line_picture_url} style={{ width: "100%" }} /> : <UserCheck size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.full_name || user.display_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>@{user.line_uid?.slice(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontSize: "0.85rem" }}>{user.hospitals?.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user.department}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
                        background: user.status === 'approved' ? "rgba(16,185,129,0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: user.status === 'approved' ? "#10b981" : "#ef4444"
                      }}>
                        {user.status === 'approved' ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <button 
                        onClick={() => handleAction(user.id, user.status === 'approved' ? 'rejected' : 'approved')}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      >
                        {user.status === 'approved' ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
