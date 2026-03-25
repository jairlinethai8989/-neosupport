"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Zap, User, Share2, Info } from "lucide-react";

interface TicketHeaderProps {
  ticket: any;
  assigneeName?: string;
  onCopyTicketId: () => void;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  'Pending': { icon: Clock, color: 'var(--status-pending-text)', label: 'รอการแก้ไข' },
  'In Progress': { icon: Zap, color: 'var(--status-in-progress-text)', label: 'กำลังดำเนินการ' },
  'Escalated': { icon: AlertTriangle, color: 'var(--status-escalated-text)', label: 'ส่งต่อ' },
  'Resolved': { icon: CheckCircle, color: 'var(--status-done-text)', label: 'แก้ไขเสร็จสิ้น' },
  'Closed': { icon: CheckCircle, color: 'var(--status-done-text)', label: 'ปิดงาน' }
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  'Critical': { color: 'var(--prio-critical-text)', label: 'วิกฤต' },
  'High': { color: 'var(--prio-high-text)', label: 'สูง' },
  'Medium': { color: 'var(--prio-medium-text)', label: 'ปานกลาง' },
  'Low': { color: 'var(--prio-low-text)', label: 'ต่ำ' }
};

export default function TicketHeader({ ticket, assigneeName, onCopyTicketId }: TicketHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = ticket.status || 'Pending';
  const priority = ticket.priority || 'Medium';
  const StatusIcon = statusConfig[status]?.icon || Clock;
  const statusColor = statusConfig[status]?.color || 'var(--text-muted)';

  return (
    <>
      <div className="hud-header-container">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div className="ticket-id-badge">
              <span className="badge-label">TICKET_ID</span>
              <h1 className="badge-value">{ticket.ticket_no}</h1>
            </div>
            <button
              onClick={onCopyTicketId}
              className="btn-action-small"
              title="Copy ticket ID"
            >
              <Share2 size={12} />
              <span>COPY_REF</span>
            </button>
          </div>

          <p className="ticket-description">
            {ticket.description}
          </p>

          <div className="badge-row">
            <span className="status-indicator" style={{ borderLeftColor: statusColor, background: `${statusColor}10`, color: statusColor }}>
              <StatusIcon size={12} />
              {statusConfig[status]?.label.toUpperCase() || status}
            </span>

            <span className="prio-indicator" style={{ borderColor: priorityConfig[priority]?.color, color: priorityConfig[priority]?.color }}>
              {priorityConfig[priority]?.label || priority}
            </span>

            {ticket.issue_type && <span className="meta-tag">{ticket.issue_type}</span>}
            {ticket.module && <span className="meta-tag">{ticket.module}</span>}
          </div>
        </div>

        <div className="header-operator-panel">
          <div className="operator-card">
            <div className="operator-label">CURRENT_OPERATOR</div>
            <div className="operator-value" style={{ color: assigneeName ? 'var(--primary)' : 'var(--text-muted)' }}>
              <User size={16} />
              <span>{assigneeName?.toUpperCase() || 'UNA_NODE'}</span>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="btn-details-toggle"
            >
              <Info size={12} />
              {showDetails ? 'COLLAPSE_LOG' : 'EXPAND_LOG'}
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="details-log-panel animate-slide-down">
          <div className="panel-header">TICKET_LOG_METADATA</div>
          <div className="details-grid">
            <div className="detail-item">
              <div className="item-label">TIMESTAMP_CREATE</div>
              <div className="item-value">{new Date(ticket.created_at).toLocaleString('th-TH')}</div>
            </div>
            {ticket.updated_at && (
              <div className="detail-item">
                <div className="item-label">TIMESTAMP_UPDATE</div>
                <div className="item-value">{new Date(ticket.updated_at).toLocaleString('th-TH')}</div>
              </div>
            )}
            {ticket.reporter_name && (
              <div className="detail-item">
                <div className="item-label">SOURCE_ENTITY</div>
                <div className="item-value">{ticket.reporter_name}</div>
              </div>
            )}
            {ticket.hospital_name && (
              <div className="detail-item">
                <div className="item-label">LOCATION_NODE</div>
                <div className="item-value">{ticket.hospital_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .hud-header-container {
          background: var(--bg-surface);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-sharp);
          padding: 1.5rem;
          margin-bottom: 0;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .hud-header-container::after {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: repeating-linear-gradient(0deg, var(--hud-scanline), var(--hud-scanline) 1px, transparent 1px, transparent 2px);
          pointer-events: none;
        }

        .ticket-id-badge {
          display: flex;
          flex-direction: column;
        }
        .badge-label {
          font-size: 0.55rem;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 2px;
          margin-bottom: 2px;
          font-family: monospace;
        }
        .badge-value {
          margin: 0;
          font-size: 1.75rem;
          color: var(--text-heading);
          font-weight: 800;
          line-height: 1;
        }

        .btn-action-small {
          padding: 0.4rem 0.6rem;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid var(--border-color);
          border-radius: 2px;
          font-size: 0.65rem;
          color: var(--primary);
          cursor: pointer;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .btn-action-small:hover { background: var(--primary); color: black; }

        .ticket-description {
          margin: 0 0 1.25rem 0;
          color: var(--text-main);
          font-size: 1rem;
          line-height: 1.6;
          border-left: 2px solid var(--primary);
          padding-left: 1rem;
        }

        .badge-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }
        
        .status-indicator {
          padding: 0.2rem 0.6rem;
          border-left: 3px solid transparent;
          font-size: 0.7rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        .prio-indicator {
          padding: 0.2rem 0.6rem;
          border: 1px solid transparent;
          font-size: 0.7rem;
          font-weight: 800;
        }
        
        .meta-tag {
          padding: 0.2rem 0.6rem;
          background: rgba(0,0,0,0.2);
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid var(--border-light);
        }

        .operator-card {
          padding: 1rem;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 2px;
          min-width: 220px;
        }
        
        .operator-label {
          font-size: 0.55rem;
          color: var(--text-muted);
          font-weight: 800;
          margin-bottom: 0.5rem;
          font-family: monospace;
        }
        
        .operator-value {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 800;
          font-size: 0.95rem;
          margin-bottom: 0.75rem;
        }

        .btn-details-toggle {
          width: 100%;
          padding: 0.4rem;
          background: transparent;
          border: 1px solid var(--border-light);
          color: var(--text-muted);
          font-size: 0.65rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .btn-details-toggle:hover { border-color: var(--primary); color: var(--primary); }

        .details-log-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-top: none;
          padding: 1.25rem;
          position: relative;
        }
        
        .panel-header {
          font-size: 0.6rem;
          color: var(--primary);
          font-weight: 800;
          margin-bottom: 1rem;
          font-family: monospace;
          opacity: 0.6;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .item-label { font-size: 0.55rem; color: var(--text-muted); font-weight: 800; }
        .item-value { font-size: 0.85rem; font-weight: 600; color: var(--text-main); }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
      `}</style>
    </>
  );
}
