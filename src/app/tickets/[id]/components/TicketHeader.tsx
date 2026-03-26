"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Zap, Share2, Info } from "lucide-react";

interface TicketHeaderProps {
  ticket: any;
  assigneeName?: string;
  onCopyTicketId: () => void;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  'Pending': { icon: Clock, color: 'var(--status-pending-text)', bg: 'var(--status-pending-bg)', label: 'รอการแก้ไข' },
  'In Progress': { icon: Zap, color: 'var(--status-progress-text)', bg: 'var(--status-progress-bg)', label: 'กำลังดำเนินการ' },
  'Escalated': { icon: AlertTriangle, color: 'var(--status-escalated-text)', bg: 'var(--status-escalated-bg)', label: 'ส่งต่อ' },
  'Resolved': { icon: CheckCircle, color: 'var(--status-done-text)', bg: 'var(--status-done-bg)', label: 'แก้ไขเสร็จสิ้น' },
  'Closed': { icon: CheckCircle, color: 'var(--status-done-text)', bg: 'var(--status-done-bg)', label: 'ปิดงาน' }
};

export default function TicketHeader({ ticket, assigneeName, onCopyTicketId }: TicketHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = ticket.status || 'Pending';
  const StatusIcon = statusConfig[status]?.icon || Clock;

  return (
    <div className="modern-header">
      <div className="header-top">
        <div className="id-section">
          <span className="id-label">Ticket ID</span>
          <h1 className="id-value">#{ticket.ticket_no}</h1>
        </div>
        
        <div className="action-row">
          <button onClick={onCopyTicketId} className="btn-copy">
            <Share2 size={14} /> <span>คัดลอก ID</span>
          </button>
          <button onClick={() => setShowDetails(!showDetails)} className="btn-info">
            <Info size={14} /> {showDetails ? 'ซ่อนรายละเอียด' : 'ดูข้อมูเพิ่มเติม'}
          </button>
        </div>
      </div>

      <div className="badge-row">
        <div className="status-badge" style={{ backgroundColor: statusConfig[status]?.bg, color: statusConfig[status]?.color }}>
          <StatusIcon size={14} />
          {statusConfig[status]?.label}
        </div>
        {ticket.priority && (
          <div className="priority-badge" style={{ 
            backgroundColor: `var(--prio-${ticket.priority.toLowerCase()}-bg)`, 
            color: `var(--prio-${ticket.priority.toLowerCase()}-text)`,
            borderColor: `var(--prio-${ticket.priority.toLowerCase()}-bg)`
          }}>
            {ticket.priority.toUpperCase()}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="details-grid animate-fade-in">
          <div className="detail-item">
            <label>หน่วยงาน</label>
            <p>{ticket.hospitals?.name || ticket.users?.hospitals?.name || 'ไม่ระบุ'}</p>
          </div>
          <div className="detail-item">
            <label>ผู้แจ้ง</label>
            <p>{ticket.users?.display_name || 'ไม่ระบุ'} ({ticket.users?.department || '-'})</p>
          </div>
          {assigneeName && (
            <div className="detail-item">
              <label>ผู้รับผิดชอบ</label>
              <p>{assigneeName}</p>
            </div>
          )}
          <div className="detail-item">
            <label>กลุ่มงาน</label>
            <p>{ticket.departments?.name || 'ยังไม่ระบุ'}</p>
          </div>
          <div className="detail-item">
            <label>วันที่สร้าง</label>
            <p>{new Date(ticket.created_at).toLocaleString('th-TH')}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .modern-header {
          padding: 2.25rem;
          border-bottom: 1px solid var(--border-color);
          background: white;
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: var(--radius-lg);
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .id-label { font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; }
        .id-value { 
          font-size: clamp(1.4rem, 4.5vw, 1.85rem); 
          font-weight: 900; 
          color: var(--text-heading); 
          margin-top: 4px; 
          letter-spacing: -1.5px;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.1;
        }
        
        .action-row { display: flex; gap: 0.75rem; }
        .btn-copy, .btn-info {
          display: flex; gap: 0.5rem; align-items: center;
          padding: 0.7rem 1.1rem; border-radius: 14px; border: 1px solid var(--border-color);
          font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: var(--transition);
          background: white;
          color: var(--text-main);
          box-shadow: var(--shadow-sm);
        }
        .btn-copy:hover, .btn-info:hover { 
          background: var(--bg-surface-hover); 
          border-color: var(--primary); 
          color: var(--primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .badge-row { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }
        .status-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 0.5rem 1.5rem; border-radius: 40px; font-size: 0.75rem; font-weight: 850;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .priority-badge {
          padding: 0.5rem 1.5rem; border-radius: 40px; font-size: 0.75rem; font-weight: 850;
          border: 1px solid transparent;
        }
        
        .details-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1.5rem; margin-top: 2rem; padding-top: 1.75rem; border-top: 1px dashed var(--border-color);
        }
        .detail-item label { font-size: 0.6rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .detail-item p { font-size: 0.9rem; font-weight: 700; color: var(--text-heading); margin-top: 5px; line-height: 1.4; }
        
        @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}
