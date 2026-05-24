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
import { motion, AnimatePresence } from "framer-motion";

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

// Helper functions for new TicketRow
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'In Progress': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'Resolved': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'Closed': return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    case 'Escalated': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    case 'High': return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    case 'Medium': return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    case 'Low': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }
};

const TicketRow = ({ t }: { t: any }) => {
  const router = useRouter();
  const statusColor = getStatusColor(t.status);
  const priorityColor = getPriorityColor(t.priority);
  const hospitalName = t.users?.hospitals?.name || "Unknown";
  const userName = t.users?.display_name || "Unknown";

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formattedDate = new Date(t.created_at).toLocaleTimeString('th-TH', { 
    hour: '2-digit', minute: '2-digit' 
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.002, backgroundColor: "rgba(255, 255, 255, 0.4)" }}
      onClick={() => router.push(`/tickets/${t.id}`)}
      className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-5 mb-3 rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md shadow-sm transition-all cursor-pointer"
    >
      {/* 1. ID & Type */}
      <div className="flex flex-col min-w-[140px]">
        <span className="text-xs font-bold text-slate-400 tracking-wider">#{t.ticket_no}</span>
        <span className="text-sm font-semibold text-slate-700">{t.issue_type || "PB"}</span>
      </div>

      {/* 2. Customer Info */}
      <div className="flex flex-col flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Hospital className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-800">{hospitalName}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">{userName}</span>
        </div>
      </div>

      {/* 3. Description Item */}
      <div className="flex flex-col flex-[2] min-w-[250px]">
        <p className="text-sm text-slate-600 line-clamp-1 font-medium group-hover:text-blue-600 transition-colors">
          {t.description}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-tight">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>เริ่มต้น: {formattedDate}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            <span>เปิดมาแล้ว {timeSince(t.created_at)}</span>
          </div>
        </div>
      </div>

      {/* 4. Assignee */}
      <div className="min-w-[150px]">
        {t.assignee_name ? (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                {t.assignee_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold">{t.assignee_name}</span>
           </div>
        ) : (
          <span className="text-xs text-slate-300 italic font-medium px-3">ยังไม่มีผู้รับงาน</span>
        )}
      </div>

      {/* 5. Priority & Status */}
      <div className="flex items-center gap-3 min-w-[180px] justify-end">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border}`}>
          {t.priority}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${statusColor.bg} ${statusColor.text}`}>
          {t.status === 'Pending' ? 'งานใหม่' : t.status === 'In Progress' ? 'กำลังทำ' : t.status}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
};

