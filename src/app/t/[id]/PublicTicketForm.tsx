"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function PublicTicketForm({ ticketId, currentTicketId }: { ticketId: string, currentTicketId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError("กรุณาระบุรายละเอียดการซ่อม (Resolution Notes)");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (res.ok) {
        // Success! Refresh the page to show Resolved state
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "ไม่สามารถอัปเดตงานได้ โปรดลองอีกครั้ง");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการติดต่อระบบ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-blue-50/50 border border-blue-100 p-8 md:p-10 rounded-3xl transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
          <Zap size={20} fill="currentColor" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">ส่งมอบผลลัพธ์ (Resolution Center)</h3>
          <p className="text-sm text-slate-500 font-medium">กรอกสรุปการแก้ไขปัญหาเพื่อทำการปิดงานชิ้นนี้</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-1">สรุปการแก้ไข / วิธีการ (Resolution Notes) *</label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-lg placeholder-slate-300 font-medium leading-relaxed"
            placeholder="อธิบายสิ่งที่คุณทำ... เช่น ติดตั้งไดรเวอร์ใหม่ / แก้ไขสายสัญญาณ"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
             <AlertTriangle size={20} />
             {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !notes.trim()}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.97]
              ${isSubmitting || !notes.trim() 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
              }`}
          >
            {isSubmitting ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={22} />
                บันทึกและส่งมอบงาน (Complete Task)
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 flex items-center justify-center gap-2">
            <Clock size={12} />
            ผลลัพธ์จะถูกส่งไปยังระบบส่วนกลางทันทีที่กดบันทึก
          </p>
        </div>
      </form>
    </div>
  );
}
