"use client";

import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { 
  Sun, Moon, ArrowUpDown, ArrowUp, ArrowDown, Menu, 
  LayoutDashboard, PlusCircle, BarChart3, Users, Hospital, Settings, Building2,
  ChevronLeft, ChevronRight, LogOut, Activity, Search, Trash2, 
  CheckCircle, AlertTriangle, Zap, Clock, User, Plus, Info, Inbox, X, Bell
} from "lucide-react";

import { logout } from "./login/actions";
import { createClient } from "@/utils/supabase/client";
import { exportToCSV, exportTicketsPDF } from "@/utils/export-utils";

// ─── Sub-Components ──────────────────────────────────────────

const SlaDisplay = memo(({ 
  ticket, 
  slaPolicy, 
  now 
}: { 
  ticket: any, 
  slaPolicy: Record<string, number>, 
  now: Date | null 
}) => {
  const priority = ticket.priority || "Medium";
  const slaHours = slaPolicy[priority] || 8;
  const createdTime = new Date(ticket.created_at).getTime();
  const updatedTime = ticket.updated_at ? new Date(ticket.updated_at).getTime() : (now?.getTime() || createdTime);
  const slaLimitMs = createdTime + (slaHours * 60 * 60 * 1000);

  let waitTimeColor = "var(--text-muted)";
  let waitTimeText: React.ReactNode = new Date(ticket.created_at).toLocaleString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  if (["Resolved", "Closed"].includes(ticket.status)) {
    const resolveMins = Math.floor((updatedTime - createdTime) / 60000);
    const rHours = Math.floor(resolveMins / 60);
    const rMins = resolveMins % 60;
    const isBreached = updatedTime > slaLimitMs;
    waitTimeColor = isBreached ? "var(--status-escalated-text)" : "var(--status-done-text)";
    waitTimeText = (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isBreached ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
        {isBreached ? "เกิน SLA " : "ใช้เวลา "} {rHours}h {rMins}m
      </span>
    );
  } else if (now) {
    const timeLeftMs = slaLimitMs - now.getTime();
    const timeLeftMins = Math.floor(timeLeftMs / 60000);
    if (timeLeftMins < 0) {
      const overMins = Math.abs(timeLeftMins);
      waitTimeColor = "var(--status-escalated-text)";
      waitTimeText = (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={14} className="animate-pulse" /> เลยกำหนด {Math.floor(overMins/60)}h {overMins%60}m
        </span>
      );
    } else {
      if (timeLeftMins <= 60) waitTimeColor = "var(--prio-high-text)";
      waitTimeText = (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={14} /> เหลือ {Math.floor(timeLeftMins/60)}h {timeLeftMins%60}m
        </span>
      );
    }
  }

  const dateDisplay = new Date(ticket.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div style={{ color: waitTimeColor, fontWeight: "bold", fontSize: "0.85rem" }}>{waitTimeText}</div>
      <div style={{color: "var(--text-muted)", fontSize: "0.75rem", opacity: 0.7}}>
        {dateDisplay}
      </div>
    </div>
  );
});
 SlaDisplay.displayName = "SlaDisplay";

