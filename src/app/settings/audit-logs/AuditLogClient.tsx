"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Trash2, FileText, Calendar, Database, 
  ShieldAlert, Activity, ChevronRight, Sun, Moon, Search, Filter, Info, Download, Trash
} from "lucide-react";

export default function AuditLogClient({ initialLogs }: { initialLogs: any[] }) {
  const [theme, setTheme] = useState(
    typeof window !== 'undefined' ? localStorage.getItem("theme") || "dark" : "dark"
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.body.classList.toggle("light-theme", newTheme === "light");
    localStorage.setItem("theme", newTheme);
  };

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesSearch = log.metadata?.ticket_no?.toLowerCase().includes(search.toLowerCase()) || 
                          log.public_url?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = typeFilter === "all" || log.file_type === typeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [initialLogs, search, typeFilter]);

  const stats = useMemo(() => {
    const images = initialLogs.filter(l => l.file_type === 'image').length;
    const videos = initialLogs.filter(l => l.file_type === 'video').length;
    return { images, videos, total: initialLogs.length };
  }, [initialLogs]);

  return (
    <div className={`dashboard-container ${theme}`} style={{ display: 'block', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <main className="main-content" style={{ marginLeft: 0, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        
        {/* Header Section */}
        <div className="header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/settings" className="btn-icon-modern" style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
               <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>Audit Logs & System History</h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>ประวัติการทำความสะอาดไฟล์ พื้นที่ และข้อมูลความปลอดภัยระบบ</p>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} style={{ width: '44px', height: '44px' }}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Info Banner */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ color: 'var(--primary)', flexShrink: 0 }}><Info size={24} /></div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            <strong>นโยบายการจัดเก็บ:</strong> ระบบจะทำการลบไฟล์ Media (ภาพและวิดีโอ) ที่มีการแจ้งงานเสร็จสิ้นเกิน 30 วันโดยอัตโนมัติ เพื่อประหยัดพื้นที่จัดเก็บข้อมูล (Storage Limit) แต่ยังคงรักษา Metadata ของใบงานไว้
          </p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-title">รวมไฟล์ที่ Cleanup</div>
              <div className="stat-icon-container" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Trash2 size={20} color="var(--primary)" />
              </div>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>30 วันล่าสุด</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-title">ไฟล์ภาพ (Images)</div>
              <div className="stat-icon-container" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <FileText size={20} color="var(--accent)" />
              </div>
            </div>
            <div className="stat-value">{stats.images}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cleanup Metadata Only</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-title">ไฟล์วิดีโอ (Videos)</div>
              <div className="stat-icon-container" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Activity size={20} color="#ef4444" />
              </div>
            </div>
            <div className="stat-value">{stats.videos}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>ลบถาวรจากพื้นที่จัดเก็บ</div>
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="ค้นหา Ticket No. หรือ URL ไฟล์..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select 
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.7rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">ทั้งหมด (All Types)</option>
              <option value="image">รูปภาพ (Images)</option>
              <option value="video">วิดีโอ (Videos)</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="table-container" style={{ borderRadius: '20px', border: '1px solid var(--border-color)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          <div style={{ overflowX: 'auto' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-muted)' }}>
                <Database size={56} style={{ opacity: 0.15, marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>ไม่บพบประวัติการ Cleanup</h3>
                <p>ยังไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหาของคุณ</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>วันเวลาที่ดำเนินการ</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>หมายเลขใบงาน</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ประเภทงาน</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>สถานะการลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="audit-row">
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar size={14} style={{ opacity: 0.5 }} />
                              {new Date(log.deleted_at).toLocaleDateString('th-TH')}
                            </div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, paddingLeft: '1.5rem' }}>
                              {new Date(log.deleted_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </div>
                         </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px', background: 'rgba(99,102,241,0.1)', padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                           {log.metadata?.ticket_no || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span className={`status-badge ${log.file_type === 'video' ? 'status-progress' : 'status-done'}`} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                           {log.file_type === 'video' ? '🎬 Video' : '🖼️ Image'}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.4rem', borderRadius: '50%' }}>
                              <Trash size={14} />
                            </div>
                            <div style={{ flex: 1, maxWidth: '240px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Deleted from Storage</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.public_url}
                              </div>
                            </div>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
      <style jsx>{`
        .audit-row:hover {
          background: rgba(255,255,255,0.015);
        }
        :global(.light-theme) .audit-row:hover {
          background: rgba(0,0,0,0.015);
        }
      `}</style>
    </div>
  );
}
