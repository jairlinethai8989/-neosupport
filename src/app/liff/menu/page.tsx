"use client";

import { useEffect, useState } from "react";
import { MessageSquare, PlusCircle, Activity, ChevronRight, Zap, Info, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLiff } from "../components/LiffProvider";
import { getLiffTicketHistory } from "../liffActions";
import { useRouter } from "next/navigation";

export default function LiffMenuPage() {
  const { user, profile, isRegistered, isLoading: contextLoading } = useLiff();
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!contextLoading && !isRegistered) {
      router.push("/liff/register");
    }
  }, [contextLoading, isRegistered, router]);

  useEffect(() => {
    async function fetchHistory() {
      if (user?.id) {
        const history = await getLiffTicketHistory(user.id);
        setTicketHistory(history);
        setIsLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [user]);

  const pendingCount = ticketHistory.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolvedCount = ticketHistory.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const stats = [
    { label: "ใบงานค้าง", value: pendingCount.toString(), color: "#f59e0b", bg: "#fffbeb" },
    { label: "แก้ไขแล้ว", value: resolvedCount.toString(), color: "#10b981", bg: "#f0fdf4" },
  ];

  if (contextLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="liff-hub animate-fade-in">
      
      {/* Personalized Greeting */}
      <div className="greeting-section">
        <div>
          <span className="welcome-tag">สวัสดีครับ, {user?.hospitals?.name || "ยินดีต้อนรับ"}</span>
          <h1>{user?.display_name || profile?.displayName || "คุณ"} 👋</h1>
        </div>
        <div className="avatar-placeholder" style={{ borderRadius: '50%', overflow: 'hidden' }}>
           {profile?.pictureUrl ? (
             <img src={profile.pictureUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
             <Activity size={20} />
           )}
        </div>
      </div>

      {/* Hero Stats (Lean) */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ background: s.bg, borderColor: s.bg }}>
            <span className="stat-label">{s.label}</span>
            <h3 className="stat-value" style={{ color: s.color }}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Major Action Hub */}
      <div className="action-hub">
        <label className="section-label">เมนูบริการ (Services)</label>
        
        <Link href="/liff/report" className="primary-link">
          <div className="primary-card">
             <div className="blur-overlay" />
             <div className="card-content">
                <div className="icon-box">
                  <PlusCircle size={28} />
                </div>
                <div className="card-info">
                  <h3>แจ้งใบงานใหม่</h3>
                  <p>เปิดเคสซ่อมหรือขอความช่วยเหลือไอที</p>
                </div>
                <ChevronRight size={20} className="arrow-icon" />
             </div>
          </div>
        </Link>

        <Link href="#" className="secondary-link">
          <div className="secondary-card">
             <div className="card-content">
                <div className="icon-group">
                  <div className="icon-box amber">
                    <Zap size={24} fill="white" />
                  </div>
                  <div className="card-info">
                    <h3>สอบถามปัญหาทั่วไป (AI)</h3>
                    <p>ปรึกษาปัญหาเบื้องต้นกับ Google AI</p>
                  </div>
                </div>
                <ChevronRight size={18} className="arrow-muted" />
             </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity (Minimalist) */}
      <div className="history-section">
        <div className="section-header">
          <label className="section-label">ประวัติใบงานล่าสุด</label>
        </div>
        
        <div className="history-list">
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5 }}>กำลังโหลด...</div>
          ) : ticketHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '24px', color: '#94a3b8' }}>
               ไม่มีประวัติใบงาน
            </div>
          ) : (
            ticketHistory.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/liff/chat/${t.id}`} style={{ textDecoration: 'none' }}>
                <div className="history-item">
                  <div className="item-main">
                      <div className={`status-icon ${t.status === 'Resolved' ? 'done' : 'pending'}`}>
                        {t.status === 'Resolved' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="item-text">
                        <h4>{t.ticket_no}</h4>
                        <span className="item-time">{new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                  </div>
                  <ChevronRight size={14} className="arrow-muted" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Branding Footer */}
      <div className="footer">
        <div className="footer-content">
           <Info size={12} className="info-icon" />
           <p>Version 2.0.0 (LIFF-Centric)</p>
        </div>
      </div>

      <style jsx>{`
        .liff-hub { padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
        
        .greeting-section { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
        .welcome-tag { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; }
        h1 { font-size: 1.6rem; font-weight: 800; color: var(--text-heading); margin-top: 4px; }
        .avatar-placeholder { 
          width: 50px; height: 50px; border-radius: 16px; background: white; 
          border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .stat-card { padding: 1.5rem; border-radius: 20px; border: 1px solid transparent; transition: 0.2s; }
        .stat-card:active { transform: scale(0.97); }
        .stat-label { font-size: 0.65rem; font-weight: 750; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .stat-value { font-size: 1.75rem; font-weight: 850; margin-top: 4px; }

        .action-hub { display: flex; flex-direction: column; gap: 1.25rem; }
        .section-label { font-size: 0.65rem; font-weight: 750; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-left: 0.5rem; }
        
        .primary-link { text-decoration: none; }
        .primary-card { 
          background: #006ce4; padding: 2.25rem 2rem; border-radius: 36px; color: white;
          position: relative; overflow: hidden; box-shadow: 0 15px 30px rgba(0, 108, 228, 0.2);
          transition: 0.2s;
        }
        .primary-card:active { transform: scale(0.98); }
        .blur-overlay { position: absolute; top: -40px; right: -40px; width: 140px; height: 140px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(30px); }
        
        .card-content { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 5; }
        .icon-box { background: rgba(255,255,255,0.15); padding: 0.8rem; border-radius: 16px; backdrop-filter: blur(10px); }
        .card-info { flex: 1; margin-left: 1.25rem; }
        .card-info h3 { font-size: 1.35rem; font-weight: 800; color: white; margin-bottom: 2px; }
        .card-info p { font-size: 0.85rem; color: rgba(255,255,255,0.7); font-weight: 500; }
        .arrow-icon { opacity: 0.5; }

        .secondary-link { text-decoration: none; }
        .secondary-card { 
          background: white; border: 1px solid #f1f5f9; padding: 1.75rem; border-radius: 36px;
          transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .secondary-card:active { transform: scale(0.98); }
        .icon-group { display: flex; align-items: center; gap: 1.25rem; }
        .icon-box.amber { background: #f59e0b; color: white; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.25); }
        .secondary-card .card-info h3 { color: var(--text-heading); font-size: 1.15rem; }
        .secondary-card .card-info p { color: #94a3b8; }
        .arrow-muted { color: #cbd5e1; }

        .history-section { display: flex; flex-direction: column; gap: 1rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 0 0.5rem; }
        .btn-text { background: none; border: none; font-size: 0.7rem; font-weight: 800; color: #006ce4; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; }
        
        .history-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .history-item { background: white; padding: 1.25rem; border-radius: 24px; border: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
        .history-item:active { background: #f8fafc; }
        .item-main { display: flex; align-items: center; gap: 1rem; }
        .status-icon { padding: 0.5rem; border-radius: 12px; }
        .status-icon.pending { background: #fffcf0; color: #f59e0b; }
        .status-icon.done { background: #f0fdf4; color: #10b981; }
        .item-text h4 { font-size: 0.95rem; font-weight: 750; color: var(--text-heading); margin-bottom: 2px; }
        .item-time { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }

        .footer { margin-top: auto; padding-bottom: 2rem; border-top: 1px dashed #f1f5f9; padding-top: 2rem; }
        .footer-content { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #cbd5e1; }
        .footer p { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
        .info-icon { opacity: 0.5; }

        .animate-fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
