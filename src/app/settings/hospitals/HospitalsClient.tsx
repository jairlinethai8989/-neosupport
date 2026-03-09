"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, RefreshCw, CheckCircle2, ListOrdered, Settings2, Info } from "lucide-react";

export default function HospitalsClient({
  initialHospitals,
  userEmail
}: {
  initialHospitals: any[],
  userEmail?: string
}) {
  const [theme] = useState(
    typeof window !== 'undefined' ? localStorage.getItem("theme") || "dark" : "dark"
  );
  
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(search.toLowerCase()) || 
      h.abbreviation.toLowerCase().includes(search.toLowerCase())
    );
  }, [hospitals, search]);

  const handleUpdate = async (id: string, updates: any) => {
    setLoadingId(id);
    try {
      const res = await fetch("/api/admin/hospitals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates })
      });
      
      if (!res.ok) throw new Error("Failed to update");
      
      setSuccessId(id);
      setTimeout(() => setSuccessId(null), 2000);
      
      // Update local state
      setHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoadingId(null);
    }
  };

  const currentYearMonth = new Date().getFullYear().toString() + (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear().toString();

  return (
    <div className={`dashboard-container ${theme}`}>
      <main className="main-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        
        {/* Header */}
        <div className="header animate-fade-in" style={{ marginBottom: "2rem" }}>
          <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "1rem" }}>
            <ArrowLeft size={18} /> ย้อนกลับไปหน้าตั้งค่า
          </Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ padding: "0.75rem", background: "var(--primary-light)", borderRadius: "12px", color: "var(--primary)" }}>
                    <ListOrdered size={32} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>แก้ไขวิธีรันเลขเอกสาร</h1>
                    <p style={{ color: "var(--text-muted)" }}>ตั้งค่ารูปแบบเลขที่ใบงานและลำดับเลขเริ่มต้นของแต่ละโรงพยาบาล</p>
                </div>
            </div>
            {userEmail && (
              <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "right" }}>
                เข้าใช้งานโดย: <strong>{userEmail}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Search & List */}
        <div className="animate-fade-in delay-2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: "600" }}>📝 ตั้งค่าเลขเริ่มต้นรันเอกสาร</h3>
                <div style={{ position: "relative", width: "300px" }}>
                    <Search size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input 
                        className="search-input"
                        placeholder="ค้นหาโรงพยาบาล..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-card">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {filteredHospitals.map((h) => (
                    <HospitalRow 
                      key={h.id} 
                      hospital={h} 
                      onUpdate={handleUpdate} 
                      isLoading={loadingId === h.id}
                      isSuccess={successId === h.id}
                    />
                  ))}
                  {filteredHospitals.length === 0 && (
                    <tr>
                      <td style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
                        ไม่พบข้อมูลโรงพยาบาลที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </main>

      <style jsx>{`
        .radio-label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            transition: background 0.2s;
        }
        .radio-label:hover {
            background: rgba(255,255,255,0.05);
        }
        .radio-text {
            font-size: 1rem;
            font-weight: 500;
        }
        .format-preview {
            margin-left: 0.5rem;
            background: rgba(0,0,0,0.2);
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-family: monospace;
            color: var(--primary);
            font-size: 0.9rem;
        }
        .search-input {
            width: 100%;
            padding: 0.6rem 1rem 0.6rem 2.5rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background: var(--bg-surface);
            color: var(--text-main);
        }
        .table-card {
            background: var(--bg-surface);
            border-radius: 16px;
            border: 1px solid var(--border-color);
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function HospitalRow({ hospital, onUpdate, isLoading, isSuccess }: any) {
  const [localFormat, setLocalFormat] = useState(hospital.ticket_format_mode || 'default');
  const [nextNum, setNextNum] = useState("");
  const [prefix, setPrefix] = useState(hospital.ticket_prefix || "");

  // Combine prefix if someone manually changed the format just now
  const formatIcon = localFormat === 'ym' ? "📅" : localFormat === 'y' ? "📆" : "🔢";

  return (
    <tr style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }} className="hospital-row">
      <td style={{ padding: "1.25rem", width: "30%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>{formatIcon}</span>
            <div>
                <div style={{ fontWeight: "600", fontSize: "1.05rem" }}>{hospital.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{hospital.abbreviation}</div>
            </div>
        </div>
      </td>
      <td style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
                <input 
                    className="num-input"
                    type="text"
                    placeholder="เลขเริ่มต้น (เช่น INV000001)"
                    value={prefix || nextNum ? (prefix + nextNum) : ""}
                    onChange={(e) => {
                        // For this minimal style, we'll let them set the Next Val
                        setNextNum(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)" }}
                />
            </div>
            <button 
                className="btn-orange"
                disabled={isLoading}
                onClick={() => onUpdate(hospital.id, { 
                    ticket_format_mode: localFormat, // Use hospital's own format
                    ...(nextNum ? { next_number: nextNum } : {})
                })}
            >
                {isLoading ? (
                    <RefreshCw size={18} className="spin" />
                ) : isSuccess ? (
                    <CheckCircle2 size={18} />
                ) : (
                    "ตั้งค่าเลขเริ่มต้น"
                )}
            </button>
        </div>
      </td>

      <style jsx>{`
        .hospital-row:hover {
            background: rgba(255,255,255,0.02);
        }
        .btn-orange {
            background: #f0ad4e;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            min-width: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .btn-orange:hover {
            background: #ec971f;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
        }
        .btn-orange:active {
            transform: translateY(0);
        }
        .btn-orange:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
      `}</style>
    </tr>
  );
}
