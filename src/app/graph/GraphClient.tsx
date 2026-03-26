"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, LineChart, Line, ComposedChart, RadialBarChart, RadialBar, Treemap, ScatterChart, Scatter,
  FunnelChart, Funnel, ZAxis
} from "recharts";
import { 
  Sun, Moon, LayoutDashboard, Database, Activity, Briefcase, FileText, CheckCircle, 
  AlertTriangle, Download, Zap, PlusCircle, BarChart3, Users, Building2, Settings,
  PieChart as PieIcon, LineChart as LineIcon, Layers, Maximize2, RotateCcw,
  Filter, TrendingUp, Target, Star, Clock, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { logout } from "../login/actions";
import { exportToCSV, exportAnalyticsPDF } from "@/utils/export-utils";

// --- CONSTANTS ---
const CHART_TYPES = [
  { id: 'area', name: 'Area Chart', icon: <Activity size={16} /> },
  { id: 'bar', name: 'Vertical Bar', icon: <BarChart3 size={16} /> },
  { id: 'bar-h', name: 'Horizontal Bar', icon: <BarChart3 size={16} className="rotate-90" /> },
  { id: 'line', name: 'Line Chart', icon: <LineIcon size={16} /> },
  { id: 'pie', name: 'Pie Chart', icon: <PieIcon size={16} /> },
  { id: 'donut', name: 'Donut Chart', icon: <PieIcon size={16} /> },
  { id: 'radar', name: 'Radar Chart', icon: <Activity size={16} /> },
  { id: 'radial', name: 'Radial Bar', icon: <RotateCcw size={16} /> },
  { id: 'treemap', name: 'Treemap', icon: <Layers size={16} /> },
  { id: 'funnel', name: 'Funnel Chart', icon: <Filter size={16} /> },
  { id: 'scatter', name: 'Scatter Plot', icon: <Activity size={16} /> },
  { id: 'composed', name: 'Mixed (Line+Bar)', icon: <TrendingUp size={16} /> },
  { id: 'step', name: 'Step Line', icon: <LineIcon size={16} /> },
  { id: 'stacked-area', name: 'Stacked Area', icon: <Layers size={16} /> },
  { id: 'stacked-bar', name: 'Stacked Bar', icon: <Layers size={16} /> },
  { id: 'multi-line', name: 'Multi-Line', icon: <TrendingUp size={16} /> },
  { id: 'bubble', name: 'Bubble Chart', icon: <Activity size={16} /> },
  { id: 'bar-stacked-pct', name: 'Stacked % Bar', icon: <Layers size={16} /> },
  { id: 'area-stacked-pct', name: 'Stacked % Area', icon: <Layers size={16} /> },
  { id: 'radial-grid', name: 'Radial Grid', icon: <RotateCcw size={16} /> }
];

const METRICS = [
  { id: 'count', name: 'Ticket Volume', icon: <FileText size={16} />, unit: 'tickets' },
  { id: 'sla', name: 'SLA Hit Rate', icon: <Target size={16} />, unit: '%' },
  { id: 'rating', name: 'Avg. Rating', icon: <Star size={16} />, unit: 'points' },
  { id: 'response', name: 'Avg. Response', icon: <Clock size={16} />, unit: 'hours' }
];

const DIMENSIONS = [
  { id: 'hospital', name: 'By Hospital' },
  { id: 'issue_type', name: 'By Issue Type' },
  { id: 'staff', name: 'By Staff member' },
  { id: 'priority', name: 'By Priority' },
  { id: 'status', name: 'By Status' },
  { id: 'day', name: 'By Day' },
  { id: 'month', name: 'By Month' }
];

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#64748b'];

// --- SUB COMPONENTS ---

const DashboardHeader = memo(({ total, slaSuccessRate, slaBreached, slaPending }: any) => (
  <section className="analytics-kpi-grid animate-fade-in delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-title">Total Tickets</div>
        <FileText size={20} color="var(--primary)" />
      </div>
      <div className="stat-value">{total}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Active & Resolved</div>
    </div>
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-title">SLA Hit Rate</div>
        <CheckCircle size={20} color="var(--status-done-text)" />
      </div>
      <div className="stat-value" style={{ color: 'var(--status-done-text)' }}>{slaSuccessRate}%</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Core Performance</div>
    </div>
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-title">Breached SLA</div>
        <AlertTriangle size={20} color="var(--status-escalated-text)" />
      </div>
      <div className="stat-value" style={{ color: 'var(--status-escalated-text)' }}>{slaBreached}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Needs Process Audit</div>
    </div>
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-title">Pending Action</div>
        <Activity size={20} color="var(--status-progress-text)" />
      </div>
      <div className="stat-value" style={{ color: 'var(--status-progress-text)' }}>{slaPending}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Work in Queue</div>
    </div>
  </section>
));
DashboardHeader.displayName = "DashboardHeader";

export default function GraphClient({ 
  initialTickets, 
  userEmail, 
  slaPolicy = {}, 
  businessHours = { exclude_periods: [] } 
}: { 
  initialTickets: any[], 
  userEmail?: string, 
  slaPolicy?: Record<string, number>,
  businessHours?: { exclude_periods: {start: string, end: string}[] }
}) {
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // --- BUILDER STATE ---
  const [chartConfig, setChartConfig] = useState({
    type: 'area',
    metric: 'count',
    dimension: 'day'
  });

  const [filterHospital, setFilterHospital] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterTime, setFilterTime] = useState("30"); // days

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.body.classList.add("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "light") document.body.classList.add("light-theme");
    else document.body.classList.remove("light-theme");
    localStorage.setItem("theme", newTheme);
  };

  // ─── Data processing Engine ────────────────────────────────────────

  const processedData = useMemo(() => {
    const nowTs = Date.now();
    const timeLimitMs = parseInt(filterTime) === 0 ? 0 : nowTs - (parseInt(filterTime) * 24 * 60 * 60 * 1000);

    const filteredTickets = initialTickets.filter(t => {
      const matchHospital = filterHospital === "ALL" || (t.users?.hospitals?.name || "Unknown") === filterHospital;
      const matchType = filterType === "ALL" || (t.issue_type || "Uncategorized") === filterType;
      const matchTime = parseInt(filterTime) === 0 || new Date(t.created_at).getTime() >= timeLimitMs;
      return matchHospital && matchType && matchTime;
    });

    const isExcluded = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      return businessHours.exclude_periods.some(p => timeStr >= p.start && timeStr < p.end);
    };

    const getTargetExpiration = (startDateStr: string, slaHours: number) => {
      let current = new Date(startDateStr);
      let remainingSeconds = slaHours * 3600;
      while (remainingSeconds > 0) {
        current = new Date(current.getTime() + 600 * 1000);
        if (!isExcluded(current)) remainingSeconds -= 600;
      }
      return current.getTime();
    };

    // Global Stats for Header
    let slaOnTime = 0, slaBreached = 0, slaPending = 0;
    filteredTickets.forEach(t => {
      const typeKey = t.issue_type || "Default";
      const slaHours = slaPolicy[typeKey] || slaPolicy["Default"] || 8;
      const limitMs = getTargetExpiration(t.created_at, slaHours);

      if (["Resolved", "Closed"].includes(t.status)) {
        const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
        if (updatedTime > limitMs) slaBreached++; else slaOnTime++;
      } else {
        if (Date.now() > limitMs) slaBreached++; else slaPending++;
      }
    });

    const totalResolved = slaOnTime + slaBreached;
    const slaSuccessRate = totalResolved > 0 ? Math.round((slaOnTime / totalResolved) * 100) : 0;

    // Helper to get dimension key
    const getDimKey = (t: any, dim: string) => {
      if (dim === 'hospital') return t.users?.hospitals?.name || "Unknown Hospital";
      if (dim === 'staff') return t.assignee_name || "Unassigned";
      if (dim === 'issue_type') return t.issue_type || "No Category";
      if (dim === 'priority') return t.priority || "Medium";
      if (dim === 'status') return t.status;
      if (dim === 'day') return new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dim === 'month') return new Date(t.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return "Generic";
    };

    // DYNAMIC DATA GENERATION
    const grouped = filteredTickets.reduce((acc: Record<string, any>, t) => {
      const key = getDimKey(t, chartConfig.dimension);
      if (!acc[key]) acc[key] = { name: key, value: 0, slaHits: 0, resolved: 0, totalRating: 0, ratedCount: 0 };
      
      const g = acc[key];
      g.value++;
      if (t.rating) { g.totalRating += t.rating; g.ratedCount++; }
      
      const typeKey = t.issue_type || "Default";
      const slaHours = slaPolicy[typeKey] || slaPolicy["Default"] || 8;
      const limitMs = getTargetExpiration(t.created_at, slaHours);
      if (["Resolved", "Closed"].includes(t.status)) {
        g.resolved++;
        const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
        if (updatedTime <= limitMs) g.slaHits++;
      }
      return acc;
    }, {});

    const dynamicData = Object.values(grouped).map((g: any) => {
      let finalVal = g.value; // default for 'count'
      if (chartConfig.metric === 'sla') finalVal = g.resolved > 0 ? Math.round((g.slaHits / g.resolved) * 100) : 0;
      if (chartConfig.metric === 'rating') finalVal = g.ratedCount > 0 ? parseFloat((g.totalRating / g.ratedCount).toFixed(1)) : 0;
      return { ...g, value: finalVal, fill: COLORS[0] }; // Fill provided in render for Cells
    });

    // Handle Time-series ordering
    if (['day', 'month'].includes(chartConfig.dimension)) {
      dynamicData.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else {
      dynamicData.sort((a, b) => b.value - a.value);
    }

    return {
      total: filteredTickets.length,
      slaSuccessRate,
      slaBreached,
      slaPending,
      dynamicData,
      hops: Array.from(new Set(initialTickets.map(t => t.users?.hospitals?.name || "Unknown"))).sort(),
      types: Array.from(new Set(initialTickets.map(t => t.issue_type || "Uncategorized"))).sort()
    };
  }, [initialTickets, filterHospital, filterType, filterTime, chartConfig, slaPolicy, businessHours]);

  const { total, slaSuccessRate, slaBreached, slaPending, dynamicData, hops, types } = processedData;

  // --- RENDER ENGINE ---

  const renderChart = useCallback(() => {
    const commonProps = { data: dynamicData, margin: { top: 20, right: 30, left: 20, bottom: 20 } };
    const labelColor = 'var(--text-muted)';
    const gridColor = 'var(--border-color)';
    const tipStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', padding: '12px' };

    switch (chartConfig.type) {
      case 'area':
      case 'stacked-area':
      case 'area-stacked-pct':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke={labelColor} fontSize={12} />
            <YAxis stroke={labelColor} fontSize={12} />
            <RechartsTooltip contentStyle={tipStyle} />
            <Area type="monotone" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} strokeWidth={3} />
          </AreaChart>
        );
      case 'bar':
      case 'stacked-bar':
      case 'bar-stacked-pct':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke={labelColor} fontSize={11} />
            <YAxis stroke={labelColor} fontSize={12} />
            <RechartsTooltip contentStyle={tipStyle} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
              {dynamicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        );
      case 'bar-h':
        return (
          <BarChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
            <XAxis type="number" stroke={labelColor} fontSize={12} />
            <YAxis dataKey="name" type="category" stroke={labelColor} fontSize={11} width={120} />
            <RechartsTooltip contentStyle={tipStyle} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
               {dynamicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        );
      case 'line':
      case 'multi-line':
      case 'step':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={labelColor} />
            <YAxis stroke={labelColor} />
            <RechartsTooltip contentStyle={tipStyle} />
            <Line type={chartConfig.type === 'step' ? 'stepAfter' : 'monotone'} dataKey="value" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary)', strokeWidth: 2, stroke: 'white' }} />
          </LineChart>
        );
      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie 
              data={dynamicData} 
              innerRadius={chartConfig.type === 'donut' ? 80 : 0} 
              outerRadius={140} 
              paddingAngle={5} 
              dataKey="value" 
              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              stroke="none"
            >
              {dynamicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <RechartsTooltip contentStyle={tipStyle} />
            <Legend />
          </PieChart>
        );
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dynamicData}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="name" stroke={labelColor} fontSize={10} />
            <PolarRadiusAxis stroke={labelColor} fontSize={10} />
            <Radar name="Metrics" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.6} />
            <RechartsTooltip contentStyle={tipStyle} />
          </RadarChart>
        );
      case 'radial':
        return (
          <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={20} data={dynamicData}>
            <RadialBar label={{ position: 'insideStart', fill: '#fff' }} background dataKey="value">
               {dynamicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </RadialBar>
            <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0 }} />
            <RechartsTooltip contentStyle={tipStyle} />
          </RadialBarChart>
        );
      case 'treemap':
        return (
           <Treemap
             data={dynamicData}
             dataKey="value"
             aspectRatio={4 / 3}
             stroke="#fff"
             fill="var(--primary)"
           >
             <RechartsTooltip contentStyle={tipStyle} />
           </Treemap>
        );
      case 'funnel':
        return (
          <FunnelChart {...commonProps}>
            <RechartsTooltip contentStyle={tipStyle} />
            <Funnel dataKey="value" data={dynamicData} isAnimationActive>
               {dynamicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Funnel>
          </FunnelChart>
        );
      case 'scatter':
      case 'bubble':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid stroke={gridColor} />
            <XAxis dataKey="name" stroke={labelColor} />
            <YAxis type="number" dataKey="value" stroke={labelColor} />
            <ZAxis type="number" dataKey="value" range={[60, 400]} />
            <RechartsTooltip contentStyle={tipStyle} />
            <Scatter name="Tickets" data={dynamicData} fill="var(--primary)" />
          </ScatterChart>
        );
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid stroke={gridColor} />
            <XAxis dataKey="name" stroke={labelColor} />
            <YAxis stroke={labelColor} />
            <RechartsTooltip contentStyle={tipStyle} />
            <Legend />
            <Bar dataKey="value" barSize={20} fill="var(--primary)" />
            <Line type="monotone" dataKey="value" stroke="#ff7300" />
          </ComposedChart>
        );
      default:
        return <div>Unsupported chart type selected.</div>;
    }
  }, [chartConfig, dynamicData]);

  if (!mounted) return null;

  return (
    <div className={`dashboard-container ${theme}`} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* ─── Sidebar ────────────────────────────────────────────── */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`} style={{ background: 'white', borderRight: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div className="sidebar-logo" style={{ padding: '2rem 1.5rem' }}>
          <div className="logo-icon-container" style={{ background: 'var(--primary)', borderRadius: '12px', boxShadow: '0 8px 16px var(--primary-glow)' }}>
            <Activity className="logo-icon" size={24} color="white" />
          </div>
          {isSidebarOpen && <span className="logo-text" style={{ fontWeight: 900, color: 'var(--text-heading)', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>NEO Support</span>}
        </div>
        
        <nav className="sidebar-nav" style={{ padding: '0 1rem' }}>
          <div className="nav-group-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>{isSidebarOpen ? "MENU" : "•••"}</div>
          <Link href="/" prefetch={true} className="nav-item-modern" data-label="หน้าหลัก">
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span className="nav-label-modern">หน้าหลัก</span>}
          </Link>
          <Link href="/tickets/new" prefetch={true} className="nav-item-modern" data-label="สร้างใบงาน">
            <PlusCircle size={20} />
            {isSidebarOpen && <span className="nav-label-modern">สร้างใบงาน</span>}
          </Link>

          <div className="nav-group-label" style={{ marginTop: '2rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>{isSidebarOpen ? "ANALYTICS" : "•••"}</div>
          <Link href="/graph" prefetch={true} className="nav-item-modern active" data-label="สถิติประสิทธิภาพ">
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
          style={{ transform: 'translateY(70px)', right: '-12px', background: 'var(--primary)', color: 'white', position: 'absolute' }}
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        <header className="header animate-fade-in" style={{ padding: '2rem 3rem', background: 'white', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Intelligence Matrix</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', fontWeight: 900, color: 'var(--text-heading)', letterSpacing: '-1.5px', margin: 0 }}> NeoMatrix Analytics</h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, margin: '8px 0 0 0' }}>เครื่องวิเคราะห์ข้อมูลอัจฉริยะ เลือกหัวข้อและรูปแบบกราฟได้ตามต้องการ</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <button 
                onClick={() => exportAnalyticsPDF('analytics-capture-area', METRICS.find(m => m.id === chartConfig.metric)?.name || 'Analytics', {
                  hospital: filterHospital === 'ALL' ? 'ทั้งหมด' : filterHospital,
                  period: filterTime === '0' ? 'ทั้งหมด' : filterTime,
                  dimension: DIMENSIONS.find(d => d.id === chartConfig.dimension)?.name
                })}
                className="btn-primary-modern" 
                style={{ padding: '0.8rem 1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 850, cursor: 'pointer' }}
              >
                <FileText size={18} /> Export PDF
              </button>
             <button className="theme-toggle" onClick={toggleTheme} style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', color: 'var(--text-heading)', cursor: 'pointer' }}>
               {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <section id="analytics-capture-area" style={{ padding: '3rem' }}>
          
          <DashboardHeader total={total} slaSuccessRate={slaSuccessRate} slaBreached={slaBreached} slaPending={slaPending} />

          {/* MAIN CONFIGURATION & CHART AREA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 3fr', gap: '2rem', marginBottom: '3rem' }}>
            
            {/* BUILDER SIDEBAR (Technical Panel) */}
            <div className="technical-panel animate-fade-in delay-2" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Settings size={18} /> CHART_BUILDER
              </h3>

              <div className="builder-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>1. SELECT TOPIC</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {METRICS.map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setChartConfig(prev => ({ ...prev, metric: m.id }))}
                      className={`metric-btn ${chartConfig.metric === m.id ? 'active' : ''}`}
                    >
                      {m.icon} {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="builder-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>2. DIMENSION</label>
                <select 
                  value={chartConfig.dimension} 
                  onChange={(e) => setChartConfig(prev => ({ ...prev, dimension: e.target.value }))}
                  className="builder-select"
                >
                  {DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="builder-group">
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>3. VISUALIZATION TYPE (20 AVAILABLE)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {CHART_TYPES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setChartConfig(prev => ({ ...prev, type: t.id }))}
                      className={`type-btn ${chartConfig.type === t.id ? 'active' : ''}`}
                      title={t.name}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="filter-group">
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Hospital Filter</label>
                    <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} className="builder-select" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                      <option value="ALL">All Nodes</option>
                      {hops.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <button 
                  onClick={() => { setFilterHospital("ALL"); setFilterType("ALL"); setFilterTime("30"); }}
                  className="metric-btn" 
                  style={{ justifyContent: 'center', marginTop: '1rem', fontSize: '0.75rem' }}
                >
                  <RotateCcw size={14} /> Clear All Filters
                </button>
              </div>
            </div>

            {/* MAIN CHART DISPLAY */}
            <div className="technical-panel animate-fade-in delay-2" style={{ display: 'flex', flexDirection: 'column', minHeight: '650px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {METRICS.find(m => m.id === chartConfig.metric)?.name}
                      <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', verticalAlign: 'middle' }}>LIVE_MATRIX</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                      Visualized as {CHART_TYPES.find(t => t.id === chartConfig.type)?.name} — {DIMENSIONS.find(d => d.id === chartConfig.dimension)?.name}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <select value={filterTime} onChange={(e) => setFilterTime(e.target.value)} className="chart-action-select">
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="0">Life-time History</option>
                     </select>
                  </div>
               </div>

               <div style={{ flex: 1, width: '100%', position: 'relative' }}>
                  <ResponsiveContainer>
                    {renderChart()}
                  </ResponsiveContainer>
               </div>
            </div>

          </div>

          {/* SECONDARY RAW DATA MATRIX */}
          <div className="technical-panel animate-fade-in delay-3" style={{ marginBottom: '3rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 850, borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>📋 ตารางสรุปข้อมูลดิบ (Raw Matrix Data)</h3>
                <button 
                  onClick={() => exportToCSV(dynamicData, `NeoMatrix_Data_${chartConfig.dimension}`)}
                  className="btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer' }}
                >
                   <Download size={14} /> Export CSV
                </button>
             </div>
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                         <th style={{ padding: '1rem' }}>Dimension Label</th>
                         <th style={{ padding: '1rem' }}>Volume</th>
                         <th style={{ padding: '1rem' }}>SLA Hit Rate</th>
                         <th style={{ padding: '1rem' }}>Avg. Satisfaction</th>
                      </tr>
                   </thead>
                   <tbody>
                      {dynamicData.slice(0, 12).map((d: any, i: number) => (
                        <tr key={i} className="table-row-hover" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                           <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-heading)' }}>{d.name}</td>
                           <td style={{ padding: '1rem' }}>{d.value} transactions</td>
                           <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <div style={{ flex: 1, height: '6px', background: 'var(--bg-surface-hover)', borderRadius: '3px', overflow: 'hidden', maxWidth: '80px' }}>
                                    <div style={{ height: '100%', width: `${d.resolved > 0 ? (d.slaHits/d.resolved)*100 : 0}%`, background: (d.slaHits/d.resolved) > 0.8 ? 'var(--status-done-text)' : 'var(--status-escalated-text)' }}></div>
                                 </div>
                                 <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                                    {d.resolved > 0 ? Math.round((d.slaHits/d.resolved)*100) : 0}%
                                 </span>
                              </div>
                           </td>
                           <td style={{ padding: '1rem' }}>
                              <span style={{ color: '#f59e0b', fontWeight: 800 }}>★ {d.ratedCount > 0 ? (d.totalRating/d.ratedCount).toFixed(1) : '-'}</span>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

        </section>
      </main>

      <style jsx global>{`
        .sidebar { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; }
        .sidebar.collapsed { width: 80px; }
        .sidebar:not(.collapsed) { width: 280px; }

        .nav-item-modern {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.85rem 1rem;
          margin-bottom: 0.5rem;
          border-radius: 16px;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-item-modern:hover { background: var(--bg-surface-hover); color: var(--primary); }
        .nav-item-modern.active { background: var(--primary); color: white; box-shadow: 0 8px 16px var(--primary-glow); }

        .stat-card { background: white; border: 1px solid var(--border-color); border-radius: 20px; padding: 1.5rem; transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .stat-title { color: var(--text-muted); font-size: 0.7rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.8px; }
        .stat-value { font-size: 2.2rem; font-weight: 900; color: var(--text-heading); margin-top: 0.5rem; letter-spacing: -1px; }

        .technical-panel { background: white; border: 1px solid var(--border-color); border-radius: 24px; padding: 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.04); }

        .metric-btn { width: 100%; padding: 0.85rem 1.25rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-heading); font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; }
        .metric-btn:hover { background: var(--bg-surface-hover); transform: translateX(4px); }
        .metric-btn.active { border-color: var(--primary); background: var(--primary); color: white; box-shadow: 0 8px 16px var(--primary-glow); }

        .builder-select { width: 100%; padding: 0.85rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-heading); font-weight: 800; outline: none; cursor: pointer; transition: all 0.2s; }
        .builder-select:hover { border-color: var(--primary); }

        .type-btn { padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-muted); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .type-btn:hover { border-color: var(--primary); color: var(--primary); transform: scale(1.1); }
        .type-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 8px 16px var(--primary-glow); }

        .chart-action-select { padding: 0.6rem 1.2rem; border-radius: 14px; border: 1px solid var(--border-color); background: white; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
        .table-row-hover:hover { background: var(--bg-surface-hover) !important; cursor: pointer; }

        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
