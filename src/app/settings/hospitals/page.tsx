"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Hospital, Plus, Search, Edit2, Trash2, X, Save } from "lucide-react";

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", abbreviation: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [newHospital, setNewHospital] = useState({ name: "", abbreviation: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHospitals = useCallback(async () => {
    const { data } = await supabase.from("hospitals").select("*").order("name");
    if (data) setHospitals(data);
  }, [supabase]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const handleUpdate = async (id: string) => {
    setIsProcessing(true);
    const { error } = await supabase
      .from("hospitals")
      .update(editForm)
      .eq("id", id);

    if (!error) {
      showToast("อัปเดตโรงพยาบาลสำเร็จ", "success");
      setIsEditing(null);
      fetchHospitals();
    } else {
      showToast("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, "error");
    }
    setIsProcessing(false);
  };

  const handleAdd = async () => {
    if (!newHospital.name.trim() || !newHospital.abbreviation.trim()) {
      showToast("กรุณากรอกชื่อโรงพยาบาลและตัวย่อ", "error");
      return;
    }

    setIsProcessing(true);
    const { error } = await supabase
      .from("hospitals")
      .insert({
        name: newHospital.name.trim(),
        abbreviation: newHospital.abbreviation.trim()
      });

    if (!error) {
      showToast("เพิ่มโรงพยาบาลสำเร็จ", "success");
      setIsAdding(false);
      setNewHospital({ name: "", abbreviation: "" });
      fetchHospitals();
    } else {
      showToast("เกิดข้อผิดพลาดในการเพิ่ม: " + error.message, "error");
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบ "${name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    setIsProcessing(true);
    const { error } = await supabase
      .from("hospitals")
      .delete()
      .eq("id", id);

    if (!error) {
      showToast("ลบโรงพยาบาลสำเร็จ", "success");
      fetchHospitals();
    } else {
      showToast("เกิดข้อผิดพลาดในการลบ: " + error.message, "error");
    }
    setIsProcessing(false);
  };

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.abbreviation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            background: toast.type === "success" ? "var(--status-done-bg)" : "var(--status-escalated-bg)",
            border: `1px solid ${toast.type === "success" ? "var(--status-done-text)" : "var(--status-escalated-text)"}`,
            color: toast.type === "success" ? "var(--status-done-text)" : "var(--status-escalated-text)",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 1000,
            animation: "slide-in 0.3s ease-out"
          }}
        >
          {toast.message}
        </div>
      )}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Hospital color="var(--primary)" /> จัดการข้อมูลโรงพยาบาล
          </h1>
          <p style={{ color: "var(--text-muted)" }}>จัดการรายชื่อโรงพยาบาลทั้ง {hospitals.length} แห่งในระบบ</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={18} /> เพิ่มโรงพยาบาล
        </button>
      </header>

      {/* Add Hospital Modal */}
      {isAdding && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999
          }}
          onClick={() => setIsAdding(false)}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "20px",
              padding: "2rem",
              width: "100%",
              maxWidth: "450px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-heading)" }}>เพิ่มโรงพยาบาลใหม่</h2>
              <button
                onClick={() => setIsAdding(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                  ชื่อโรงพยาบาล *
                </label>
                <input
                  type="text"
                  value={newHospital.name}
                  onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                  placeholder="เช่น โรงพยาบาลศิริราช"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-color)",
                    color: "var(--text-heading)",
                    fontSize: "1rem"
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                  ตัวย่อ (Ticket Prefix) *
                </label>
                <input
                  type="text"
                  value={newHospital.abbreviation}
                  onChange={(e) => setNewHospital({ ...newHospital, abbreviation: e.target.value.toUpperCase() })}
                  placeholder="เช่น SIRI"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-color)",
                    color: "var(--text-heading)",
                    fontSize: "1rem",
                    textTransform: "uppercase"
                  }}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  ใช้เป็นคำนำหน้าหมายเลขใบงาน (เช่น SIRI-001)
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  onClick={() => setIsAdding(false)}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-color)",
                    color: "var(--text-heading)",
                    fontWeight: 600,
                    cursor: isProcessing ? "not-allowed" : "pointer"
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: isProcessing ? "not-allowed" : "pointer"
                  }}
                >
                  {isProcessing ? (
                    <div className="spinner-mini" />
                  ) : (
                    <>
                      <Save size={16} /> บันทึก
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={18} />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อโรงพยาบาล หรือตัวย่อ..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "0.8rem 1rem 0.8rem 3rem", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-heading)" }}
        />
      </div>

      <div className="table-container" style={{ background: "var(--bg-surface)", borderRadius: "16px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--bg-color)" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "1rem" }}>ชื่อโรงพยาบาล</th>
              <th style={{ textAlign: "left", padding: "1rem" }}>ตัวย่อ (Ticket Prefix)</th>
              <th style={{ textAlign: "center", padding: "1rem" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "1rem" }}>
                  {isEditing === h.id ? (
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      style={{ padding: "0.4rem", width: "100%" }}
                    />
                  ) : h.name}
                </td>
                <td style={{ padding: "1rem" }}>
                  {isEditing === h.id ? (
                    <input
                      value={editForm.abbreviation}
                      onChange={e => setEditForm({...editForm, abbreviation: e.target.value})}
                      style={{ padding: "0.4rem", width: "100px" }}
                    />
                  ) : <code style={{ color: "var(--primary)" }}>{h.abbreviation}</code>}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  {isEditing === h.id ? (
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      <button
                        onClick={() => handleUpdate(h.id)}
                        disabled={isProcessing}
                        style={{ color: "var(--status-done-text)", background: "none", border: "none", cursor: isProcessing ? "not-allowed" : "pointer" }}
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setIsEditing(null)}
                        disabled={isProcessing}
                        style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: isProcessing ? "not-allowed" : "pointer" }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      <button
                        onClick={() => {
                          setIsEditing(h.id);
                          setEditForm({ name: h.name, abbreviation: h.abbreviation });
                        }}
                        disabled={isProcessing}
                        style={{ background: "none", border: "none", cursor: isProcessing ? "not-allowed" : "pointer", color: "var(--text-muted)" }}
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id, h.name)}
                        disabled={isProcessing}
                        style={{ background: "none", border: "none", cursor: isProcessing ? "not-allowed" : "pointer", color: "var(--status-escalated-text)" }}
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
