"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function NewTicketClient({ 
  hospitals, 
  initialSettings 
}: { 
  hospitals: any[], 
  initialSettings: any
}) {
  const router = useRouter();
  const theme = typeof window !== 'undefined' ? localStorage.getItem("theme") || "dark" : "dark";

  const [hospitalId, setHospitalId] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: "", show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 3000);
  };

  const compressImage = (file: File): Promise<File | Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => { resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file); }, "image/jpeg", 0.75);
        };
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const selectedHospital = hospitals.find(h => h.id === hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId || !description.trim()) {
      alert("กรุณาเลือกโรงพยาบาลและกรอกรายละเอียด");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (selectedFile) {
        const processedFile = selectedFile.type.startsWith("image/") ? await compressImage(selectedFile) : selectedFile;
        const fileName = `${Date.now()}_manual.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, processedFile, {
             contentType: 'image/jpeg',
             cacheControl: '3600',
             upsert: false
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error(`Upload Error: ${uploadError.message}`);
        }
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          module: initialSettings?.modules?.[0] || "อื่นๆ",
          issue_type: null, // As per request
          description: description.trim(),
          imageUrl
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create ticket");

      showToast(`แจ้งงานสำเร็จ! 📝 หมายเลข: ${data.ticket.ticket_no}`);
      setTimeout(() => router.push(`/`), 1500);
    } catch (err: any) {
      console.error(err);
      showToast("❌ " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`dashboard-container ${theme}`} style={{ minHeight: "100vh" }}>
      <main className="main-content" style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
        <div className="header animate-fade-in" style={{ marginBottom: "2rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "1rem" }}>
            <ArrowLeft size={18} /> กลับหน้าหลัก Dashboard
          </Link>
          <div>
            <h1>➕ สร้างทิคเก็ตใหม่ (Create Ticket)</h1>
            <p>หน้าสำหรับเปิดตั๋วงานใหม่เองของเจ้าหน้าที่</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="settings-panel animate-fade-in delay-1" style={{ padding: "2rem", backgroundColor: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontWeight: "bold", fontSize: "0.95rem" }}>1. เลือกโรงพยาบาล (Hospital) 🏥 *</label>
            <select 
              value={hospitalId} 
              onChange={e => setHospitalId(e.target.value)}
              style={{ padding: "0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "1rem", outline: "none" }}
              required
            >
              <option value="" disabled>-- กรุณาเลือก --</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {selectedHospital && (
              <span style={{ fontSize: "0.85rem", color: "var(--status-done-text)", marginTop: "0.2rem" }}>
                ข้อมูลรหัสคือ: {selectedHospital.abbreviation} (ระบบจะสร้างหมายเลขรันตามขื่อนี้)
              </span>
            )}
          </div>



          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontWeight: "bold", fontSize: "0.95rem" }}>2. ปัญหาที่แจ้ง (Description) *</label>
            <textarea 
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ระบุรายละเอียดปัญหาหรืองานที่ต้องการ..."
              style={{ padding: "0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "1rem", outline: "none", resize: "vertical" }}
              required
            />
          </div>

          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontWeight: "bold", fontSize: "0.95rem" }}>3. แนบรูปภาพ (Optional Photo) 📸</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: "2px dashed var(--border-color)", 
                borderRadius: "12px", 
                padding: "1.5rem", 
                textAlign: "center", 
                cursor: "pointer",
                background: "rgba(255,255,255,0.02)"
              }}
            >
              {previewUrl ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}
                    style={{ position: "absolute", top: "-10px", right: "-10px", background: "var(--status-escalated-text)", color: "white", borderRadius: "50%", padding: "0.2rem" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)" }}>
                  <ImageIcon size={32} style={{ marginBottom: "0.5rem" }} />
                  <p>คลิกเพื่อเลือกรูปภาพ หรือลากมาวาง</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleFileChange} />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !hospitalId}
            className="btn-primary"
            style={{ 
              marginTop: "1rem",
              padding: "1.2rem",
              fontSize: "1.1rem",
              borderRadius: "14px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 10px 20px var(--primary-glow)",
              opacity: (isSubmitting || !hospitalId) ? 0.6 : 1,
              cursor: (isSubmitting || !hospitalId) ? "not-allowed" : "pointer",
            }}
          >
            <Save size={20} />
            {isSubmitting ? "กำลังบันทึกข้อมูล..." : "แจ้งงาน (Open Ticket)"}
          </button>
        </form>
      </main>

      {toast.show && (
        <div className="toast-notification">
           <span>ℹ️</span> {toast.message}
        </div>
      )}
    </div>
  );
}
