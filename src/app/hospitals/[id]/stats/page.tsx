"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { ArrowLeft, Activity, MapPin, Clock, AlertCircle, Users, Download, FileText, Image as ImageIcon } from "lucide-react";
import { exportToCSV, exportToImage } from "@/utils/export-utils";

function HospitalStats() {
  const params = useParams();
  const router = useRouter();
  const hospitalId = params?.id as string;
  
  const [hospital, setHospital] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // 🏎️ Parallel Fetch for Hospital & Tickets
      const [hospResult, ticketsResult] = await Promise.all([
        supabase.from("hospitals").select("*").eq("id", hospitalId).single(),
        supabase.from("tickets")
          .select("*, users!inner(*)")
          .eq("users.hospital_id", hospitalId)
          .order('created_at', { ascending: false })
      ]);
      
      if (hospResult.data) setHospital(hospResult.data);
      if (ticketsResult.data) setTickets(ticketsResult.data);
      
      setLoading(false);
    }
    if (hospitalId) loadData();
  }, [hospitalId]);

  // --- Data Processing for Charts ---
  
  // 1. Issues by Type
  const issueTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const type = t.issue_type || "Other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  // 2. Issues by Department (Point of Failure)
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const dept = t.users?.department || "Unknown";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 depts
  }, [tickets]);

  // 3. Time Distribution (24 Hours)
  const timeData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, count: 0 }));
    tickets.forEach(t => {
      const hour = new Date(t.created_at).getHours();
      hours[hour].count++;
    });
    return hours;
  }, [tickets]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return <div style={{ padding: "5rem", textAlign: "center", color: "var(--text-muted)" }}>กำลังวิเคราะห์ข้อมูล...</div>;
  if (!hospital) return <div>ไม่พบข้อมูลโรงพยาบาล</div>;

  return (
    <div style={{ padding: "2rem", backgroundColor: "var(--bg-color)", minHeight: "100vh" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--primary)", cursor: "pointer", marginBottom: "1.5rem", fontWeight: 600 }}>
        <ArrowLeft size={20} /> กลับไปยัง Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>{hospital.name}</h1>
          <p style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={16} /> ข้อมูลการซ่อมบำรุงเชิงลึก (Security & Performance Analytics)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => exportToImage('analytics-content', `Analytics_${hospital.abbreviation}_${new Date().toISOString().split('T')[0]}`)}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem' }}
              >
                <ImageIcon size={14} /> Export Image
              </button>
              <button 
                onClick={() => {
                  const data = tickets.map(t => ({
                    'Ticket No': t.ticket_no,
                    'Dept': t.users?.department,
                    'Description': t.description,
                    'Status': t.status,
                    'Date': new Date(t.created_at).toLocaleString('th-TH')
                  }));
                  exportToCSV(data, `Data_${hospital.abbreviation}`);
                }}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem' }}
              >
                <FileText size={14} /> Export CSV
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--primary)" }}>{tickets.length}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ตั๋วงานทั้งหมด</div>
            </div>
          </div>
        </div>
      </div>

      <div id="analytics-content">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        
        {/* Chart: Issue Types */}
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} color="#ef4444" /> ปัญหาส่วนใหญ่ (Top Issues)
          </h3>
          <div style={{ height: "250px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '0.8rem' }} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Departments */}
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={20} color="#10b981" /> จุดที่เสียบ่อย (Hot Departments)
          </h3>
          <div style={{ height: "250px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
              {deptData.map((d, i) => (
                <div key={i} style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart: Time Trend */}
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--border-color)", gridColumn: "span 2" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock size={20} color="#f59e0b" /> ช่วงเวลาที่แจ้งปัญหาบ่อย (Peak Reporting Hours)
          </h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" interval={2} style={{ fontSize: '0.75rem' }} />
                <YAxis style={{ fontSize: '0.75rem' }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      </div>

      <div style={{ marginTop: "2rem", backgroundColor: "var(--bg-surface)", borderRadius: "20px", padding: "1.5rem", border: "1px solid var(--border-color)" }}>
        <h3 style={{ marginBottom: "1rem" }}>ประวัติการแจ้งซ่อมล่าสุด</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              <th style={{ padding: "1rem" }}>Ticket No.</th>
              <th style={{ padding: "1rem" }}>แผนก</th>
              <th style={{ padding: "1rem" }}>อาการ</th>
              <th style={{ padding: "1rem" }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {tickets.slice(0, 10).map(t => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                <td style={{ padding: "1rem", fontWeight: "bold" }}>{t.ticket_no}</td>
                <td style={{ padding: "1rem" }}>{t.users?.department}</td>
                <td style={{ padding: "1rem", color: "var(--text-main)" }}>{t.description}</td>
                <td style={{ padding: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "20px", backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Analytics...</div>}>
      <HospitalStats />
    </Suspense>
  );
}
