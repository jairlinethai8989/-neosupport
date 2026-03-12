"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Hospital, Plus, Search, Edit2, Trash2 } from "lucide-react";

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", abbreviation: "" });

  const supabase = createClient();

  useEffect(() => {
    fetchHospitals();
  }, []);

  async function fetchHospitals() {
    const { data } = await supabase.from("hospitals").select("*").order("name");
    if (data) setHospitals(data);
  }

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from("hospitals")
      .update(editForm)
      .eq("id", id);
    
    if (!error) {
      setIsEditing(null);
      fetchHospitals();
    }
  };

  const filtered = hospitals.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.abbreviation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Hospital color="var(--primary)" /> จัดการข้อมูลโรงพยาบาล
          </h1>
          <p style={{ color: "var(--text-muted)" }}>จัดการรายชื่อโรงพยาบาลทั้ง {hospitals.length} แห่งในระบบ</p>
        </div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={18} /> เพิ่มโรงพยาบาล
        </button>
      </header>

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
                      <button onClick={() => handleUpdate(h.id)} style={{ color: "var(--status-done-text)", background: "none", border: "none", cursor: "pointer" }}>บันทึก</button>
                      <button onClick={() => setIsEditing(null)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>ยกเลิก</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsEditing(h.id);
                        setEditForm({ name: h.name, abbreviation: h.abbreviation });
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      <Edit2 size={16} />
                    </button>
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
