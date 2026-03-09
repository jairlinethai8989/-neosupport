"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Trash2, FileText, Calendar, Database, 
  ShieldAlert, Activity, ChevronRight, Sun, Moon
} from "lucide-react";

export default function AuditLogClient({ initialLogs }: { initialLogs: any[] }) {
  const [theme, setTheme] = useState("dark");
  const [logs] = useState(initialLogs);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.body.classList.toggle("light-theme");
  };

  return (
    <div className={`dashboard-container ${theme}`} style={{ display: 'block' }}>
      <main className="main-content" style={{ marginLeft: 0, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div className="header animate-fade-in" style={{ marginBottom: '2rem' }}>
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/settings" className="btn-icon-modern">
               <ArrowLeft size={20} />
            </Link>
            <div>
              <h1>Audit Logs & Cleanup History</h1>
              <p>ติดตามประวัติการทำความสะอาดไฟล์และ Backup Metadata</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-title">รวมไฟล์ที่ถูกลบ (30 วัน)</div>
              <div className="stat-icon-container" style={{ background: 'var(--status-escalated-bg)' }}>
                <Trash2 size={20} color="var(--status-escalated-text)" />
              </div>
            </div>
            <div className="stat-value">{logs.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-title">ระบบสถานะ</div>
              <div className="stat-icon-container" style={{ background: 'var(--status-done-bg)' }}>
                <Activity size={20} color="var(--status-done-text)" />
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--status-done-text)' }}>Active (Auto)</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header-row" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldAlert size={22} color="var(--primary)" />
              ประวัติการลบทิ้งล่าสุด (100 รายการ)
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <Database size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>ยังไม่มีประวัติการ Cleanup ในระบบ</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>วันที่ลบ</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>หมายเลข Ticket</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>ประเภทไฟล์</th>
                    <th style={{ textAlign: 'left', padding: '1rem' }}>ไฟล์ต้นทาง (Legacy URL)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={14} color="var(--text-muted)" />
                            {new Date(log.deleted_at).toLocaleString('th-TH')}
                         </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                           {log.metadata?.ticket_no || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`status-badge ${log.file_type === 'video' ? 'status-progress' : 'status-pending'}`} style={{ fontSize: '0.75rem' }}>
                           {log.file_type === 'video' ? '🎬 Video' : '🖼️ Image'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                         <code style={{ fontSize: '0.8rem', opacity: 0.6 }}>{log.public_url}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
