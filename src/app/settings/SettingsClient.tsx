"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Search, RefreshCw, CheckCircle2,
  Sun, Moon, Package, Tag, Wrench, MessageSquare, Building2, Database, Download, HardDrive, ShieldAlert, Shield
} from "lucide-react";

// ─── Sidebar Menu Config ─────────────────────────────────────
const MENU_ITEMS = [
  { key: "modules",          icon: Package,       label: "โมดูล / ระบบ",              sub: "Module Options" },
  { key: "issue_types",      icon: Tag,           label: "ประเภทงาน",                  sub: "Ticket Types" },
  { key: "resolution_notes", icon: Wrench,        label: "วิธีแก้ไขสำเร็จรูป",       sub: "Quick Resolutions" },
  { key: "quick_replies",    icon: MessageSquare, label: "ข้อความตอบกลับสำเร็จรูป",  sub: "Quick Replies" },
  { key: "policy",           icon: Shield,        label: "นโยบายระบบ",               sub: "System Policies" },
  { key: "maintenance",      icon: Database,      label: "ดูแลระบบ / พื้นที่",      sub: "System Maintenance" },
  { key: "audit_logs",       icon: ShieldAlert,   label: "ประวัติการ Cleanup",      sub: "Audit Logs", href: "/settings/audit-logs" },
  { key: "hospitals",        icon: Building2,     label: "โรงพยาบาล",                sub: "Hospital Config" },
];

const PLACEHOLDERS: Record<string, string> = {
  modules:          "เช่น ห้องพยาบาล, ห้องบัตร, Network/Infra...",
  issue_types:      "เช่น PB, Bug, แนะนำ, Q&A...",
  resolution_notes: "เช่น แนะนำการใช้งาน, ตั้งค่าใหม่...",
  quick_replies:    "เช่น รับเรื่องแล้วครับ กำลังตรวจสอบ...",
};

// ─── Inline Editable List ────────────────────────────────────
function ArrayEditor({
  list,
  onUpdate,
  placeholder,
  accentColor = "var(--primary)",
}: {
  list: string[];
  onUpdate: (updated: string[]) => void;
  placeholder?: string;
  accentColor?: string;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal]       = useState("");
  const [newItem, setNewItem]       = useState("");

  const add = () => {
    if (!newItem.trim()) return;
    onUpdate([...list, newItem.trim()]);
    setNewItem("");
  };

  const remove = (idx: number) => onUpdate(list.filter((_, i) => i !== idx));

  const startEdit = (idx: number) => { setEditingIdx(idx); setEditVal(list[idx]); };
  const commitEdit = (idx: number) => {
    if (editVal.trim()) onUpdate(list.map((item, i) => i === idx ? editVal.trim() : item));
    setEditingIdx(null);
  };

  return (
    <div>
      {/* Add row */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder={placeholder || "เพิ่มรายการ..."}
          style={{
            flex: 1, padding: "0.75rem 1.1rem", borderRadius: "12px",
            border: "1px solid var(--border-color)", background: "var(--bg-color)",
            color: "var(--text-main)", fontSize: "0.95rem", outline: "none",
          }}
        />
        <button
          onClick={add}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.75rem 1.25rem", borderRadius: "12px", fontWeight: 600 }}
        >
          <Plus size={16} /> เพิ่ม
        </button>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {list.length === 0 && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.9rem", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
            ยังไม่มีรายการ — กดเพิ่มด้านบน
          </div>
        )}
        {list.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 0.9rem", background: "var(--bg-color)",
              borderRadius: "10px", border: "1px solid var(--border-color)",
              transition: "border-color 0.15s",
            }}
          >
            {editingIdx === idx ? (
              <>
                <input
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit(idx);
                    if (e.key === "Escape") setEditingIdx(null);
                  }}
                  autoFocus
                  style={{
                    flex: 1, padding: "0.3rem 0.75rem", borderRadius: "8px",
                    border: `1px solid ${accentColor}`, background: "var(--bg-surface)",
                    color: "var(--text-heading)", fontSize: "0.95rem", outline: "none",
                  }}
                />
                <button onClick={() => commitEdit(idx)} title="บันทึก" style={{ color: "#10b981", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
                  <Check size={18} />
                </button>
                <button onClick={() => setEditingIdx(null)} title="ยกเลิก" style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: "0.95rem", color: "var(--text-main)" }}>{item}</span>
                <button onClick={() => startEdit(idx)} title="แก้ไข" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", opacity: 0.7 }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(idx)} title="ลบ" style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", opacity: 0.7 }}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings Component ─────────────────────────────────
