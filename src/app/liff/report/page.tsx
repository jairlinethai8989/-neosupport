"use client";

import { useEffect, useState } from "react";
import { 
  Monitor, Keyboard, Globe, Cloud, Palette, HelpCircle, 
  Camera, ArrowRight, ArrowLeft, CheckCircle2, ChevronRight,
  Info, AlertCircle, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiff } from "../components/LiffProvider";
import { createLiffTicket } from "../liffActions";

export default function LiffReportPage() {
  const { user, isRegistered, isLoading: contextLoading } = useLiff();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    priority: "Medium",
    image: null as string | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNo, setTicketNo] = useState<string>("");
  const [createdTicketId, setCreatedTicketId] = useState<string>("");
  const router = useRouter();

  const categories = [
    { id: "software", label: "Software / แอปฯ", icon: <Cloud size={28} />, color: "#3b82f6" },
    { id: "hardware", label: "Hardware / อุปกรณ์", icon: <Monitor size={28} />, color: "#6366f1" },
    { id: "network", label: "Network / อินเทอร์เน็ต", icon: <Globe size={28} />, color: "#0ea5e9" },
    { id: "account", label: "Username / เข้าระบบ", icon: <Palette size={28} />, color: "#f59e0b" },
    { id: "other", label: "อื่นๆ / สอบถาม", icon: <HelpCircle size={28} />, color: "#64748b" },
  ];

  useEffect(() => {
    if (!contextLoading && !isRegistered) {
      router.push("/liff/register");
    }
  }, [contextLoading, isRegistered, router]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    const result = await createLiffTicket({
      reporter_id: user.id,
      hospital_id: user.hospital_id,
      description: `[${formData.category}] ${formData.description}`,
      issue_type: 'PB',
      module: user.department || formData.category
    });

    if (result.success && result.ticket) {
      setTicketNo(result.ticket.ticket_no);
      setCreatedTicketId(result.ticket.id);
      setIsSubmitting(false);
      setStep(4); // Success step
      // Auto-redirect to chat room after 2 seconds
      setTimeout(() => router.push(`/liff/chat/${result.ticket.id}`), 2000);
    } else {
      alert("Error: " + result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-page animate-fade-in">
      
      {/* Header Sticky Container */}
      <div className="sticky-header">
        <div className="header-nav">
          {step < 4 && (
            <button onClick={step === 1 ? () => router.push("/liff/menu") : handleBack} className="btn-back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="title">{step === 4 ? "ส่งงานสำเร็จ" : "แจ้งรายละเอียดใบงาน"}</h1>
          <div className="step-indicator">
             {step < 4 && `${step}/3`}
          </div>
        </div>
        {step < 4 && (
          <div className="progress-bar">
             <div className="progress-fill" style={{ width: `${(step/3)*100}%` }} />
          </div>
        )}
      </div>

      <div className="content-area">
        
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="step-content animate-slide-up">
            <label className="section-label">เลือกหมวดหมู่ปัญหา (Category)</label>
            <div className="category-grid">
              {categories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => { setFormData({...formData, category: cat.label}); handleNext(); }}
                  className={`cat-card ${formData.category === cat.label ? 'active' : ''}`}
                >
                  <div className="icon-circle" style={{ backgroundColor: cat.color + '15', color: cat.color }}>
                    {cat.icon}
                  </div>
                  <span className="cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Description & Image */}
        {step === 2 && (
          <div className="step-content animate-slide-up">
            <label className="section-label text-blue">ระบุรายละเอียดอาการ (Description)</label>
            <div className="form-group">
              <textarea 
                rows={6}
                placeholder="อธิบายปัญหาของคุณสั้นๆ เช่น เปิดโปรแกรมไม่ได้ / จอภาพเป็นลาย..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="minimal-textarea"
                autoFocus
              />
            </div>

            <label className="section-label mt-6">แนบรูปภาพประกอบ (Optional)</label>
            <div className="upload-container">
               <button className="btn-upload">
                  <Camera size={32} />
                  <span>กดเพื่อถ่ายรูป หรือ เลือกจากคลัง</span>
                  <p>ช่วยให้เจ้าหน้าที่วิเคราะห์ปัญหาได้แม่นยำขึ้นครับ</p>
               </button>
            </div>

            <div className="action-footer">
               <button 
                 onClick={handleNext} 
                 disabled={!formData.description.trim()}
                 className="btn-primary"
               >
                 ตรวจทานข้อมูล <ArrowRight size={20} />
               </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="step-content animate-slide-up">
            <label className="section-label">ตรวจสอบข้อมูลใบงาน (Review)</label>
            <div className="review-card">
               <div className="review-item">
                  <span className="item-label">หมวดหมู่</span>
                  <p className="item-value">{formData.category}</p>
               </div>
               <div className="review-item">
                  <span className="item-label">อาการเสีย / รายละเอียด</span>
                  <p className="item-value description">{formData.description}</p>
               </div>
               <div className="review-item">
                  <span className="item-label">ความสำคัญ (Priority)</span>
                  <div className="prio-tag">
                     <div className="prio-dot" /> {formData.priority}
                  </div>
               </div>
            </div>

            <div className="notice-box">
               <Info size={16} className="info-icon" />
               <p>เมื่อคุณกดเปิดใบงาน ระบบจะจัดลำดับความสำคัญและเชื่อมต่อคุณเข้าสู่แชทกับเจ้าหน้าที่ทันทีครับ</p>
            </div>

            <div className="action-footer">
               <button 
                 onClick={handleSubmit} 
                 disabled={isSubmitting}
                 className="btn-confirm"
               >
                 {isSubmitting ? <div className="spinner" /> : <>เปิดใบงานแจ้งซ่อมทันที</>}
               </button>
            </div>
          </div>
        )}

        {/* Step 4: Success Message */}
        {step === 4 && (
          <div className="success-screen animate-fade-in">
             <div className="success-visual">
                <div className="success-ring" />
                <div className="success-icon-box">
                   <CheckCircle2 color="white" size={48} />
                </div>
             </div>
             <h2>รับเรื่องเรียบร้อยแล้วครับ!</h2>
             <p>ใบงานของคุณถูกส่งไปยังระบบส่วนกลางแล้ว <br/>กำลังนำคุณเข้าสู่ห้องแชทอัตโนมัติ...</p>
             
             <div className="success-meta">
                <div className="meta-card">
                   <span>รหัสใบงาน (Ticket ID)</span>
                   <strong>#{ticketNo || "--------"}</strong>
                </div>
             </div>

             <div className="action-footer">
                <button 
                  onClick={() => router.push("/liff/menu")} 
                  className="btn-outline"
                >
                  กลับหน้าหลัก
                </button>
                <button 
                  onClick={() => router.push(`/liff/chat/${createdTicketId}`)} 
                  className="btn-primary-solid"
                >
                  เข้าสู่ห้องแชทติดตามงาน <ChevronRight size={20} />
                </button>
             </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .report-page { min-height: 100vh; background: white; display: flex; flex-direction: column; }
        
        .sticky-header {
          position: sticky; top: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
          z-index: 100; border-bottom: 1px solid #f1f5f9;
        }
        .header-nav { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 1.25rem 1rem; }
        .btn-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; background: #f8fafc; border-radius: 12px; color: #64748b; }
        .title { font-size: 1.25rem; font-weight: 800; color: var(--text-heading); }
        .step-indicator { font-size: 0.8rem; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; }
        
        .progress-bar { height: 3px; background: #f1f5f9; width: 100%; }
        .progress-fill { height: 100%; background: #006ce4; transition: width 0.4s ease-out; }

        .content-area { flex: 1; padding: 2rem 1.5rem; }
        .section-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1.25rem; display: block; }
        .section-label.text-blue { color: #006ce4; }

        .category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .cat-card {
          padding: 1.75rem 1rem; border-radius: 24px; border: 2px solid #f8fafc; background: white;
          display: flex; flex-direction: column; align-items: center; gap: 1rem; transition: all 0.2s;
        }
        .cat-card:active { border-color: #006ce4; background: #f0f7ff; transform: scale(0.97); }
        .icon-circle { width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .cat-label { font-size: 0.9rem; font-weight: 700; color: var(--text-heading); text-align: center; }

        .minimal-textarea {
          width: 100%; padding: 1.25rem; border-radius: 20px; border: 2px solid #f1f5f9;
          background: #fafafa; font-size: 1.1rem; font-weight: 600; color: var(--text-heading);
          outline: none; transition: 0.2s; resize: none; line-height: 1.5;
        }
        .minimal-textarea:focus { border-color: #006ce4; background: white; box-shadow: 0 0 0 4px rgba(0, 108, 228, 0.05); }

        .upload-container { margin-top: 1rem; }
        .btn-upload {
          width: 100%; padding: 2.5rem 1.5rem; border-radius: 24px; border: 2px dashed #e2e8f0;
          background: #f8fafc; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
          transition: 0.2s;
        }
        .btn-upload:active { background: #f1f5f9; border-color: #cbd5e1; }
        .btn-upload span { font-size: 1rem; font-weight: 750; color: #64748b; }
        .btn-upload p { font-size: 0.8rem; font-weight: 500; color: #94a3b8; }

        .review-card { background: #f8fafc; border-radius: 24px; padding: 1.75rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .item-label { font-size: 0.7rem; font-weight: 750; color: #94a3b8; text-transform: uppercase; }
        .item-value { font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin-top: 4px; }
        .item-value.description { font-size: 1rem; font-weight: 600; line-height: 1.5; color: #475569; }
        .prio-tag { display: inline-flex; align-items: center; gap: 8px; background: #fffbeb; color: #d97706; padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.8rem; font-weight: 800; margin-top: 6px; }
        .prio-dot { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; }

        .notice-box { display: flex; gap: 0.75rem; align-items: center; padding: 1.25rem; background: #fffcf0; border-radius: 20px; margin-top: 2rem; border: 1px solid #fef3c7; }
        .notice-box p { font-size: 0.8rem; font-weight: 600; color: #92400e; line-height: 1.5; }
        .info-icon { color: #f59e0b; flex-shrink: 0; }

        .action-footer { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-primary, .btn-confirm, .btn-primary-solid {
          width: 100%; padding: 1.25rem; border-radius: 20px; font-size: 1.1rem; font-weight: 750;
          display: flex; align-items: center; justify-content: center; gap: 0.75rem; border: none; transition: 0.2s; cursor: pointer;
        }
        .btn-primary { background: #006ce4; color: white; box-shadow: 0 10px 20px rgba(0, 108, 228, 0.2); }
        .btn-primary:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; }
        .btn-confirm { background: #10b981; color: white; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
        .btn-primary-solid { background: #006ce4; color: white; }
        .btn-outline { background: white; border: 2px solid #f1f5f9; color: #64748b; padding: 1.25rem; border-radius: 20px; font-size: 1rem; font-weight: 750; }

        .success-screen { text-align: center; padding: 2rem 1rem; }
        .success-visual { position: relative; width: 120px; height: 120px; margin: 0 auto 3rem; }
        .success-ring { position: absolute; inset: -15px; border: 5px solid #f0fdf4; border-radius: 50%; animation: pulse-ring 2s infinite; }
        .success-icon-box { background: #10b981; width: 120px; height: 120px; border-radius: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 40px rgba(16, 185, 129, 0.2); }
        @keyframes pulse-ring { from { opacity: 0.5; transform: scale(0.8); } to { opacity: 0; transform: scale(1.3); } }

        h2 { font-size: 1.6rem; font-weight: 850; margin-bottom: 0.75rem; }
        .success-screen p { font-size: 1rem; color: #94a3b8; line-height: 1.6; font-weight: 500; }
        .success-meta { margin-top: 2.5rem; }
        .meta-card { background: #f8fafc; border-radius: 20px; padding: 1.25rem; display: flex; flex-direction: column; gap: 4px; border: 1px solid #f1f5f9; }
        .meta-card span { font-size: 0.7rem; font-weight: 750; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; }
        .meta-card strong { font-size: 1.25rem; color: #475569; font-weight: 900; }

        .spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