const TicketRow = memo(({ 
  ticket, 
  router, 
  onClaim, 
  isAssigning, 
  getStatusLabel, 
  slaPolicy, 
  now 
}: any) => {
  const t = ticket;
  const userName = t.users?.display_name || "Unknown";
  const hospitalName = t.users?.hospitals?.name || "Unknown Hospital";
  const hospitalId = t.users?.hospitals?.id;

  let badgeCls = "status-pending";
  if (t.status === "In Progress") badgeCls = "status-in-progress";
  if (["Resolved", "Closed"].includes(t.status)) badgeCls = "status-done";
  if (t.status === "Escalated") badgeCls = "status-escalated";

  return (
    <tr 
      onClick={() => router.push(`/tickets/${t.id}`)}
      className={`ticket-row-hover ${!t.assignee_name ? 'unassigned-row' : ''}`}
      style={{ cursor: "pointer", transition: "var(--transition)" }}
    >
      <td style={{ padding: '1.25rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!t.assignee_name && <span className="unassigned-pulse-dot" title="ยังไม่มีผู้รับงาน" />}
          <div className="ticket-no" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>#{t.ticket_no}</div>
        </div>
        <div style={{fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", fontWeight: 700}}>{t.issue_type}</div>
      </td>
      <td><div className="ticket-desc" style={{ fontWeight: 500, lineHeight: 1.5 }}>{t.description}</div></td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{fontWeight: 700, color: "var(--text-heading)", fontSize: '0.9rem'}}>{hospitalName}</div>
          {hospitalId && (
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/hospitals/${hospitalId}/stats`); }}
              className="btn-icon-mini-dashboard"
              style={{ padding: '6px', borderRadius: '10px', background: 'var(--primary-glow)', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
            >
              <BarChart3 size={14} />
            </button>
          )}
        </div>
        <div style={{fontSize: "0.8rem", color: "var(--text-muted)", display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600}}>
          <User size={12} /> {userName}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span className={`status-badge-modern ${badgeCls}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 850 }}>{getStatusLabel(t.status)}</span>
          <span className={`prio-badge prio-${(t.priority || "Medium").toLowerCase()}`} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 850 }}>{t.priority || "Medium"}</span>
        </div>
      </td>
      <td>
        {t.assignee_name ? (
          <div style={{fontWeight: 700, color: "var(--primary)", display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <User size={14} />
            </div>
            {t.assignee_name}
          </div>
        ) : (
          <button onClick={(e) => onClaim(e, t.id)} disabled={isAssigning === t.id} className="btn-claim-modern-dashboard" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.8rem' }}>
            {isAssigning === t.id ? (
              <div className="spinner-mini" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} /> รับงาน
              </div>
            )}
          </button>
        )}
      </td>
      <td><SlaDisplay ticket={t} slaPolicy={slaPolicy} now={now} /></td>
    </tr>
  );
});
TicketRow.displayName = "TicketRow";

const TicketCard = memo(({ 
  ticket, 
  router, 
  onClaim, 
  isAssigning, 
  getStatusLabel, 
  slaPolicy, 
  now 
}: any) => {
  const t = ticket;
  const hospitalName = t.users?.hospitals?.name || "Unknown";
  const hospitalId = t.users?.hospitals?.id;
  const userName = t.users?.display_name || "Unknown";
  
  let badgeCls = "status-pending";
  if (t.status === "In Progress") badgeCls = "status-in-progress";
  if (["Resolved", "Closed"].includes(t.status)) badgeCls = "status-done";
  if (t.status === "Escalated") badgeCls = "status-escalated";

  return (
    <div key={t.id} className={`ticket-card ${!t.assignee_name ? 'unassigned-row' : ''}`} onClick={() => router.push(`/tickets/${t.id}`)} style={{ transition: "all 0.2s ease" }}>
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {!t.assignee_name && <span className="unassigned-pulse-dot" />}
             <div className="card-ticket-no">{t.ticket_no}</div>
          </div>
          <div style={{fontSize: '0.75rem', opacity: 0.7}}>{t.issue_type}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
          <span className={`status-badge ${badgeCls}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
            {getStatusLabel(t.status)}
          </span>
          <span className={`prio-badge prio-${(t.priority || "Medium").toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
            {t.priority || "Medium"}
          </span>
        </div>
      </div>

      <div className="card-hospital" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{hospitalName}</span>
        {hospitalId && (
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/hospitals/${hospitalId}/stats`); }}
            style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--primary-glow)', border: 'none', color: 'var(--primary)' }}
          >
            <BarChart3 size={16} />
          </button>
        )}
      </div>
      <div className="card-meta">
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {userName}</span>
      </div>

      <div className="card-desc">{t.description}</div>

      <div className="card-footer">
        <SlaDisplay ticket={t} slaPolicy={slaPolicy} now={now} />
        <div>
          {t.assignee_name ? (
            <div style={{fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600}}>🙋‍♂️ {t.assignee_name}</div>
          ) : (
            <button 
              onClick={(e) => onClaim(e, t.id)}
              disabled={isAssigning === t.id}
              className="btn-claim-modern-dashboard"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              {isAssigning === t.id ? (
                <div className="spinner-mini" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} className="animate-pulse" /> รับงาน
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
TicketCard.displayName = "TicketCard";

export default function DashboardClient({ initialTickets, userEmail, slaPolicy = {} }: { initialTickets: any[], userEmail?: string, slaPolicy?: Record<string, number> }) {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chartType, setChartType] = useState("status"); // "status", "hospital"
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [mounted, setMounted] = useState(false);
  const [isSmartView, setIsSmartView] = useState(true);
  const [tickets, setTickets] = useState(initialTickets);
  const [now, setNow] = useState<Date | null>(null);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: "", show: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("ALL");
  const [newTicketNotify, setNewTicketNotify] = useState<any>(null);
  // Removed isNavigating state to improve perceived performance

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 3000);
  };

  const handleClaim = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isAssigning) return;
    setIsAssigning(id);
    const staffName = userEmail || "IT Support";
    try {
      const res = await fetch(`/api/tickets/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeName: staffName })
      });
      
      if (res.ok) {
        // Optimistic update
        setTickets(prev => prev.map(tick => 
          tick.id === id ? { ...tick, assignee_name: staffName, status: (tick.status === "Pending" ? "In Progress" : tick.status) } : tick
        ));
        showToast("รับงานสำเร็จ! กำลังไปที่หน้าแชท...");
        router.push(`/tickets/${id}`);
      } else {
        showToast("เกิดข้อผิดพลาดในการรับงาน");
      }
    } catch (err) {
      showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsAssigning(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.body.classList.add("light-theme");
    }

    // Update 'now'
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);

    const supabase = createClient();

    // Request Browser Notification Permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    // Supabase Real-time Subscription for Tickets
    let channel: any = null;

    const setupRealtime = () => {
      channel = supabase
        .channel(`dashboard-tickets-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets',
          },
          async (payload) => {
            console.log('[Dashboard Realtime] Event received:', payload.eventType, payload);

            if (payload.eventType === 'INSERT') {
              // Priority: try fetching joined data for rich display
              try {
                const { data: newTicket, error: fetchErr } = await supabase
                  .from('tickets')
                  .select(`*, users!reporter_id(display_name, department, hospitals(name))`)
                  .eq('id', payload.new.id)
                  .single();

                if (newTicket) {
                  setTickets((prev) => {
                    if (prev.some(t => t.id === newTicket.id)) return prev;
                    return [newTicket, ...prev];
                  });
                  setNewTicketNotify(newTicket);
                  playAlertSound();
                  showNativeNotification(newTicket);
                } else {
                   // Fallback: Use raw payload if join fetch fails (RLS restriction on users table etc)
                   const rawTicket = payload.new;
                   setTickets((prev) => {
                     if (prev.some(t => t.id === rawTicket.id)) return prev;
                     return [rawTicket, ...prev];
                   });
                   // Still play sound for awareness
                   playAlertSound();
                }
              } catch (err) {
                console.error("Real-time handling error:", err);
              }
            } else if (payload.eventType === 'UPDATE') {
              setTickets((prev) =>
                prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
              );
            } else if (payload.eventType === 'DELETE') {
              setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('[Dashboard Realtime] Subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
             // Attempt to reconnect after delay
             setTimeout(() => { if (mounted) setupRealtime(); }, 5000);
          }
        });
    };

    const playAlertSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play();
      } catch (e) {
        logger.warn("Audio play failed", e);
      }
    };

    const showNativeNotification = (ticket: any) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(`🚨 มีงานแจ้งซ่อมใหม่: #${ticket.ticket_no}`, {
          body: `โรงพยาบาล: ${ticket.users?.hospitals?.name || 'รับแจ้งใหม่'}\nแจ้งปัญหา: ${ticket.description.substring(0, 100)}`,
          tag: ticket.id,
          requireInteraction: true,
        });

        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          router.push(`/tickets/${ticket.id}`);
          notification.close();
        };
      }
    };

    // Initial setup
    setupRealtime();

    // Run maintenance (Option A: Auto-Cleanup)
    const runMaintenance = async () => {
      const lastRun = localStorage.getItem("lastCleanup");
      const today = new Date().toDateString();
      if (lastRun !== today) {
        try {
          await fetch("/api/admin/cleanup", { method: "POST" });
          localStorage.setItem("lastCleanup", today);
        } catch (e) {
          logger.error("Maintenance failed", e);
        }
      }
    };
    runMaintenance();
    
    return () => {
      // Cleanup interval timer
      clearInterval(interval);
      
      // Cleanup Supabase real-time subscription
      supabase.removeChannel(channel);
      
      // Cleanup any pending toast timeouts
      setToast({ message: "", show: false });
      
      // Cleanup new ticket notification timeout
      setNewTicketNotify(null);
      
      logger.debug('DashboardClient cleanup completed');
    };
  }, [router]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "light") {
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'Pending': return 'งานใหม่';
      case 'In Progress': return 'กำลังดำเนินการ';
      case 'Resolved': return 'แก้ไขเสร็จสิ้น';
      case 'Closed': return 'ปิดงาน';
      case 'Escalated': return 'ส่งต่องาน';
      default: return s;
    }
  };

  const visibleTickets = useMemo(() => {
    if (!isSmartView) return tickets;
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return tickets.filter(t => {
      // Keep unfinished tasks
      if (!["Resolved", "Closed"].includes(t.status)) return true;
      
      // Keep finished tasks ONLY if they were updated today
      // fallback to created_at if updated_at somehow missing
      const updatedDate = new Date(t.updated_at || t.created_at);
      return updatedDate >= startOfDay;
    });
  }, [tickets, isSmartView]);

  const sortedTickets = useMemo(() => {
    let sortableItems = [...visibleTickets];

    // 1. Filter by status if not "ALL"
    if (statusFilter !== "ALL") {
       sortableItems = sortableItems.filter(t => statusFilter === "Unassigned" ? (!t.assignee_name && ["Pending", "Escalated"].includes(t.status)) : t.status === statusFilter);
    }

    // 2. Filter by Hospital
    if (selectedHospital !== "ALL") {
      sortableItems = sortableItems.filter(t => (t.users?.hospitals?.name || "Unknown") === selectedHospital);
    }

    // 3. Filter by Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(t =>
        t.ticket_no.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.users?.display_name || "").toLowerCase().includes(q) ||
        (t.users?.hospitals?.name || "").toLowerCase().includes(q)
      );
    }

    // 4. Sort the filtered items
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'hospitalName') {
          aValue = a.users?.hospitals?.name || "";
          bValue = b.users?.hospitals?.name || "";
        } else if (sortConfig.key === 'userName') {
          aValue = a.users?.display_name || "";
          bValue = b.users?.display_name || "";
        } else if (sortConfig.key === 'priority') {
          const prioScore: Record<string, number> = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
          aValue = prioScore[a.priority || "Medium"] || 0;
          bValue = prioScore[b.priority || "Medium"] || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [visibleTickets, sortConfig, searchQuery, statusFilter, selectedHospital]);

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="inline-icon opacity-40" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="inline-icon active" />
      : <ArrowDown size={14} className="inline-icon active" />;
  };

  const total = visibleTickets.length;
  const pending = visibleTickets.filter(t => t.status === "Pending").length;
  const inProgress = visibleTickets.filter(t => t.status === "In Progress").length;
  const done = visibleTickets.filter(t => ["Resolved", "Closed"].includes(t.status)).length;
  const escalated = visibleTickets.filter(t => t.status === "Escalated").length;
  const unassignedCount = visibleTickets.filter(t => !t.assignee_name && ["Pending", "Escalated"].includes(t.status)).length;

  const allHospitals = useMemo(() => {
    const names = new Set(tickets.map(t => t.users?.hospitals?.name || "Unknown"));
    return Array.from(names).sort();
  }, [tickets]);

  return (
    <div className={`dashboard-container ${theme}`}>
      {/* New Ticket Realtime Notification Popup - MODERNISED */}
      {newTicketNotify && (
        <div className="new-ticket-popup animate-bounce-in" style={{ background: 'white', borderRadius: '24px', boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-color)', padding: '1.5rem', width: '380px', zIndex: 10000 }}>
          <div className="popup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'var(--primary-glow)', borderRadius: '16px' }}>
                <Bell size={20} color="var(--primary)" />
              </div>
              <span style={{ fontWeight: 850, fontSize: '0.95rem', color: 'var(--text-heading)' }}>มีใบงานใหม่เข้ามา</span>
            </div>
            <button onClick={() => setNewTicketNotify(null)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              {newTicketNotify.users?.hospitals?.name || "ไม่ระบุหน่วยงาน"}
            </div>
            <div style={{ fontSize: '1.25rem', color: 'var(--text-heading)', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
              #{newTicketNotify.ticket_no}
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
              {newTicketNotify.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn-secondary-modern" 
              style={{ flex: 1, padding: '0.9rem', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { router.push(`/tickets/${newTicketNotify.id}`); setNewTicketNotify(null); }}
            >
              ตรวจสอบ
            </button>
            <button 
              className="btn-primary-modern" 
              style={{ flex: 1.2, padding: '0.9rem', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 850, cursor: 'pointer', boxShadow: '0 8px 16px var(--primary-glow)' }}
              onClick={async (e) => { await handleClaim(e as any, newTicketNotify.id); setNewTicketNotify(null); }}
            >
              รับงานทันที
            </button>
          </div>
        </div>
      )}

      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`} style={{ background: 'white', borderRight: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div className="sidebar-logo" style={{ padding: '2rem 1.5rem' }}>
          <div className="logo-icon-container" style={{ background: 'var(--primary)', borderRadius: '12px', boxShadow: '0 8px 16px var(--primary-glow)' }}>
            <Activity className="logo-icon" size={24} color="white" />
          </div>
          {isSidebarOpen && <span className="logo-text" style={{ fontWeight: 900, color: 'var(--text-heading)', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>NEO Support</span>}
        </div>
        
        <nav className="sidebar-nav" style={{ padding: '0 1rem' }}>
          <div className="nav-group-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>{isSidebarOpen ? "MENU" : "•••"}</div>
          <Link href="/" prefetch={true} className="nav-item-modern active" data-label="หน้าหลัก">
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span className="nav-label-modern">หน้าหลัก</span>}
          </Link>
          <Link href="/tickets/new" prefetch={true} className="nav-item-modern" data-label="สร้างใบงาน">
            <PlusCircle size={20} />
            {isSidebarOpen && <span className="nav-label-modern">สร้างใบงาน</span>}
          </Link>

          <div className="nav-group-label" style={{ marginTop: '2rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>{isSidebarOpen ? "ANALYTICS" : "•••"}</div>
          <Link href="/graph" prefetch={true} className="nav-item-modern" data-label="สถิติประสิทธิภาพ">
            <BarChart3 size={20} />
            {isSidebarOpen && <span className="nav-label-modern">สถิติประสิทธิภาพ</span>}
          </Link>

          <div className="nav-group-label" style={{ marginTop: '2rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>{isSidebarOpen ? "SYSTEM" : "•••"}</div>
          <Link href="/settings" prefetch={true} className="nav-item-modern" data-label="ตั้งค่าระบบ">
            <Settings size={20} />
            {isSidebarOpen && <span className="nav-label-modern">ตั้งค่าระบบ</span>}
          </Link>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', marginBottom: '2rem', borderTop: '1px solid var(--border-color)' }}>
              <form action={logout}>
                <button type="submit" className="nav-item-modern hover-danger" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }} data-label="ออกจากระบบ">
                  <LogOut size={20} />
                  {isSidebarOpen && <span className="nav-label-modern">ออกจากระบบ</span>}
                </button>
              </form>
          </div>
        </nav>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          style={{ 
            transform: 'translateY(70px)', 
            right: '-12px', 
            background: 'var(--primary)', 
            color: 'white', 
            boxShadow: '0 4px 10px var(--primary-glow)',
            border: 'none',
            zIndex: 100,
            position: 'absolute',
            willChange: 'transform'
          }}
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      <main className="main-content">
        <header className="header animate-fade-in" style={{ padding: '2rem 3rem', background: 'white', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <div className="header-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>System Operational</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', fontWeight: 900, color: 'var(--text-heading)', letterSpacing: '-1.5px', margin: 0 }}>แผงควบคุมหลัก</h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, margin: '8px 0 0 0' }}>ภาพรวมระบบและใบแจ้งซ่อมจากทุกสาขาในเครือข่าย</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {mounted && (
              <button className="theme-toggle" onClick={toggleTheme} style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', color: 'var(--text-heading)', cursor: 'pointer' }}>
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Link href="/tickets/new" style={{ textDecoration: 'none' }}>
              <button className="btn-primary-modern" style={{ padding: '1rem 2rem', borderRadius: '20px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 850, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px var(--primary-glow)', cursor: 'pointer' }}>
                <Plus size={20} /> สร้างใบงานใหม่
              </button>
            </Link>
          </div>
        </header>

        <section className="summary-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', padding: '0 3rem', marginBottom: '3rem' }}>
          {[
            { label: "ใบงานทั้งหมด", sub: "Total Tickets", value: total, color: "var(--primary)", icon: <Activity size={22} /> },
            { label: "รอดำเนินการ", sub: "Pending", value: pending, color: "var(--status-pending-text)", icon: <Clock size={22} /> },
            { label: "กำลังแก้ไข", sub: "In Progress", value: inProgress, color: "var(--status-progress-text)", icon: <Zap size={22} /> },
            { label: "ยังไม่รับงาน", sub: "Unassigned", value: unassignedCount, color: "var(--status-escalated-text)", glow: true, icon: <AlertTriangle size={22} /> }
          ].map((m, i) => (
            <div key={i} className="technical-panel" style={{ padding: '2rem', borderRadius: '32px', border: '1px solid var(--border-color)', background: 'white', boxShadow: 'var(--shadow-premium)', transition: 'var(--transition)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ padding: '12px', borderRadius: '16px', background: `${m.color}10`, color: m.color }}>
                  {m.icon}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{m.sub}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: m.color, letterSpacing: '-1px', lineHeight: 1 }}>{m.value}</div>
                </div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-heading)' }}>{m.label}</div>
            </div>
          ))}
        </section>

        <section className="hud-content" style={{ width: '100%', maxWidth: 'none' }}>
          {/* Mobile Card Layout - Visible only on mobile via CSS */}
          <div className="mobile-cards-container">
               {sortedTickets.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Inbox size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  ไม่พบรายการที่ค้นหา
                </div>
              ) : (
                sortedTickets.map(t => (
                  <TicketCard 
                    key={t.id} 
                    ticket={t} 
                    router={router} 
                    onClaim={handleClaim} 
                    isAssigning={isAssigning}
                    getStatusLabel={getStatusLabel}
                    slaPolicy={slaPolicy}
                    now={now}
                  />
                ))
              )}
            </div>

        {/* New Jobs Alert Section */}
        {mounted && unassignedCount > 0 && (
          <div 
            className="alert-container animate-fade-in delay-1" 
            style={{ 
              backgroundColor: "rgba(255, 123, 114, 0.15)", 
              border: statusFilter === "Unassigned" ? "2px solid var(--status-escalated-text)" : "1px solid var(--status-escalated-text)", 
              borderRadius: "12px", 
              padding: "1.5rem", 
              marginBottom: "2rem", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "transform 0.2s ease" 
            }}
            onClick={() => setStatusFilter("Unassigned")}
            title="คลิกเพื่อดูเฉพาะงานที่ยังไม่มีคนรับ"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "2.5rem" }}>🚨</span>
              <div>
                <h2 style={{ margin: 0, color: "var(--status-escalated-text)", fontSize: "1.2rem", fontWeight: 800 }}>มีงานใหม่รอผู้รับผิดชอบ (New Unassigned Jobs)</h2>
                <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-main)", fontSize: "0.95rem" }}>ตอนนี้มี <strong style={{color: "var(--status-escalated-text)", fontSize: "1.1rem"}}>{unassignedCount} งาน</strong> ที่กำลังรอให้ทีม IT กด ✋ Claim เพื่อรับงาน โปรดตรวจสอบในตารางด้านล่างด่วน!</p>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        <div className="table-container animate-fade-in delay-2">
          <div className="table-header-row" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}>
                <Activity size={24} color="var(--primary)" />
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                  รายการใบงานล่าสุด <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Recent Tickets</span>
                </span>
                {statusFilter !== "ALL" && (
                  <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 600, border: '1px solid var(--primary)' }}>
                    {getStatusLabel(statusFilter)}
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setIsSmartView(!isSmartView)}
                  className="btn-secondary"
                  style={{ 
                    fontSize: '0.85rem', 
                    padding: '0.5rem 1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    borderRadius: '12px',
                    border: isSmartView ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSmartView ? 'var(--primary-glow)' : 'transparent',
                    color: isSmartView ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                  title="Smart View: ซ่อนงานที่ปิดไปแล้วก่อนหน้าวันนี้ เพื่อให้ตารางสะอาดตา"
                >
                  {isSmartView ? '✨ Smart View: ON' : '📁 All History'}
                </button>
                
                {(statusFilter !== "ALL" || selectedHospital !== "ALL" || searchQuery !== "") && (
                  <button 
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSelectedHospital("ALL");
                      setSearchQuery("");
                    }}
                     className="btn-secondary hover-danger"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> ล้างตัวกรอง
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                  <button 
                    onClick={() => {
                      const dataToExport = sortedTickets.map(t => ({
                        'Ticket No': t.ticket_no,
                        'Description': t.description,
                        'Hospital': t.users?.hospitals?.name,
                        'Department': t.users?.department,
                        'User': t.users?.display_name,
                        'Status': t.status,
                        'Priority': t.priority,
                        'Assignee': t.assignee_name,
                        'Created At': new Date(t.created_at).toLocaleString('th-TH')
                      }));
                      exportToCSV(dataToExport, `tickets_report_${new Date().toISOString().split('T')[0]}`);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                  >
                    CSV
                  </button>
                  <button 
                    onClick={() => exportTicketsPDF(sortedTickets, `IT_Support_Report_${new Date().toLocaleDateString('th-TH')}`)}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="filter-bar-modern" style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
               <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Search size={18} />
                </span>
                <input 
                  type="text" 
                  placeholder="ค้นหาเลขที่ Ticket, อาการ, ชื่อผู้แจ้ง หรือโรงพยาบาล..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                    borderRadius: '14px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-heading)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    border: '2px solid var(--border-color)'
                  }}
                  className="search-input-modern"
                />
              </div>

              <select 
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  minWidth: '220px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                 <option value="ALL">เลือกโรงพยาบาลทั้งหมด</option>
                {allHospitals.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>

              {selectedHospital !== "ALL" && (
                <button 
                  onClick={() => {
                    const hData = tickets.find(t => (t.users?.hospitals?.name === selectedHospital));
                    if (hData?.users?.hospitals?.id) {
                      router.push(`/hospitals/${hData.users.hospitals.id}/stats`);
                    }
                  }}
                  className="btn-primary"
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    boxShadow: '0 4px 12px var(--primary-glow)' 
                  }}
                >
                  <BarChart3 size={18} /> ดูสถิติ {selectedHospital}
                </button>
              )}
            </div>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('ticket_no')}>
                    <span style={{ display: 'block' }}>เลขที่ใบงาน</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>Ticket No.</span>
                    {renderSortIcon('ticket_no')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('description')}>
                    <span style={{ display: 'block' }}>รายละเอียด</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>Description</span>
                    {renderSortIcon('description')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('hospitalName')}>
                    <span style={{ display: 'block' }}>โรงพยาบาล/ผู้แจ้ง</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>Hospital / User</span>
                    {renderSortIcon('hospitalName')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    <span style={{ display: 'block' }}>สถานะ/ความสำคัญ</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>Status / Priority</span>
                    {renderSortIcon('status')}
                  </th>
                  <th>
                    <span style={{ display: 'block' }}>ผู้รับผิดชอบ</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>Assignee</span>
                  </th>
                  <th className="sortable" onClick={() => handleSort('created_at')}>
                    <span style={{ display: 'block' }}>สถานะเวลา SLA</span>
                    <span style={{ fontSize: '0.65em', opacity: 0.6, display: 'block', fontWeight: 'normal' }}>SLA Status</span>
                    {renderSortIcon('created_at')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTickets.length === 0 ? (
                   <tr>
                    <td colSpan={6} style={{textAlign: "center", padding: "4rem"}}>
                      <Inbox size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p style={{marginTop: '1rem', color: "var(--text-muted)", fontSize: '1.1rem'}}>No tickets found. Good job!</p>
                    </td>
                  </tr>
                ) : (
                  sortedTickets.map((t: any) => (
                    <TicketRow 
                      key={t.id} 
                      ticket={t} 
                      router={router} 
                      onClaim={handleClaim} 
                      isAssigning={isAssigning}
                      getStatusLabel={getStatusLabel}
                      slaPolicy={slaPolicy}
                      now={now}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card Layout - Visible only on mobile via CSS */}
        </section>
      </main>
       {toast.show && (
        <div className="toast-notification">
           <Info size={18} /> {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .sidebar.collapsed .nav-item {
          position: relative;
        }

        .sidebar.collapsed .nav-item::after {
          content: attr(data-label);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%) translateX(10px);
          background: var(--bg-surface);
          color: var(--text-heading);
          padding: 0.5rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          border: 1px solid var(--border-color);
          z-index: 1000;
        }

        .sidebar.collapsed .nav-item:hover::after {
          opacity: 1;
          transform: translateY(-50%) translateX(15px);
        }

        .hud-style {
          background: rgba(var(--bg-surface-rgb, 255, 255, 255), 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3), 0 5px 20px -5px rgba(0,0,0,0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .scanner-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
          animation: scan 3s linear infinite;
          transform: translateY(0);
          will-change: transform;
        }

        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in, .scanner-line, .btn-primary-modern, .nav-item {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
