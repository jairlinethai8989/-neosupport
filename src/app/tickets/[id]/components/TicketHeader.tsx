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
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-heading)' }}>
              {ticket.ticket_no}
            </h1>
            <button
              onClick={onCopyTicketId}
              style={{
                padding: '0.4rem 0.75rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Copy ticket ID"
            >
              <Share2 size={14} />
            </button>
          </div>

          <p style={{
            margin: '0 0 1rem 0',
            color: 'var(--text-main)',
            fontSize: '1.05rem',
            lineHeight: '1.5'
          }}>
            {ticket.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{
              padding: '0.4rem 0.75rem',
              background: `${statusColor}15`,
              color: statusColor,
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <StatusIcon size={14} />
              {statusConfig[status]?.label || status}
            </span>

            <span style={{
              padding: '0.4rem 0.75rem',
              background: `${priorityConfig[priority]?.color}15`,
              color: priorityConfig[priority]?.color,
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {priorityConfig[priority]?.label || priority}
            </span>

            {ticket.issue_type && (
              <span style={{
                padding: '0.4rem 0.75rem',
                background: 'var(--bg-color)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                {ticket.issue_type}
              </span>
            )}

            {ticket.module && (
              <span style={{
                padding: '0.4rem 0.75rem',
                background: 'var(--bg-color)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                {ticket.module}
              </span>
            )}
          </div>
        </div>

        <div style={{ minWidth: '200px' }}>
          <div style={{
            padding: '1rem',
            background: 'var(--bg-color)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Assigned To
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              color: assigneeName ? 'var(--primary)' : 'var(--text-muted)'
            }}>
              <User size={18} />
              {assigneeName || 'Unassigned'}
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                padding: '0.5rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Info size={14} />
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)',
          animation: 'slide-down 0.3s ease-out'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>
            Ticket Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Created</div>
              <div style={{ fontWeight: 500 }}>{new Date(ticket.created_at).toLocaleString('th-TH')}</div>
            </div>
            {ticket.updated_at && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Updated</div>
                <div style={{ fontWeight: 500 }}>{new Date(ticket.updated_at).toLocaleString('th-TH')}</div>
              </div>
            )}
            {ticket.reporter_name && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reporter</div>
                <div style={{ fontWeight: 500 }}>{ticket.reporter_name}</div>
              </div>
            )}
            {ticket.hospital_name && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Hospital</div>
                <div style={{ fontWeight: 500 }}>{ticket.hospital_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
