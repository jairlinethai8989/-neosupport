"use client";

import { useState, useEffect, useMemo, memo } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend
} from "recharts";
import { Sun, Moon, LayoutDashboard, Database, Activity, Briefcase, FileText, CheckCircle, AlertTriangle, Download, Zap } from "lucide-react";
import { logout } from "../login/actions";

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

  // ─── Data processing ──────────────────────────────────────────────

  const processedData = useMemo(() => {
    // 1. SLA Calculation
    let slaOnTime = 0;
    let slaBreached = 0;
    let slaPending = 0;

    // Helper to check if a specific timestamp falls into excluded periods
    const isExcluded = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      return businessHours.exclude_periods.some(p => timeStr >= p.start && timeStr < p.end);
    };

    // Helper to calculate target expiration date by skipping excluded hours
    const getTargetExpiration = (startDateStr: string, slaHours: number) => {
      let current = new Date(startDateStr);
      let remainingSeconds = slaHours * 3600;
      const stepSeconds = 600; // 10 min steps for calculation speed

      while (remainingSeconds > 0) {
        current = new Date(current.getTime() + stepSeconds * 1000);
        if (!isExcluded(current)) {
          remainingSeconds -= stepSeconds;
        }
        // Safety: max 14 days
        if (current.getTime() - new Date(startDateStr).getTime() > 14 * 24 * 60 * 60 * 1000) break;
      }
      return current.getTime();
    };

    initialTickets.forEach(t => {
      // 1. Skip SLA calculation for Escalated tickets (Exempt)
      if (t.status === "Escalated") return;

      const typeKey = t.issue_type || "Default";
      const slaHours = slaPolicy[typeKey] || slaPolicy["Default"] || 8;
      const limitMs = getTargetExpiration(t.created_at, slaHours);

      if (["Resolved", "Closed"].includes(t.status)) {
        const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
        if (updatedTime > limitMs) slaBreached++;
        else slaOnTime++;
      } else {
        // Pending ticket: check if already breached
        if (Date.now() > limitMs) slaBreached++;
        else slaPending++;
      }
    });

    const totalResolved = slaOnTime + slaBreached;
    const slaSuccessRate = totalResolved > 0 ? Math.round((slaOnTime / totalResolved) * 100) : 0;

    const slaData = [
      { name: "SLA Achieved", value: slaOnTime, fill: "#10b981" },
      { name: "SLA Breached", value: slaBreached, fill: "#ef4444" }
    ].filter(d => d.value > 0);

    // 2. Department Data
    const deptCounts = initialTickets.reduce((acc, t) => { 
      const n = t.users?.hospitals?.name || "Unknown"; 
      acc[n] = (acc[n] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>);
    
    const colors = ['#6366f1', '#d946ef', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
    const departmentData = Object.keys(deptCounts)
      .map((k, i) => ({ name: k, value: deptCounts[k], fill: colors[i % colors.length] }))
      .sort((a,b) => b.value - a.value);

    // 3. Issue Types
    const typeCounts = initialTickets.reduce((acc, t) => { 
      const typ = t.issue_type || "Uncategorized";
      acc[typ] = (acc[typ] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>);
    const typeData = Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));

    // 4. Trend (Last 14 days)
    const dailyDataObj = initialTickets.reduce((acc, t) => {
      const date = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dailyData = Object.keys(dailyDataObj).map(date => ({ date, count: dailyDataObj[date] })).reverse().slice(-14);

    // 5. Staff Performance
    interface StaffStat {
      name: string;
      total: number;
      resolved: number;
      achieved: number;
      breached: number;
      ratings: number[];
    }

    const staffStatsObj = initialTickets.reduce((acc: Record<string, StaffStat>, t) => {
      const staff = t.assignee_name || "Unassigned";
      if (!acc[staff]) {
        acc[staff] = { name: staff, total: 0, resolved: 0, achieved: 0, breached: 0, ratings: [] };
      }
      
      const currentStaff = acc[staff];
      currentStaff.total++;
      if (t.rating) currentStaff.ratings.push(t.rating);
      
      const typeKey = t.issue_type || "Default";
      const slaHours = slaPolicy[typeKey] || slaPolicy["Default"] || 8;
      const limitMs = getTargetExpiration(t.created_at, slaHours);

      if (["Resolved", "Closed"].includes(t.status)) {
        currentStaff.resolved++;
        const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
        if (updatedTime > limitMs) currentStaff.breached++;
        else currentStaff.achieved++;
      }
      return acc;
    }, {} as Record<string, StaffStat>);

    const staffData = Object.values(staffStatsObj)
      .map((s: any) => ({
        ...s,
        successRate: s.resolved > 0 ? Math.round((s.achieved / s.resolved) * 100) : 0,
        avgRating: s.ratings.length > 0 ? (s.ratings.reduce((a: number, b: number) => a + b, 0) / s.ratings.length).toFixed(1) : "N/A"
      }))
      .sort((a, b) => b.resolved - a.resolved);

    // 6. Hospital Performance
    interface HospStat {
      name: string;
      total: number;
      resolved: number;
      achieved: number;
      breached: number;
      ratings: number[];
    }

    const hospStatsObj = initialTickets.reduce((acc: Record<string, HospStat>, t) => {
      const hospital = t.users?.hospitals?.name || "Unknown Hospital";
      if (!acc[hospital]) {
        acc[hospital] = { name: hospital, total: 0, resolved: 0, achieved: 0, breached: 0, ratings: [] };
      }
      
      const currentHosp = acc[hospital];
      currentHosp.total++;
      if (t.rating) currentHosp.ratings.push(t.rating);
      
      const typeKey = t.issue_type || "Default";
      const slaHours = slaPolicy[typeKey] || slaPolicy["Default"] || 8;
      const limitMs = getTargetExpiration(t.created_at, slaHours);

      if (["Resolved", "Closed"].includes(t.status)) {
        currentHosp.resolved++;
        const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
        if (updatedTime > limitMs) currentHosp.breached++;
        else currentHosp.achieved++;
      }
      return acc;
    }, {} as Record<string, HospStat>);

    const hospitalStats = Object.values(hospStatsObj)
      .map((h: any) => ({
        ...h,
        successRate: h.resolved > 0 ? Math.round((h.achieved / h.resolved) * 100) : 0,
        avgRating: h.ratings.length > 0 ? (h.ratings.reduce((a: number, b: number) => a + b, 0) / h.ratings.length).toFixed(1) : "N/A"
      }))
      .sort((a, b) => b.total - a.total);

    return {
      total: initialTickets.length,
      slaOnTime, slaBreached, slaPending,
      totalResolved, slaSuccessRate,
      slaData, departmentData, typeData, dailyData, staffData, hospitalStats
    };
  }, [initialTickets, slaPolicy, businessHours]);

  const { total, slaBreached, slaPending, totalResolved, slaSuccessRate, slaData, departmentData, typeData, dailyData, staffData, hospitalStats } = processedData;

  // Custom tooltips
  const CustomTooltip = memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
          <p style={{ color: 'var(--text-heading)', fontWeight: 'bold', marginBottom: '4px' }}>{label || payload[0].name}</p>
          <p style={{ color: payload[0].payload.fill || 'var(--primary)', fontSize: '0.9rem' }}>Count: <span style={{ fontWeight: 'bold' }}>{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  });

  if (!mounted) return null;

  return (
    <div className={`dashboard-container ${theme}`} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* ─── Sidebar ────────────────────────────────────────────── */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon-container">
            <Activity className="logo-icon" size={24} />
          </div>
          {isSidebarOpen && <span className="logo-text">NEO Support</span>}
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/" className="nav-item">
            <LayoutDashboard size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">Dashboard</span>}
          </Link>
          <Link href="/graph" className="nav-item active">
            <Database size={20} className="nav-icon" />
            {isSidebarOpen && <span className="nav-label">Analytics</span>}
          </Link>
        </nav>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
        <header className="header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Performance Analytics</h1>
            <p style={{ color: 'var(--text-muted)' }}>Executive overview of ticket volumes, efficiency, and queue load.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => window.open('/api/reports/export', '_blank')}
              className="btn-primary" 
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            >
              <Download size={18} /> Export Excel
            </button>
            <button className="theme-toggle" onClick={toggleTheme} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' }}>
              {theme === 'dark' ? <Sun size={20} color="var(--text-muted)"/> : <Moon size={20} color="var(--text-muted)"/>}
            </button>
            <form action={logout}>
              <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-heading)'}}>
                Sign Out
              </button>
            </form>
          </div>
        </header>

        {/* ─── KPI Cards ────────────────────────────────────────── */}
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
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Of {totalResolved} resolved tickets</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-title">Breached SLA</div>
              <AlertTriangle size={20} color="var(--status-escalated-text)" />
            </div>
            <div className="stat-value" style={{ color: 'var(--status-escalated-text)' }}>{slaBreached}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tickets missed target</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-title">Pending Tasks</div>
              <Briefcase size={20} color="var(--status-progress-text)" />
            </div>
            <div className="stat-value" style={{ color: 'var(--status-progress-text)' }}>{slaPending}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Needs attention</div>
          </div>

        </section>

        {/* ─── Charts Grid ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }} className="charts-main-grid">
          
          {/* Trend Chart - Large */}
          <div className="chart-block animate-fade-in delay-2" style={{ gridColumn: '1 / -1', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>📈 Ticket Volume Trend (Last 14 Days)</h2>
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer>
                <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fontSize: 12}} />
                  <YAxis stroke="var(--text-muted)" tick={{fontSize: 12}} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Bar Chart */}
          <div className="chart-block animate-fade-in delay-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>🏥 Tickets by Queue / Hospital</h2>
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer>
                <BarChart data={departmentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 11}} width={120} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                    {departmentData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA Distribution Pie Chart */}
          <div className="chart-block animate-fade-in delay-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>⏱️ SLA Compliance (Resolved)</h2>
            <div style={{ width: '100%', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={slaData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
                    {slaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hospital Statistics Table */}
          <div className="chart-block animate-fade-in delay-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>🏛️ Hospital Impact & SLA Overview</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Hospital Name</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Total Volume</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Resolved</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>SLA Rate</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Rating ⭐️</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalStats.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--text-heading)' }}>{h.name}</td>
                      <td style={{ padding: '14px 12px' }}>{h.total}</td>
                      <td style={{ padding: '14px 12px' }}>{h.resolved}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, minWidth: '40px' }}>{h.successRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>{h.avgRating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="chart-block animate-fade-in delay-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>👥 Staff Performance Overview</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Staff Name</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Assigned</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Resolved</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>SLA Rate</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem' }}>Rating ⭐️</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--text-heading)' }}>{s.name}</td>
                      <td style={{ padding: '14px 12px' }}>{s.total}</td>
                      <td style={{ padding: '14px 12px' }}>{s.resolved}</td>
                      <td style={{ padding: '14px 12px' }}>
                         <span style={{ fontWeight: 700 }}>{s.successRate}%</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>{s.avgRating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      <style jsx global>{`
        .nav-item { cursor: pointer; transition: all 0.3s ease; }
        .nav-item:hover { transform: translateX(5px); background: rgba(255,255,255,0.05); }
        .nav-item.active { background: var(--primary) !important; color: white !important; box-shadow: 0 10px 20px -5px var(--primary-glow); }
        .stat-card { background: var(--bg-surface); backdrop-filter: var(--glass-blur); border: 1px solid var(--border-color); border-radius: 20px; padding: 1.5rem; position: relative; overflow: hidden; transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
        .chart-block { transition: all 0.3s ease; }
        .chart-block:hover { border-color: rgba(255,255,255,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .charts-main-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 1100px) {
          .charts-main-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
