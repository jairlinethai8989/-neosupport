"use client";

import { useState, useEffect } from "react";
import { User, Hospital, Building2, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Use a simple local state since we don't have LIFF ID in env yet
// But the UI will be full professional

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    hospitalId: "",
    department: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const hospitals = [
    { id: "h1", name: "โรงพยาบาลนางรอง" },
    { id: "h2", name: "โรงพยาบาลประโคนชัย" },
    { id: "h3", name: "โรงพยาบาลเฉลิมพระเกียรติ" },
    { id: "h4", name: "โรงพยาบาลปะคำ" },
    { id: "h5", name: "ศูนย์บริการทางการแพทย์ (อื่นๆ)" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Logic: Save to profiles table
    // For now: Simulation with success state
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Wait a bit then redirect
      setTimeout(() => router.push("/liff/menu"), 1500);
    }, 1200);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-100 p-8 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
           <CheckCircle2 color="white" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">ลงทะเบียนสำเร็จ!</h2>
        <p className="text-slate-500 font-medium">ยินดีต้อนรับเข้าสู่นีโอซัพพอร์ตครับ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-6 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="pt-10 space-y-2">
        <div className="w-12 h-1 bg-blue-600 rounded-full mb-4" />
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ลงทะเบียน<br/>เข้าใช้งานระบบ</h1>
        <p className="text-slate-500 font-medium leading-relaxed">กรุณากรอกข้อมูลเพื่อใช้ในการแจ้งใบงาน<br/>และติดตามสถิติการซ่อมครับ</p>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        
        {/* Full Name Input */}
        <div className="group space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-all group-focus-within:text-blue-600">ชื่อ - นามสกุล *</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <User size={18} />
            </div>
            <input 
              required
              type="text"
              placeholder="กรอกชื่อและนามสกุล..."
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-slate-800 text-lg shadow-sm"
            />
          </div>
        </div>

        {/* Hospital Selector */}
        <div className="group space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-all group-focus-within:text-blue-600">โรงพยาบาล / หน่วยงาน *</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
              <Hospital size={18} />
            </div>
            <select 
              required
              value={formData.hospitalId}
              onChange={(e) => setFormData({...formData, hospitalId: e.target.value})}
              className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none appearance-none transition-all font-medium text-slate-800 text-lg shadow-sm cursor-pointer"
            >
              <option value="" disabled>เลือกโรงพยาบาล...</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ArrowRight size={16} className="rotate-90" />
            </div>
          </div>
        </div>

        {/* Department Input */}
        <div className="group space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-all group-focus-within:text-blue-600">แผนก / วอร์ด *</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Building2 size={18} />
            </div>
            <input 
              required
              type="text"
              placeholder="เช่น ฝั่งบริหาร / หอผู้ป่วยชาย..."
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-slate-800 text-lg shadow-sm"
            />
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
           <ShieldCheck size={18} className="text-blue-600 shrink-0" />
           <p className="text-[13px] text-blue-700 font-medium leading-normal">แอปพลิเคชันจะจดจำตัวตนของคุณผ่าน LINE อัตโนมัติ เพื่อความสะดวกในครั้งถัดไปครับ</p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button 
            type="submit"
            disabled={isSubmitting || !formData.fullName || !formData.hospitalId || !formData.department}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]
              ${isSubmitting || !formData.fullName || !formData.hospitalId || !formData.department
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:shadow-none'
              }`}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>ยืนยันการลงทะเบียน <ArrowRight size={20} /></>
            )}
          </button>
        </div>
      </form>

      {/* Footer Branding */}
      <div className="text-center pb-6">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Secured by NEO Support System</p>
      </div>
    </div>
  );
}
