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

export default function TicketHeader({ ticket, onCopyTicketId }: TicketHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = ticket.status || 'Pending';
  const StatusIcon = statusConfig[status]?.icon || Clock;

  return (
    <div className="clean-header">
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
            borderColor: `var(--prio-${ticket.priority.toLowerCase()}-text)`
          }}>
            {ticket.priority.toUpperCase()}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="details-grid animate-fade-in">
          <div className="detail-item">
            <label>หน่วยงาน</label>
            <p>{ticket.users?.hospitals?.name || 'ไม่ระบุ'}</p>
          </div>
          <div className="detail-item">
            <label>ผู้แจ้ง</label>
            <p>{ticket.users?.display_name || 'ไม่ระบุ'} ({ticket.users?.department || '-'})</p>
          </div>
          <div className="detail-item">
            <label>กลุ่มงานที่รับผิดชอบ</label>
            <p>{ticket.departments?.name || 'ยังไม่ระบุ'}</p>
          </div>
          <div className="detail-item">
            <label>วันที่สร้าง</label>
            <p>{new Date(ticket.created_at).toLocaleString('th-TH')}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .clean-header {
          padding: 2rem;
          border-bottom: 1px solid var(--border-color);
          background: white;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }
        .id-label { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .id-value { 
          font-size: clamp(1.2rem, 4.5vw, 1.65rem); 
          font-weight: 800; 
          color: var(--text-heading); 
          margin-top: 4px; 
          letter-spacing: -1.25px;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.1;
        }
        
        .action-row { display: flex; gap: 0.75rem; }
        .btn-copy, .btn-info {
          display: flex; gap: 0.5rem; align-items: center;
          padding: 0.6rem 1rem; border-radius: 10px; border: 1px solid var(--border-color);
          font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s;
          background: white;
          color: var(--text-main);
        }
        .btn-copy:hover, .btn-info:hover { background: var(--bg-surface-hover); border-color: var(--primary); color: var(--primary); }

        .badge-row { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }
        .status-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 0.4rem 1.25rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700;
        }
        .priority-badge {
          padding: 0.4rem 1.25rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700;
          border: 1px solid transparent;
        }
        
        .details-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1.5rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-color);
        }
        .detail-item label { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
        .detail-item p { font-size: 0.95rem; font-weight: 600; color: var(--text-heading); margin-top: 4px; }
        
        @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}
