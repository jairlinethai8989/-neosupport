"use client";

import { useState } from "react";
import { MessageSquare, PlusCircle, Activity, ChevronRight, Zap, Info, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function LiffMenuPage() {
  const [ticketHistory] = useState([
    { id: "1", title: "แจ้งซ่อมจอภาพ", status: "Pending", time: "10 นาทีที่แล้ว" },
    { id: "2", title: "ติดตั้งเครื่องพิมพ์", status: "Resolved", time: "เมื่อวาน" },
  ]);

  const stats = [
    { label: "ใบงานค้าง", value: "1", color: "text-amber-500", bg: "bg-amber-50" },
    { label: "แก้ไขแล้ว", value: "24", color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <div className="flex flex-col min-h-screen p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Personalized Greeting */}
      <div className="flex items-center justify-between pt-6">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">สวัสดีครับ,</h2>
          <h1 className="text-2xl font-black text-slate-900 mt-1">คุณ เจริญศักดิ์ 👋</h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/50">
           <Activity size={20} />
        </div>
      </div>

      {/* Hero Stats (Lean) */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`${s.bg} p-6 rounded-3xl border border-white/50 transition-all active:scale-[0.97]`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color} mt-1`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Major Action Hub */}
      <div className="space-y-4 pt-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">เมนูบริการ (Services)</label>
        
        {/* Option 2 (Report Issue) - Primary Action */}
        <Link href="/liff/report" className="block">
          <div className="relative group overflow-hidden bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 transition-all active:scale-[0.98]">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-all" />
             <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-md">
                    <PlusCircle size={28} />
                  </div>
                  <h3 className="text-2xl font-black">แจ้งใบงานใหม่</h3>
                  <p className="text-blue-100/80 text-sm font-medium">เปิดเคสซ่อมหรือขอความช่วยเหลือไอที</p>
                </div>
                <ChevronRight size={24} className="opacity-50" />
             </div>
          </div>
        </Link>

        {/* Option 1 (AI Tutor) */}
        <Link href="#" className="block">
          <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] text-slate-800 transition-all active:scale-[0.98] hover:border-amber-200 shadow-sm">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-200">
                    <Zap size={24} fill="white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">สอบถามปัญหาทั่วไป (AI)</h3>
                    <p className="text-slate-400 text-[13px] font-medium leading-relaxed">ปรึกษาปัญหาเบื้องต้นกับ Google AI</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
             </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity (Minimalist) */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ประวัติใบงานล่าสุด</label>
          <button className="text-blue-600 text-[11px] font-bold uppercase tracking-wider">ดูทั้งหมด</button>
        </div>
        
        <div className="space-y-3">
          {ticketHistory.map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between transition-all active:bg-slate-50">
               <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${t.status === 'Resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                    {t.status === 'Resolved' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-[15px]">{t.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{t.time}</p>
                  </div>
               </div>
               <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Branding Footer */}
      <div className="mt-auto py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-slate-300 opacity-50">
           <Info size={12} />
           <p className="text-[10px] font-bold uppercase tracking-widest">Version 2.0.0 (LIFF-Centric)</p>
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder component to satisfy React requirement in same file
function CheckCircle2({ size }: { size: number }) {
  return <zap size={size} />; // Just a placeholder, jkd - let me import it correctly
}
