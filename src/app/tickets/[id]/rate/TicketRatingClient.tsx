"use client";

import { useState } from "react";
import { Star, CheckCircle, Heart, MessageSquare } from "lucide-react";

export default function TicketRatingClient({ ticketNo, ticketId }: { ticketNo: string; ticketId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/tickets/${ticketId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
      if (resp.ok) setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rating-container animate-fade-in" style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div className="success-icon-container" style={{ width: "80px", height: "80px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem" }}>
          <Heart size={40} className="text-done" style={{ color: "var(--status-done-text)" }} />
        </div>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ขอบคุณสำหรับคะแนนประเมิน!</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>ความคิดเห็นของคุณช่วยให้เราพัฒนาบริการให้ดียิ่งขึ้น</p>
      </div>
    );
  }

  return (
    <div className="rating-card animate-fade-in" style={{ maxWidth: "500px", margin: "4rem auto", padding: "2.5rem", background: "var(--bg-surface)", backdropFilter: "blur(20px)", borderRadius: "30px", border: "1px solid var(--border-color)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ display: "inline-block", padding: "0.5rem 1.2rem", background: "var(--status-done-bg)", color: "var(--status-done-text)", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          งานแจ้งซ่อมเรียบร้อยแล้ว
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>ให้คะแนนความพึงพอใจ</h1>
        <p style={{ color: "var(--text-muted)" }}>เลขที่งาน: <span style={{ color: "var(--primary)", fontWeight: 700 }}>{ticketNo}</span></p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "2.5rem" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{ transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)", transform: (hover || rating) >= star ? "scale(1.2)" : "scale(1)" }}
          >
            <Star
              size={star === 3 ? 48 : 42}
              fill={(hover || rating) >= star ? "#f59e0b" : "transparent"}
              color={(hover || rating) >= star ? "#f59e0b" : "var(--text-muted)"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-main)" }}>
          <MessageSquare size={18} color="var(--primary)" /> ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="บอกเราหน่อยว่าเราทำได้ดีตรงไหน หรือควรปรับปรุงอะไร..."
          style={{ width: "100%", height: "120px", padding: "1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "16px", color: "white", outline: "none", resize: "none", transition: "border-color 0.3s" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="btn-primary"
        style={{ width: "100%", padding: "1.1rem", borderRadius: "16px", fontSize: "1.1rem", fontWeight: 700, background: rating === 0 ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))", boxShadow: rating === 0 ? "none" : "0 10px 25px var(--primary-glow)", position: "relative", overflow: "hidden" }}
      >
        {isSubmitting ? "กำลังส่ง..." : "ส่งคะแนนประเมิน"}
      </button>
      
      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        ทุกคะแนนของคุณมีความหมายต่อเรา
      </p>
    </div>
  );
}
