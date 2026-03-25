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
    <div className="bg-[#f0f9ff] border border-[#bae6fd] p-8 rounded-2xl shadow-inner-sm">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={20} className="text-[#0ea5e9] animate-pulse" />
        <h3 className="text-xl font-bold text-[#0369a1]">อัปเดตงาน (Action Center)</h3>
      </div>
      
      <p className="text-sm text-[#075985] mb-6">กรอกสรุปการแก้ไขปัญหาด้านล่างเพื่อทำการ **&quot;ปิดงาน&quot;** ใบงานชิ้นนี้</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-[#0c4a6e] uppercase tracking-wider block">สรุปการซ่อม / วิธีแก้ไขปัญหา (Resolution Notes) *</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-100 p-4 rounded-xl border-2 border-[#bae6fd] bg-white text-[#0f172a] focus:border-[#0284c7] focus:ring-4 focus:ring-[#bae6fd] transition-all outline-none text-md placeholder-[#94a3b8]"
            placeholder="เช่น: ติดตั้งไดรเวอร์ใหม่ / เปลี่ยนสายไฟจอภาพ..."
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] p-4 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-bounce-in">
             <AlertTriangle size={18} />
             {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-100 bg-[#0284c7] hover:bg-[#0369a1] text-white py-5 rounded-xl font-black text-lg shadow-lg hover:shadow-[#0284c7]40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
        >
          {isSubmitting ? (
             <div className="spinner-border animate-spin w-6 h-6 border-4 border-t-white border-transparent rounded-full" />
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              บันทึกและปิดงาน (SUBMIT_RESOLVE)
            </div>
          )}
        </button>

        <p className="text-center text-[10px] text-[#64748b] font-bold">
          <Clock size={10} className="inline mr-1" />
          การกดปุ่มนี้จะส่งผลลัพธ์ไปยังเจ้าหน้าที่ IT ทันที
        </p>
      </form>
    </div>
  );
}