export default function SettingsClient({
  initialSettings,
  initialHospitals = [],
  userEmail,
}: {
  initialSettings: any;
  initialHospitals?: any[];
  userEmail?: string;
}) {
  const [theme, setTheme] = useState(
    typeof window !== "undefined" ? localStorage.getItem("theme") || "dark" : "dark"
  );
  const [activeMenu, setActiveMenu] = useState("modules");
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [data, setData] = useState<Record<string, any>>({
    modules:          initialSettings.modules          || [],
    issue_types:      initialSettings.issue_types      || [],
    resolution_notes: initialSettings.resolution_notes || [],
    quick_replies:    initialSettings.quick_replies    || [],
    cleanup_policy:   initialSettings.cleanup_policy   || { days: 30, enabled: true },
    upload_limits:    initialSettings.upload_limits    || { max_video_size_mb: 10, max_image_size_mb: 5 },
    sla_policy:       initialSettings.sla_policy       || { Critical: 1, High: 4, Medium: 8, Low: 24 },
  });

  // Hospitals specific states
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [loadingHospitalId, setLoadingHospitalId] = useState<string | null>(null);
  const [successHospitalId, setSuccessHospitalId] = useState<string | null>(null);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
      h.abbreviation.toLowerCase().includes(hospitalSearch.toLowerCase())
    );
  }, [hospitals, hospitalSearch]);

  const handleHospitalUpdate = async (id: string, updates: any) => {
    setLoadingHospitalId(id);
    try {
      const res = await fetch("/api/admin/hospitals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates })
      });
      if (!res.ok) throw new Error();
      setSuccessHospitalId(id);
      setTimeout(() => setSuccessHospitalId(null), 2000);
      setHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    } catch {
      alert("ไม่สามารถบันทึกข้อมูลโรงพยาบาลได้");
    } finally {
      setLoadingHospitalId(null);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light-theme", next === "light");
    localStorage.setItem("theme", next);
  };

  const handleUpdate = async (key: string, updated: any) => {
    setData(prev => ({ ...prev, [key]: updated }));
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: updated }),
      });
      if (!res.ok) throw new Error();
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch {
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const activeItem = MENU_ITEMS.find(m => m.key === activeMenu)!;
  const ActiveIcon = activeItem.icon;

  return (
    <div className={`dashboard-container ${theme}`} style={{ height: "100vh", overflow: "hidden" }}>
      {/* ── Top Bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "60px",
        background: "var(--bg-glass)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex", alignItems: "center", padding: "0 2rem", gap: "1rem",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontWeight: 500, fontSize: "0.9rem" }}>
          <ArrowLeft size={18} /> Dashboard
        </Link>
        <span style={{ color: "var(--border-color)" }}>›</span>
        <span style={{ color: "var(--text-heading)", fontWeight: 700 }}>⚙️ System Settings</span>
        <div style={{ flex: 1 }} />
        {userEmail && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>👤 {userEmail}</span>
        )}
        <button onClick={toggleTheme} className="btn-secondary" style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.4rem 0.9rem", borderRadius: "10px", fontSize: "0.85rem" }}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", height: "100vh", paddingTop: "60px" }}>

        {/* ── LEFT Sidebar ── */}
        <aside style={{
          width: "260px", flexShrink: 0,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-color)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
          padding: "1.5rem 0.75rem",
          gap: "0.25rem",
        }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", padding: "0 0.75rem", marginBottom: "0.75rem" }}>
            การตั้งค่า
          </p>

          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.key;
            const content = (
              <>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
                  background: isActive ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={17} />
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>{item.sub}</div>
                </div>
              </>
            );

            const commonStyles: React.CSSProperties = {
              display: "flex", alignItems: "center", gap: "0.85rem",
              padding: "0.8rem 1rem", borderRadius: "12px",
              background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
              border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              color: isActive ? "var(--primary)" : "var(--text-main)",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "all 0.15s ease",
              fontWeight: isActive ? 700 : 400,
              textDecoration: "none"
            };

            if ('href' in item && item.href) {
              return (
                <Link key={item.key} href={item.href} style={commonStyles}>
                  {content}
                </Link>
              );
            }

            return (
              <button key={item.key} onClick={() => setActiveMenu(item.key)} style={commonStyles}>
                {content}
              </button>
            );
          })}
        </aside>
        {/* ── RIGHT Content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "2.5rem 3rem" }}>

          {/* Section Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "14px",
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ActiveIcon size={22} color="var(--primary)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--text-heading)" }}>{activeItem.label}</h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {activeItem.sub} {activeMenu !== "maintenance" && activeMenu !== "hospitals" && `— ${data[activeMenu]?.length ?? 0} รายการ`}
                </p>
              </div>
            </div>

            {savedKey === activeMenu && activeMenu !== "maintenance" && activeMenu !== "hospitals" && (
              <div style={{ padding: "0.5rem 1rem", borderRadius: "10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
                <Check size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> บันทึกแล้ว
              </div>
            )}
          </div>

          <div style={{
            background: "var(--bg-surface)", borderRadius: "20px",
            border: "1px solid var(--border-color)", padding: "2rem",
          }}>
            {activeMenu === "maintenance" ? (
              <div key="maintenance">
                <div style={{ padding: "1.5rem", background: "rgba(99,102,241,0.05)", borderRadius: "15px", border: "1px solid rgba(99,102,241,0.2)", marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.1rem", color: "var(--primary)", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <HardDrive size={18} /> แผนบริหารพื้นที่ (Storage Policy)
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                    ระบบใช้ Supabase เวอรชั่นฟรี (1GB Storage) แนะนำให้สำรองข้อมูลและ Cleanup ทุกเดือน
                  </p>
                </div>

                <div style={{ display: "grid", gap: "1.25rem" }}>
                  <div style={{ padding: "1.25rem", borderRadius: "15px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, margin: 0 }}>💾 Backup ข้อมูล</h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>ดาวน์โหลด Tickets/Messages เป็น JSON</p>
                    </div>
                    <a href="/api/maintenance/backup" target="_blank" className="btn-secondary" style={{ textDecoration: "none", color: "var(--primary)", padding: "0.6rem 1rem", borderRadius: "10px", border: "1px solid var(--primary)", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <Download size={16} /> Download
                    </a>
                  </div>

                  <div style={{ padding: "1.25rem", borderRadius: "15px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, margin: 0, color: "#ef4444" }}>🧹 สั่ง Cleanup (30 วัน)</h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>ลบไฟล์ภาพ/วิดีโอที่มีอายุเกิน 30 วัน</p>
                    </div>
                    <button 
                      onClick={async () => {
                         if (!confirm("ลบไฟล์ที่เก่ากว่า 30 วันทั้งหมด?")) return;
                         setSaving(true);
                         try {
                           const res = await fetch("/api/admin/cleanup", { method: "POST" });
                           const out = await res.json();
                           alert(out.success ? `Cleanup สำเร็จ: ลบแล้ว ${out.cleanedCount} รายการ` : "ล้มเหลว");
                         } catch { alert("Error"); }
                         finally { setSaving(false); }
                      }}
                      className="btn-primary" 
                      style={{ background: "#ef4444", padding: "0.6rem 1rem", borderRadius: "10px", fontSize: "0.85rem", border: "none", color: "white", cursor: "pointer" }}
                    >
                      {saving ? "..." : "ล้างไฟล์"}
                    </button>
                  </div>
                </div>
              </div>
            ) : activeMenu === "hospitals" ? (
              <div key="hospitals">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>📝 แก้ไขวิธีรันเลขเอกสาร</h3>
                      <div style={{ position: "relative", width: "260px" }}>
                          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                          <input 
                              style={{ width: "100%", padding: "0.6rem 1rem 0.6rem 2.5rem", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                              placeholder="ค้นหาโรงพยาบาล..." 
                              value={hospitalSearch}
                              onChange={(e) => setHospitalSearch(e.target.value)}
                          />
                      </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {filteredHospitals.map((h) => (
                      <HospitalRow 
                        key={h.id} 
                        hospital={h} 
                        onUpdate={handleHospitalUpdate} 
                        isLoading={loadingHospitalId === h.id}
                        isSuccess={successHospitalId === h.id}
                      />
                    ))}
                    {filteredHospitals.length === 0 && (
                      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        ไม่พบข้อมูลโรงพยาบาล
                      </div>
                    )}
                  </div>
              </div>
            ) : activeMenu === "policy" ? (
              <div key="policy" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div style={{ padding: "1.5rem", borderRadius: "15px", border: "1px solid var(--border-color)", background: "var(--bg-color)" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>⏳ ตั้งค่าระยะเวลาบริการ (SLA - ชั่วโมง)</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {Object.entries(data.sla_policy || {}).map(([prio, hours]) => (
                      <div key={prio} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className={`prio-badge prio-${prio.toLowerCase()}`}>{prio}</span>
                          </div>
                        </div>
                        <input 
                          type="number" 
                          value={hours as number} 
                          onChange={(e) => handleUpdate("sla_policy", { ...data.sla_policy, [prio]: parseInt(e.target.value) || 0 })}
                          style={{ width: "80px", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center", background: "var(--bg-surface)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "1.5rem", borderRadius: "15px", border: "1px solid var(--border-color)", background: "var(--bg-color)" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>🗓️ นโยบายพื้นที่เก็บข้อมูล (Cleanup)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>อายุของข้อมูลที่อนุญาต (วัน)</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ไฟล์ที่เก่ากว่าจำนวนวันที่ระบุจะถูกลบโดยอัตโนมัติ</div>
                      </div>
                      <input 
                        type="number" 
                        value={data.cleanup_policy.days} 
                        onChange={(e) => handleUpdate("cleanup_policy", { ...data.cleanup_policy, days: parseInt(e.target.value) })}
                        style={{ width: "100px", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: "1.5rem", borderRadius: "15px", border: "1px solid var(--border-color)", background: "var(--bg-color)" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>📤 ขีดจำกัดการอัปโหลดไฟล์</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>ขนาดวิดีโอสูงสุด (MB)</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>จำกัดขนาดวิดีโอที่เจ้าหน้าที่ส่งในแชท</div>
                      </div>
                      <input 
                        type="number" 
                        value={data.upload_limits.max_video_size_mb} 
                        onChange={(e) => handleUpdate("upload_limits", { ...data.upload_limits, max_video_size_mb: parseInt(e.target.value) })}
                        style={{ width: "100px", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>ขนาดรูปภาพสูงสุด (MB)</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ขนาดรูปภาพที่เหมาะสมคือไม่เกิน 5MB</div>
                      </div>
                      <input 
                        type="number" 
                        value={data.upload_limits.max_image_size_mb} 
                        onChange={(e) => handleUpdate("upload_limits", { ...data.upload_limits, max_image_size_mb: parseInt(e.target.value) })}
                        style={{ width: "100px", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ArrayEditor
                list={data[activeMenu] ?? []}
                onUpdate={updated => handleUpdate(activeMenu, updated)}
                placeholder={PLACEHOLDERS[activeMenu]}
              />
            )}
          </div>

          {activeMenu === "quick_replies" && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(99,102,241,0.05)", borderRadius: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              💬 ข้อความเหล่านี้จะแสดงเป็นปุ่มลัด ⚡ ในหน้าแชท
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function HospitalRow({ hospital, onUpdate, isLoading, isSuccess }: any) {
  const [nextNum, setNextNum] = useState("");
  const [prefix] = useState(hospital.ticket_prefix || "");

  return (
    <div style={{ 
      padding: "1rem 1.25rem", borderRadius: "15px", border: "1px solid var(--border-color)", 
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "var(--bg-color)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(99,102,241,0.1)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <Building2 size={20} />
          </div>
          <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{hospital.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{hospital.abbreviation}</div>
          </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input 
              type="text"
              placeholder="PREFIX_00000x"
              value={prefix || nextNum ? (prefix + (nextNum || "")) : ""}
              onChange={(e) => setNextNum(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ width: "200px", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
          />
          <button 
              onClick={() => onUpdate(hospital.id, { 
                  ticket_format_mode: 'default',
                  ...(nextNum ? { next_number: nextNum } : {})
              })}
              disabled={isLoading}
              style={{ 
                background: isSuccess ? "#10b981" : "var(--primary)", 
                color: "white", border: "none", padding: "0.5rem 1rem", 
                borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                transition: "all 0.2s"
              }}
          >
              {isLoading ? <RefreshCw size={14} className="spin" /> : isSuccess ? <CheckCircle2 size={14} /> : "ตั้งค่า"}
          </button>
      </div>
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
