"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RatingComponent({ ticketId, initialRating }: { ticketId: string, initialRating?: number }) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating || 0);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!initialRating);

  const handleRate = async (value: number) => {
    if (submitted || isSubmitting) return;
    
    setIsSubmitting(true);
    setRating(value);
    
    try {
      const res = await fetch(`/api/public/tickets/${ticketId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value })
      });
      
      if (res.ok) {
        setSubmitted(true);
        router.refresh(); // Update the page state
      } else {
        alert("ขออภัย ไม่สามารถบันทึกคะแนนได้");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-6 border-t border-emerald-100 mt-6 text-center">
      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-4">
        {submitted ? "ขอบคุณที่ประเมินความพึงพอใจ ⭐" : "รบกวนประเมินความพึงพอใจในการให้บริการ"}
      </label>
      
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`transition-all ${!submitted && !isSubmitting ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
            onMouseEnter={() => !submitted && setHover(star)}
            onMouseLeave={() => !submitted && setHover(0)}
            onClick={() => handleRate(star)}
            disabled={submitted || isSubmitting}
          >
            <Star 
              size={36} 
              fill={(hover || rating) >= star ? "#f59e0b" : "none"} 
              color={(hover || rating) >= star ? "#f59e0b" : "#cbd5e1"} 
              strokeWidth={2}
            />
          </button>
        ))}
      </div>
      
      {submitted && (
        <p className="text-emerald-600 text-[11px] font-bold mt-4 animate-in fade-in slide-in-from-bottom-2">
           บันทึกคะแนน {rating} เต็ม 5 เรียบร้อยแล้ว ✨
        </p>
      )}
    </div>
  );
}
