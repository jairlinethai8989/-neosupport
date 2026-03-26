"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
  Image as ImageIcon, 
  Info, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Camera,
  Video,
  FileText,
  Paperclip,
  X,
  Plus
} from "lucide-react";
import ImageAnnotationModal from "@/app/tickets/[id]/components/ImageAnnotationModal";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function LiffChatPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [ticket, setTicket] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [annotationImage, setAnnotationImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch Ticket Info
      const { data: tData } = await supabase
        .from("tickets")
        .select("*, hospitals(name)")
        .eq("id", ticketId)
        .single();
      if (tData) setTicket(tData);

      // Fetch Messages
      const { data: mData } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (mData) setMessages(mData);
      
      scrollToBottom();
    };

    fetchInitialData();

    // Real-time Subscription
    const channel = supabase
      .channel(`liff-chat-${ticketId}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `ticket_id=eq.${ticketId}` 
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content,
      direction: "inbound", // Customer side
      created_at: new Date().toISOString(),
      message_type: "text"
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Logic: Save message to DB
      const { error } = await supabase.from("messages").insert({
        ticket_id: ticketId,
        content,
        direction: "inbound",
        message_type: "text",
        status: "sent"
      });
      if (error) throw error;
    } catch {
      // Rollback optimistic update on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (re) => setAnnotationImage(re.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      await uploadAttachment(file);
    }
    // Reset input
    e.target.value = "";
  };

  const uploadAttachment = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(fileName);

      let msgType = "file";
      if (file.type.startsWith("image/")) msgType = "image";
      else if (file.type.startsWith("video/")) msgType = "video";

      const { error: dbError } = await supabase.from("messages").insert({
        ticket_id: ticketId,
        content: publicUrl,
        message_type: msgType,
        direction: "inbound",
        status: "sent"
      });

      if (dbError) throw dbError;
    } catch (err) {
      alert("Error uploading file. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
      setAnnotationImage(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "Pending": return { label: "รอดำเนินการ", color: "#f59e0b", icon: <Clock size={14} /> };
      case "In Progress": return { label: "กำลังดำเนินการ", color: "#006ce4", icon: <CheckCircle2 size={14} /> };
      case "Resolved": return { label: "แก้ไขแล้ว", color: "#10b981", icon: <CheckCircle2 size={14} /> };
      default: return { label: status, color: "#64748b", icon: <Info size={14} /> };
    }
  };

  if (!ticket) return <div className="loading">กำลังเตรียมห้องแชท... (SECURE_SYNC)</div>;

  const status = getStatusInfo(ticket.status);
  const displayTicketNo = ticket.ticket_no;
  const displayHospital = ticket.hospitals?.name || "หน่วยงานทั่วไป";
  const displayCategory = ticket.issue_type || "General";

  return (
    <div className="chat-container animate-fade-in">
      
      {/* Dynamic Header (Glassmorphism) */}
      <header className="chat-header">
        <div className="header-top">
           <button onClick={() => router.push("/liff/menu")} className="btn-icon">
              <ArrowLeft size={20} />
           </button>
           <div className="ticket-meta">
              <span className="ticket-no">#{displayTicketNo}</span>
              <h1 className="hospital-name">{displayHospital}</h1>
           </div>
           <button className="btn-icon">
              <MoreVertical size={20} />
           </button>
        </div>
        <div className="header-status">
           <div className="status-badge" style={{ backgroundColor: status.color + '15', color: status.color }}>
              {status.icon}
              <span>{status.label}</span>
           </div>
           <div className="divider" />
           <span className="category-label">{displayCategory}</span>
        </div>
      </header>

      {/* Messages Feed */}
      <main className="messages-feed">
        <div className="welcome-notice">
           <div className="info-icon-box">
              <Info size={16} />
           </div>
           <p>คุณกำลังคุยกับเจ้าหน้าที่ IT Support<br/>ใบงานของคุณคือ <strong>#{displayTicketNo}</strong></p>
        </div>

        {messages.map((msg) => {
          if (msg.message_type === 'system') {
            return (
              <div key={msg.id} className="system-notice-wrapper">
                 <div className="system-notice-pill">
                    <p>{msg.content}</p>
                 </div>
              </div>
            );
          }

          const isStaff = msg.direction === 'outbound';
          const isFile = msg.message_type === 'file';
          const isImage = msg.message_type === 'image';
          const isVideo = msg.message_type === 'video';

          return (
            <div key={msg.id} className={`message-wrapper ${isStaff ? 'staff' : 'user'}`}>
               <div className="message-bubble">
                  {isImage && (
                    <div className="image-container">
                      <img src={msg.content} alt="Attachment" className="chat-image" onClick={() => window.open(msg.content, '_blank')} />
                    </div>
                  )}
                  {isVideo && (
                    <video controls className="chat-video">
                      <source src={msg.content} />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {isFile && (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="file-attachment-pill">
                      <FileText size={20} />
                      <div className="file-info">
                         <span className="file-name">ไฟล์แนบจาก{isStaff ? 'เจ้าหน้าที่' : 'คุณ'}</span>
                         <span className="file-action">คลิกเพื่อดาวน์โหลด</span>
                      </div>
                    </a>
                  )}
                  {msg.message_type === 'text' && <p>{msg.content}</p>}
                  
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
               </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Attachment Menu Popover */}
      {showAttachmentMenu && (
        <div className="attachment-overlay" onClick={() => setShowAttachmentMenu(false)}>
           <div className="attachment-menu animate-slide-up" onClick={e => e.stopPropagation()}>
              <button className="menu-item" onClick={handleFileSelect}>
                 <div className="menu-icon" style={{ background: '#006ce4' }}><Camera size={20} /></div>
                 <span>ถ่ายรูป / อัปโหลดรูป</span>
              </button>
              <button className="menu-item" onClick={handleFileSelect}>
                 <div className="menu-icon" style={{ background: '#f59e0b' }}><Video size={20} /></div>
                 <span>ส่งวิดีโอ</span>
              </button>
              <button className="menu-item" onClick={handleFileSelect}>
                 <div className="menu-icon" style={{ background: '#10b981' }}><Paperclip size={20} /></div>
                 <span>ส่งไฟล์เอกสาร</span>
              </button>
           </div>
        </div>
      )}

      {/* Image Annotation Modal */}
      {annotationImage && (
        <ImageAnnotationModal 
          imageUrl={annotationImage}
          onClose={() => setAnnotationImage(null)}
          onSend={uploadAttachment}
        />
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
        accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />

      {/* Persistent Footer Input */}
      <footer className="chat-footer">
        <form onSubmit={handleSend} className="input-container">
           <button 
             type="button" 
             className={`btn-add ${showAttachmentMenu ? 'rotated' : ''}`}
             onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
           >
              <Plus size={24} />
           </button>
           <input 
             type="text" 
             placeholder={isUploading ? "กำลังอัปโหลดไฟล์..." : "พิมพ์ข้อความที่นี่..."}
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             className="minimal-input"
             disabled={isUploading}
           />
           <button 
             type="submit" 
             disabled={(!inputText.trim() && !isUploading) || isSending || isUploading}
             className={`btn-send ${(inputText.trim() || isUploading) ? 'active' : ''}`}
           >
              {isSending ? <div className="spinner-mini" /> : <Send size={20} />}
           </button>
        </form>
      </footer>

      <style jsx>{`
        .chat-container { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
        
        .chat-header {
          background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid #f1f5f9; padding: 1rem 1.25rem; z-index: 100;
        }
        .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .ticket-meta { text-align: center; }
        .ticket-no { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .hospital-name { font-size: 1rem; font-weight: 800; color: var(--text-heading); margin-top: 2px; }
        .btn-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #64748b; border-radius: 12px; }
        .btn-icon:active { background: #f1f5f9; }

        .header-status { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
        .status-badge { display: flex; align-items: center; gap: 6px; padding: 0.4rem 0.85rem; border-radius: 12px; font-size: 0.75rem; font-weight: 850; }
        .divider { width: 4px; height: 4px; background: #cbd5e1; border-radius: 50%; }
        .category-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; }

        .messages-feed { flex: 1; overflow-y: auto; padding: 1.5rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .welcome-notice { text-align: center; margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .info-icon-box { background: #f1f5f9; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .welcome-notice p { font-size: 0.8rem; color: #94a3b8; line-height: 1.6; font-weight: 500; }

        .message-wrapper { display: flex; width: 100%; margin: 2px 0; }
        .message-bubble { 
          max-width: 75%; padding: 0.85rem 1.1rem; border-radius: 22px; position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .message-bubble p { font-size: 0.95rem; line-height: 1.5; font-weight: 500; color: inherit; }
        .message-time { font-size: 0.6rem; opacity: 0.5; margin-top: 6px; display: block; text-align: right; font-weight: 700; }

        .user { justify-content: flex-end; }
        .user .message-bubble { background: white; color: var(--text-heading); border-bottom-right-radius: 4px; border: 1px solid #f1f5f9; }

        .system-notice-wrapper { display: flex; justify-content: center; margin: 1.5rem 0; width: 100%; }
        .system-notice-pill { 
          background: #f1f5f9; padding: 0.6rem 1.25rem; border-radius: 20px; 
          max-width: 85%; border: 1px dashed #cbd5e1;
        }
        .system-notice-pill p { font-size: 0.75rem; color: #64748b; text-align: center; font-weight: 600; line-height: 1.6; }

        .staff { justify-content: flex-start; }
        .staff .message-bubble { background: #006ce4; color: white; border-bottom-left-radius: 4px; box-shadow: 0 8px 16px rgba(0, 108, 228, 0.15); }
        .staff .message-time { color: rgba(255,255,255,0.7); }

        .chat-footer { background: white; border-top: 1px solid #f1f5f9; padding: 1rem 1.25rem 2rem; }
        .input-container { display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; padding: 0.5rem; border-radius: 24px; border: 1px solid #f1f5f9; }
        .btn-add { width: 40px; height: 40px; border-radius: 18px; border: none; background: transparent; color: #94a3b8; display: flex; align-items: center; justify-content: center; }
        .minimal-input { flex: 1; background: transparent; border: none; padding: 0.5rem; font-size: 1rem; font-weight: 600; color: var(--text-heading); outline: none; }
        .btn-send { 
          width: 42px; height: 42px; border-radius: 18px; border: none; background: #e2e8f0; color: white;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .btn-send.active { background: #006ce4; box-shadow: 0 8px 16px rgba(0, 108, 228, 0.2); }
        .btn-send:active { transform: scale(0.9); }

        .loading { display: flex; align-items: center; justify-content: center; height: 100vh; font-weight: 800; color: #94a3b8; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
