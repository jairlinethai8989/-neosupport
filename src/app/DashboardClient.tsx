"use client";

import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  Sun, Moon, ArrowUpDown, ArrowUp, ArrowDown, Menu, 
  LayoutDashboard, PlusCircle, BarChart3, Users, Hospital, Settings,
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
      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
    >
      <td>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!t.assignee_name && <span className="unassigned-pulse-dot" title="ยังไม่มีผู้รับงาน" />}
          <div className="ticket-no">{t.ticket_no}</div>
        </div>
        <div style={{fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem"}}>{t.issue_type}</div>
      </td>
      <td><div className="ticket-desc">{t.description}</div></td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{fontWeight: 500, color: "var(--text-heading)"}}>{hospitalName}</div>
          {hospitalId && (
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/hospitals/${hospitalId}/stats`); }}
              className="btn-icon-mini-dashboard"
              title="ดูสถิติเชิงลึกของโรงพยาบาลนี้"
              style={{ padding: '4px', borderRadius: '6px', background: 'var(--primary-glow)', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
            >
              <BarChart3 size={14} />
            </button>
          )}
        </div>
        <div style={{fontSize: "0.85rem", color: "var(--text-muted)", display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}>
          <User size={12} /> {userName}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
          <span className={`status-badge ${badgeCls}`}>{getStatusLabel(t.status)}</span>
          <span className={`prio-badge prio-${(t.priority || "Medium").toLowerCase()}`}>{t.priority || "Medium"}</span>
        </div>
      </td>
      <td>
        {t.assignee_name ? (
          <div style={{fontWeight: 500, color: "var(--primary)", display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <Users size={14} /> {t.assignee_name}
          </div>
        ) : (
          <button onClick={(e) => onClaim(e, t.id)} disabled={isAssigning === t.id} className="btn-claim-modern-dashboard">
            {isAssigning === t.id ? (
              <div className="spinner-mini" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} className="animate-pulse" /> รับงาน
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

    // Supabase Real-time Subscription for Tickets
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tickets',
        },
        async (payload) => {
          console.log('Realtime Ticket Change:', payload);

          if (payload.eventType === 'INSERT') {
            // Need to fetch user nested relationship since realtime payload is flat
            const { data: newTicket } = await supabase
              .from('tickets')
              .select(`*, users!reporter_id(display_name, department, hospitals(name))`)
              .eq('id', payload.new.id)
              .single();

            if (newTicket) {
              setTickets((prev) => [newTicket, ...prev]);
              // Trigger Popup
              setNewTicketNotify(newTicket);
              // Play Alert Sound
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.5;
                audio.play();
              } catch (e) {
                console.warn("Audio play failed", e);
              }
              // Auto hide after 10 seconds
              setTimeout(() => setNewTicketNotify((prev: any) => (prev?.id === newTicket.id ? null : prev)), 15000);
            } else {
              setTickets((prev) => [payload.new, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Merge update into existing ticket to keep relational data
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Run maintenance (Option A: Auto-Cleanup)
    const runMaintenance = async () => {
      const lastRun = localStorage.getItem("lastCleanup");
      const today = new Date().toDateString();
      if (lastRun !== today) {
        try {
          await fetch("/api/admin/cleanup", { method: "POST" });
          localStorage.setItem("lastCleanup", today);
        } catch (e) {
          console.error("Maintenance failed", e);
        }
      }
    };
    runMaintenance();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

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
  }, [tickets, sortConfig, searchQuery, statusFilter, selectedHospital, isSmartView, visibleTickets]);

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

   const statusData = [
    { name: 'งานใหม่', count: pending, fill: '#f59e0b' },
    { name: 'กำลังดำเนินการ', count: inProgress, fill: '#3b82f6' },
    { name: 'แก้ไขเสร็จสิ้น', count: done, fill: '#22c55e' },
    { name: 'ส่งต่องาน', count: escalated, fill: '#ef4444' }
  ];

  const hospitalCounts = visibleTickets.reduce((acc, t) => {
    const name = t.users?.hospitals?.name || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const hospitalColorsDark = ['#58a6ff', '#bc8cff', '#3fb950', '#d29922', '#f85149'];
  const hospitalColorsLight = ['#0969da', '#8250df', '#1a7f37', '#9a6700', '#d1242f'];
  const currentColors = theme === 'dark' ? hospitalColorsDark : hospitalColorsLight;

  const hospitalData = Object.keys(hospitalCounts).map((key, index) => ({
    name: key, 
    count: hospitalCounts[key],
    fill: currentColors[index % currentColors.length]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-heading)', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          <p style={{ color: payload[0].payload.fill }}>Tickets: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`dashboard-container ${theme}`}>
      {/* New Ticket Realtime Notification Popup */}
      {newTicketNotify && (
        <div className="new-ticket-popup animate-bounce-in">
          <div className="popup-header">
            <div className="popup-title">
              <Bell size={20} className="animate-pulse" />
              <span>แจ้งซ่อมใหม่เข้าระบบ!</span>
            </div>
            <button className="popup-close" onClick={() => setNewTicketNotify(null)}>
              <X size={20} />
            </button>
          </div>
          <div className="popup-content">
            <div className="popup-hospital">
              {newTicketNotify.users?.hospitals?.name || "โรงพยาบาลไม่ระบุ"}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
              Ticket: {newTicketNotify.ticket_no}
            </div>
            <div className="popup-desc">
              {newTicketNotify.description}
            </div>
          </div>
          <div className="popup-footer">
            <button 
              className="popup-btn-primary" 
              onClick={() => {
                router.push(`/tickets/${newTicketNotify.id}`);
                setNewTicketNotify(null);
              }}
            >
              ดูรายละเอียดงาน
            </button>
          </div>
        </div>
      )}

      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon-container">
            <Activity className="logo-icon" size={24} />
          </div>
          {isSidebarOpen && <span className="logo-text">NEO Support</span>}
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-group-label">{isSidebarOpen ? "หลัก" : "•••"}</div>
          <Link href="/" className="nav-item active">
            <LayoutDashboard size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">Dashboard</span>}
          </Link>
          <Link href="/tickets/new" className="nav-item">
            <PlusCircle size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">สร้างตั๋วงาน</span>}
          </Link>

          <div className="nav-group-label" style={{ marginTop: '1.5rem' }}>{isSidebarOpen ? "การจัดการและสถิติ" : "•••"}</div>
          <Link href="/graph" className="nav-item">
            <BarChart3 size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">สถิติประสิทธิภาพ</span>}
          </Link>

          <div className="nav-group-label" style={{ marginTop: '1.5rem' }}>{isSidebarOpen ? "การตั้งค่าระบบ" : "•••"}</div>
          <Link href="/settings/hospitals" className="nav-item">
            <Building2 size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">จัดการโรงพยาบาล</span>}
          </Link>
          <Link href="/settings/staff-approvals" className="nav-item">
            <Users size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">อนุมัติพนักงาน</span>}
          </Link>
          <Link href="/settings" className="nav-item">
            <Settings size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">ตั้งค่าระบบทั่วไป</span>}
          </Link>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <form action={logout}>
                <button type="submit" className="nav-item hover-danger" style={{ width: '100%', background: 'none', border: 'none' }}>
                  <LogOut size={20} className="nav-icon" />
                  {isSidebarOpen && <span className="nav-label">ออกจากระบบ</span>}
                </button>
              </form>
          </div>
        </nav>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      <main className="main-content">
        <div className="header animate-fade-in">
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="btn-icon-modern"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <div>
              <h1>IT Support Dashboard</h1>
              <p>Overview of all support tickets across the network.</p>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {userEmail && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> {userEmail}
              </div>
            )}
            <form action={logout}>
              <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                 Sign Out
              </button>
            </form>
            {mounted && (
              <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme (Dark/Light)">
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Link href="/tickets/new" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Plus size={18} /> Create Ticket
              </button>
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div 
            className={`stat-card animate-fade-in delay-1 ${statusFilter === 'ALL' ? 'active-filter' : ''}`} 
            onClick={() => setStatusFilter("ALL")}
            style={{ cursor: "pointer", border: statusFilter === 'ALL' ? '2px solid var(--primary)' : undefined }}
            title="Click to view all tickets"
          >
             <div className="stat-card-header">
                <div className="stat-title">ทั้งหมด</div>
                <div className="stat-icon-container" style={{ background: 'var(--primary-glow)' }}>
                  <LayoutDashboard size={20} color="var(--primary)" />
                </div>
             </div>
            <div className="stat-value">{total}</div>
          </div>
          <div 
            className={`stat-card animate-fade-in delay-2 ${statusFilter === 'Pending' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter("Pending")}
            style={{ cursor: "pointer", border: statusFilter === 'Pending' ? '2px solid var(--status-pending-text)' : undefined }}
            title="Click to view Pending tickets"
          >
             <div className="stat-card-header">
                <div className="stat-title" style={{color: "var(--status-pending-text)"}}>งานใหม่</div>
                <div className="stat-icon-container" style={{ background: 'var(--status-pending-bg)' }}>
                  <PlusCircle size={20} color="var(--status-pending-text)" />
                </div>
             </div>
            <div className="stat-value">{pending}</div>
          </div>
          <div 
            className={`stat-card animate-fade-in delay-3 ${statusFilter === 'In Progress' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter("In Progress")}
            style={{ cursor: "pointer", border: statusFilter === 'In Progress' ? '2px solid var(--status-progress-text)' : undefined }}
            title="Click to view In Progress tickets"
          >
             <div className="stat-card-header">
                <div className="stat-title" style={{color: "var(--status-progress-text)"}}>กำลังดำเนินการ</div>
                <div className="stat-icon-container" style={{ background: 'var(--status-progress-bg)' }}>
                  <Activity size={20} color="var(--status-progress-text)" />
                </div>
             </div>
            <div className="stat-value">{inProgress}</div>
          </div>
          <div 
            className={`stat-card animate-fade-in delay-3 ${statusFilter === 'Escalated' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter("Escalated")}
            style={{ cursor: "pointer", border: statusFilter === 'Escalated' ? '2px solid var(--status-escalated-text)' : undefined }}
            title="Click to view Escalated tickets"
          >
             <div className="stat-card-header">
                <div className="stat-title" style={{color: "var(--status-escalated-text)"}}>ส่งต่องาน</div>
                <div className="stat-icon-container" style={{ background: 'var(--status-escalated-bg)' }}>
                  <ArrowUp size={20} color="var(--status-escalated-text)" />
                </div>
             </div>
            <div className="stat-value">{escalated}</div>
          </div>
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
                <h3 style={{ margin: 0, color: "var(--status-escalated-text)", fontSize: "1.2rem" }}>มีงานใหม่รอผู้รับผิดชอบ (New Unassigned Jobs)</h3>
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
                Recent Tickets 
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
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
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
                    Ticket No. {renderSortIcon('ticket_no')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('description')}>
                    Description {renderSortIcon('description')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('hospitalName')}>
                    Hospital/User {renderSortIcon('hospitalName')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Status/Priority {renderSortIcon('status')}
                  </th>
                  <th>
                    Assignee
                  </th>
                  <th className="sortable" onClick={() => handleSort('created_at')}>
                    SLA Status {renderSortIcon('created_at')}
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
        </main>
       {toast.show && (
        <div className="toast-notification">
           <Info size={18} /> {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