// Removed TicketCard component as it's replaced by the new TicketRow

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
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [lineStatus, setLineStatus] = useState<"Online" | "Offline" | "Degraded">("Online");
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

    const fetchAIInsights = async () => {
       try {
         const res = await fetch('/api/ai/insights');
         const data = await res.json();
         if (data && !data.message) setAiInsights(data);
       } catch (e) { console.error("Failed to fetch AI Insights"); }
    };
    fetchAIInsights();
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      const res = await fetch('/api/ai/insights', { method: 'POST' });
      const data = await res.json();
      if (data) setAiInsights(data);
      showToast("อัปเดตข้อมูลเชิงลึก AI สำเร็จ ✨");
    } catch {
      showToast("ไม่สามารถอัปเดต AI Insights ได้");
    } finally {
      setIsRefreshingInsights(false);
    }
  };

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
              <div style={{ padding: '0 1rem 1.5rem 1rem' }}>
                 <div style={{ background: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>LINE WEBHOOK</span>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: lineStatus === 'Online' ? '#10b981' : '#ef4444', boxShadow: lineStatus === 'Online' ? '0 0 10px #10b981' : 'none' }}></div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 850, color: 'var(--text-heading)' }}>{lineStatus}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time Sync Active</div>
                 </div>
              </div>
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

        <section className="summary-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', padding: '0 3rem', marginBottom: '3rem' }}>
          {[
            { label: "ใบงานทั้งหมด", sub: "Total Tickets", value: total, color: "var(--primary)", desc: "จาก 12 สาขาหลัก", icon: <Inbox size={22} /> },
            { label: "รอดำเนินการ", sub: "Waiting Response", value: pending, color: "var(--status-pending-text)", desc: "เฉลี่ยรอนาน 14 นาที", icon: <Clock size={22} /> },
            { label: "กำลังแก้ไข", sub: "Active Operations", value: inProgress, color: "var(--status-progress-text)", desc: "กำลังทำโดยคุณ 3 งาน", icon: <Zap size={22} /> },
            { label: "ยังไม่รับงาน", sub: "Urgent Attention", value: unassignedCount, color: "var(--status-escalated-text)", desc: "ต้องการคนรับผิดชอบทันที", icon: <AlertTriangle size={22} />, glow: unassignedCount > 0 }
          ].map((m, i) => (
            <div key={i} className="technical-panel" style={{ 
              padding: '2.5rem', 
              borderRadius: '40px', 
              border: m.glow ? `2px solid ${m.color}` : '1px solid var(--border-color)', 
              background: 'white', 
              boxShadow: m.glow ? `0 20px 40px ${m.color}15` : 'var(--shadow-premium)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {m.glow && <div className="animate-pulse" style={{ position: 'absolute', top: '1rem', right: '1rem', width: '8px', height: '8px', borderRadius: '50%', background: m.color }}></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ padding: '14px', borderRadius: '20px', background: `${m.color}10`, color: m.color }}>
                  {m.icon}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>{m.sub}</div>
                  <div style={{ fontSize: '3.5rem', fontWeight: 950, color: 'var(--text-heading)', letterSpacing: '-2px', lineHeight: 1 }}>{m.value}</div>
                </div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-heading)', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.desc}</div>
            </div>
          ))}
        </section>

        {/* AI Executive Insights Section */}
        <section className="animate-fade-in delay-1" style={{ padding: '0 3rem', marginBottom: '3rem' }}>
           <div style={{ 
             background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
             borderRadius: '48px', 
             padding: '3.5rem',
             color: 'white',
             boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
             position: 'relative',
             overflow: 'hidden'
           }}>
              {/* Background Decoration */}
              <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent)', borderRadius: '50%' }}></div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px', boxShadow: '0 0 20px var(--primary-glow)' }}>
                        <Zap size={24} fill="white" color="white" />
                     </div>
                     <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-1px', margin: 0 }}>Executive AI Intelligence</h2>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '4px 0 0 0' }}>AI-driven analysis of support trends and strategic efficiency</p>
                     </div>
                  </div>
                  <button 
                    onClick={handleRefreshInsights}
                    disabled={isRefreshingInsights}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1.5rem', borderRadius: '16px', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Activity size={16} /> {isRefreshingInsights ? "ANALYZING..." : "RE-ANALYZE DATA"}
                  </button>
                </div>

                {aiInsights ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '4rem' }}>
                    <div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '2rem', color: '#f1f5f9' }}>
                          &quot;{aiInsights.summary}&quot;
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Efficiency Insight</div>
                             <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>{aiInsights.efficiency_insight}</p>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Strategic Recommendation</div>
                             <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>{aiInsights.recommendation}</p>
                          </div>
                       </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '32px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 850 }}>Trending Issues</span>
                          <span style={{ padding: '4px 12px', background: aiInsights.risk_level === 'High' ? '#ef4444' : '#10b981', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 900 }}>RISK: {aiInsights.risk_level}</span>
                       </div>
                       {aiInsights.top_issues?.map((issue: any, idx: number) => (
                         <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{issue.title}</span>
                            <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{issue.count} tickets</span>
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '32px' }}>
                     <div style={{ textAlign: 'center' }}>
                        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem auto' }}></div>
                        <p style={{ color: '#94a3b8', fontWeight: 600 }}>Initialising Executive Intelligence...</p>
                     </div>
                  </div>
                )}
              </div>
           </div>
        </section>

        <section className="hud-content" style={{ width: '100%', maxWidth: 'none' }}>
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
        {/* Tickets List Area */}
        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white p-8 lg:p-10 shadow-xl mt-10">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
            <h2 className="flex items-center gap-4 text-2xl font-black text-slate-800 tracking-tighter">
              <Activity className="w-8 h-8 text-blue-500" />
              <span>รายการใบงานล่าสุด <span className="text-slate-300 ml-2">/ Recent Tickets</span></span>
            </h2>

            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
               <button 
                onClick={() => setIsSmartView(!isSmartView)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all border-2 ${
                  isSmartView 
                  ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                {isSmartView ? '✨ Smart View: ON' : '📁 All History'}
              </button>

              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                <button 
                  onClick={() => exportTicketsPDF(sortedTickets, "IT_Report")}
                  className="px-5 py-2 hover:bg-white text-slate-500 hover:text-red-500 rounded-xl text-xs font-black transition-all"
                >
                  PDF
                </button>
                <button 
                  onClick={() => exportToCSV(sortedTickets, "IT_Report")}
                  className="px-5 py-2 hover:bg-white text-slate-500 hover:text-emerald-500 rounded-xl text-xs font-black transition-all"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-10">
            <div className="lg:col-span-8 relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-all" />
              <input 
                type="text" 
                placeholder="ค้นหาเลขที่ Ticket, ชื่อนามสกุล, หรือโรงพยาบาล..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/50 border-2 border-slate-100 focus:border-blue-400 focus:bg-white focus:ring-8 focus:ring-blue-400/5 rounded-2xl py-4 pl-16 pr-8 outline-none transition-all font-bold text-slate-700 shadow-sm"
              />
            </div>

            <div className="lg:col-span-4 flex gap-3">
              <select 
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="flex-1 bg-white/50 border-2 border-slate-100 rounded-2xl px-6 focus:border-blue-400 outline-none font-bold text-slate-600 shadow-sm"
              >
                <option value="ALL">ทุกโรงพยาบาล</option>
                {allHospitals.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>

              {(statusFilter !== "ALL" || selectedHospital !== "ALL" || searchQuery !== "") && (
                <button 
                  onClick={() => { setStatusFilter("ALL"); setSelectedHospital("ALL"); setSearchQuery(""); }}
                  className="w-14 h-14 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Structured Ticket List */}
          <div className="space-y-4 pb-12">
            <AnimatePresence mode="popLayout">
              {sortedTickets.length > 0 ? (
                sortedTickets.map((t) => (
                  <TicketRow key={t.id} t={t} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-24 bg-slate-50/50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                  <Inbox className="w-16 h-16 text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
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
