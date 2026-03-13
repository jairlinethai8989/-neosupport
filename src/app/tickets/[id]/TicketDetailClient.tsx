"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Image as ImageIcon, Video, X, FileText, Share2, CheckCircle, Pencil, Eraser, RotateCcw, Trash2, Square, Circle, Activity, ChevronLeft, ChevronRight, Hand, ShieldCheck, UserCheck, Clock, Zap, Info, Search, User, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────
// Image Annotation Modal
// ─────────────────────────────────────────────────────────────
type DrawTool = 'pen' | 'eraser' | 'rect' | 'circle';

function ImageAnnotationModal({ imageUrl, onClose, onSend }: {
  imageUrl: string;
  onClose: () => void;
  onSend: (file: File) => Promise<void>;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const snapshotRef  = useRef<ImageData | null>(null);
  const startPosRef  = useRef<{ x: number; y: number } | null>(null);
  const lastPos      = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool]         = useState<DrawTool>('pen');
  const [color, setColor]       = useState('#FF3B30');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory]    = useState<ImageData[]>([]);

  // ─ helpers ────────────────────────────────────────────
  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;
  const getCanvas = () => canvasRef.current;

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const initCanvas = useCallback(() => {
    const canvas = getCanvas();
    const img    = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
  }, []);

  const pushHistory = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    setHistory(prev => [...prev.slice(-29), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const applyStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth * 1.5;
  };

  // ─ shape drawing ─────────────────────────────────────
  const drawShape = (ctx: CanvasRenderingContext2D, start: {x:number,y:number}, end: {x:number,y:number}) => {
    applyStyle(ctx);
    if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === 'circle') {
      const rx = (end.x - start.x) / 2;
      const ry = (end.y - start.y) / 2;
      const cx = start.x + rx;
      const cy = start.y + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // ─ mouse events ───────────────────────────────────
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    pushHistory();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current    = pos;
    startPosRef.current = pos;
    // Save snapshot for shape-preview during drag
    if (tool === 'rect' || tool === 'circle') {
      const canvas = getCanvas()!;
      snapshotRef.current = getCtx()!.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx    = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;
    const pos = getPos(e);

    if (tool === 'pen') {
      applyStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;

    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 8;
      ctx.lineCap   = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;

    } else if ((tool === 'rect' || tool === 'circle') && snapshotRef.current) {
      // Restore snapshot then preview shape
      ctx.putImageData(snapshotRef.current, 0, 0);
      drawShape(ctx, startPosRef.current!, pos);
    }
  };

  const stopDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    // Commit final shape position
    if ((tool === 'rect' || tool === 'circle') && snapshotRef.current) {
      const ctx = getCtx()!;
      ctx.putImageData(snapshotRef.current, 0, 0);
      drawShape(ctx, startPosRef.current!, getPos(e));
      snapshotRef.current = null;
    }
    setIsDrawing(false);
  };

  const undo = () => {
    const ctx    = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas || history.length === 0) return;
    ctx.putImageData(history[history.length - 1], 0, 0);
    setHistory(prev => prev.slice(0, -1));
  };

  const clearCanvas = () => {
    const ctx    = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;
    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSend = async () => {
    if (!containerRef.current) return;
    setIsSending(true);
    try {
      const merged = await html2canvas(containerRef.current, { useCORS: true, allowTaint: true, scale: 1.5 });
      merged.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `annotated_${Date.now()}.png`, { type: 'image/png' });
        await onSend(file);
        onClose();
      }, 'image/png');
    } catch { setIsSending(false); }
  };

  const COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#AF52DE','#FFFFFF','#1C1C1E'];

  type ToolDef = { key: DrawTool; label: string; icon: React.ReactNode };
  const TOOLS: ToolDef[] = [
    { key: 'pen',     label: 'ปากกา',       icon: <Pencil size={15}/> },
    { key: 'rect',    label: 'สี่เหลี่ยม',    icon: <Square size={15}/> },
    { key: 'circle',  label: 'วงกลม',       icon: <Circle size={15}/> },
    { key: 'eraser',  label: 'ยางลบ',       icon: <Eraser size={15}/> },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.93)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1rem' }}>

      {/* ─ Toolbar ─ */}
      <div style={{
        display:'flex', alignItems:'center', gap:'0.6rem',
        padding:'0.7rem 1.25rem', background:'rgba(255,255,255,0.08)',
        backdropFilter:'blur(20px)', borderRadius:'20px', marginBottom:'0.9rem',
        flexWrap:'wrap', justifyContent:'center', border:'1px solid rgba(255,255,255,0.1)',
      }}>

        {/* Tools */}
        <div style={{ display:'flex', gap:'0.35rem' }}>
          {TOOLS.map(t => (
            <button
              key={t.key}
              onClick={() => setTool(t.key)}
              title={t.label}
              style={{
                display:'flex', alignItems:'center', gap:'0.3rem',
                padding:'0.4rem 0.75rem', borderRadius:'10px', border:'none',
                cursor:'pointer', fontSize:'0.82rem', fontWeight: tool===t.key ? 700 : 400,
                background: tool===t.key ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
                color:'white',
              }}
            >
              {t.icon}
              <span style={{ fontSize:'0.78rem' }}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.15)', margin:'0 0.1rem' }} />

        {/* Colors */}
        <div style={{ display:'flex', gap:'0.3rem', alignItems:'center' }}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width:'22px', height:'22px', borderRadius:'50%', background:c, flexShrink:0,
                border: color===c ? '3px solid white' : '2px solid rgba(255,255,255,0.25)',
                cursor:'pointer', boxShadow: color===c ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.15)', margin:'0 0.1rem' }} />

        {/* Line Width */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)' }}>ขนาด</span>
          <input type="range" min={1} max={12} value={lineWidth}
            onChange={e => setLineWidth(+e.target.value)}
            style={{ width:'72px', accentColor:'#818cf8' }}
          />
          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', minWidth:'16px' }}>{lineWidth}</span>
        </div>

        <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.15)', margin:'0 0.1rem' }} />

        {/* Actions */}
        <button onClick={undo} disabled={history.length===0} title="Undo (Ctrl+Z)"
          style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.4rem 0.7rem', borderRadius:'10px', border:'none',
            cursor:'pointer', background:'rgba(255,255,255,0.1)', color:'white', opacity: history.length===0 ? 0.4 : 1 }}>
          <RotateCcw size={14}/> <span style={{ fontSize:'0.78rem' }}>Undo</span>
        </button>
        <button onClick={clearCanvas} title="ล้างทั้งหมด"
          style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.4rem 0.7rem', borderRadius:'10px', border:'none',
            cursor:'pointer', background:'rgba(255,149,0,0.15)', color:'#FF9500' }}>
          <Trash2 size={14}/> <span style={{ fontSize:'0.78rem' }}>ล้าง</span>
        </button>
        <button onClick={onClose} title="ยกเลิก"
          style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.4rem 0.7rem', borderRadius:'10px', border:'none',
            cursor:'pointer', background:'rgba(255,59,48,0.15)', color:'#FF3B30' }}>
          <X size={14}/> <span style={{ fontSize:'0.78rem' }}>ยกเลิก</span>
        </button>
        <button onClick={handleSend} disabled={isSending}
          style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 1.1rem', borderRadius:'10px', border:'none',
            cursor:'pointer', fontWeight:700, fontSize:'0.85rem',
            background: isSending ? 'rgba(52,199,89,0.3)' : '#34C759', color:'white' }}>
          {isSending ? <><RotateCcw size={14} style={{ animation:'spin 1s linear infinite'}} /> กำลังส่ง...</> : <>📤 ส่งรูปแก้ไข</>}
        </button>
      </div>

      {/* ─ Canvas ─ */}
      <div
        ref={containerRef}
        style={{
          position:'relative', borderRadius:'12px', overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
          maxWidth:'92vw', maxHeight:'72vh',
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="annotate"
          crossOrigin="anonymous"
          onLoad={initCanvas}
          style={{ display:'block', maxWidth:'92vw', maxHeight:'72vh', userSelect:'none', pointerEvents:'none' }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          style={{
            position:'absolute', top:0, left:0, width:'100%', height:'100%',
            cursor: tool==='eraser' ? 'cell' : tool==='pen' ? 'crosshair' : 'crosshair',
            touchAction:'none',
          }}
        />
      </div>

      <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', marginTop:'0.7rem' }}>
        เลือกเครื่องมือ → วาดบนภาพ → กด "ส่งรูปแก้ไข"
      </p>
    </div>
  );
}

export default function TicketDetailClient({ initialTicket, initialMessages, initialSettings }: { initialTicket: any, initialMessages: any[], initialSettings: any }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(initialTicket.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentPriority, setCurrentPriority] = useState(initialTicket.priority || "Medium");
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [assigneeName, setAssigneeName] = useState(initialTicket.assignee_name || "");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [annotationImage, setAnnotationImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: "", show: false });
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateDept, setEscalateDept] = useState("SA");
  
  const [resolveNotes, setResolveNotes] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [resolveModule, setResolveModule] = useState(initialTicket.module || (initialSettings?.modules?.[0] || "ห้องพยาบาล"));
  const [resolveIssueType, setResolveIssueType] = useState(initialTicket.issue_type || (initialSettings?.issue_types?.[0] || "PB"));

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState(initialTicket.ai_summary || "");
  const [staffList, setStaffList] = useState<{id: string, display_name: string}[]>([]);
  const [myActiveTickets, setMyActiveTickets] = useState<any[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStaffName, setTransferStaffName] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [escalateNotes, setEscalateNotes] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  // Fetch staff list and active tickets
  useEffect(() => {
    const loadAppData = async () => {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

      // 2. Fetch Staff List
      const { data: sData } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('role', 'Staff')
        .eq('status', 'approved');
      if (sData) setStaffList(sData);

      // 4. Fetch Departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });
      if (deptData) {
        setDepartments(deptData);
        // Default to a sensible one if available, otherwise "SA" value from before
        const prog = deptData.find(d => d.name === 'Programmer');
        if (prog) setEscalateDept(prog.id);
        else if (deptData.length > 0) setEscalateDept(deptData[0].id);
      }

      // 3. Fetch My Active Tickets (Using current user's likely assignee name)
      // Check both currentUserName and assigneeName for better coverage
      const staffName = assigneeName || currentUserName;
      if (staffName) {
        const { data: tData } = await supabase
          .from('tickets')
          .select('id, ticket_no, status, priority, description, users(display_name)')
          .eq('assignee_name', staffName)
          .neq('status', 'Resolved')
          .neq('status', 'Closed')
          .order('created_at', { ascending: false });
        if (tData) setMyActiveTickets(tData);
      }
    };
    loadAppData();
  }, [assigneeName]);

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 3000);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    scrollToBottom();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${initialTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `ticket_id=eq.${initialTicket.id}` },
        (payload) => {
          setMessages((prev) => {
            // Skip if already in list (real ID)
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // Replace the last optimistic outbound message with the real one
            if (payload.new.direction === 'outbound') {
              const optIdx = prev.findIndex(m => String(m.id).startsWith('opt-') && m.direction === 'outbound');
              if (optIdx !== -1) {
                const next = [...prev];
                next[optIdx] = payload.new;
                return next;
              }
            }
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [initialTicket.id]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || isSending) return;
    const lineUid = initialTicket.users?.line_uid;
    if (!lineUid) { showToast("ไม่พบ LINE account ของลูกค้า"); return; }

    // ── Optimistic update: show message immediately ──────────
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: optimisticId,
      content: text,
      direction: 'outbound',
      message_type: 'text',
      created_at: new Date().toISOString(),
    }]);
    setReplyText("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lineUid }),
      });
      if (!res.ok) throw new Error();
      // Real message from Supabase realtime will replace optimistic one
    } catch {
      // Rollback optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setReplyText(text);
      showToast("ส่งข้อความไม่สำเร็จ");
    } finally { setIsSending(false); }
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
          const MAX_SIZE = 1280;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => { resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file); }, "image/jpeg", 0.75);
        };
      };
    });
  };

  const uploadFileAndSend = async (file: File) => {
    if (!initialTicket.users?.line_uid) { showToast("No LINE account linked"); return; }
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    
    // 🛡️ Limit video size to 10MB
    if (isVideo && file.size > 10 * 1024 * 1024) {
      alert("❌ วิดีโอขนาดใหญ่เกินไป (จำกัดไม่เกิน 10MB)\nกรุณาลดขนาดไฟล์ก่อนส่งครับ");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);

    // Optimistic preview for image/video
    const optimisticId = `opt-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, {
      id: optimisticId,
      content: localUrl,
      direction: 'outbound',
      message_type: isVideo ? 'video' : 'image',
      created_at: new Date().toISOString(),
    }]);

    try {
      const processedFile = isImage ? await compressImage(file) : file;
      const formData = new FormData();
      formData.append("lineUid", initialTicket.users.line_uid);
      formData.append("file", processedFile);
      if (isVideo) formData.append("fileType", "video");
      const res = await fetch(`/api/tickets/${initialTicket.id}/reply`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to send file");
      // Realtime will replace optimistic entry
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      URL.revokeObjectURL(localUrl);
      showToast("ส่งไฟล์ไม่สำเร็จ");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateAISummary = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: initialTicket.id })
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
        showToast("AI สรุปงานให้เรียบร้อยแล้ว ✨");
      } else if (data.error === "AI API Key not configured") {
        showToast("กรุณาตั้งค่า GOOGLE_GEMINI_API_KEY ก่อนครับ");
      }
    } catch {
      showToast("AI ทำงานขัดข้อง กรุณาลองใหม่");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, additionalData: any = {}) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus, 
          lineUid: initialTicket.users?.line_uid,
          ...additionalData
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setCurrentStatus(newStatus);
      router.refresh();
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePriorityUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value;
    setIsUpdatingPriority(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error();
      setCurrentPriority(newPriority);
      showToast(`อัปเดตความสำคัญเป็น ${newPriority} แล้ว`);
      router.refresh();
    } catch {
      showToast("อัปเดตความสำคัญไม่สำเร็จ");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveNotes.trim()) { alert("กรุณาระบุวิธีแก้ไขปัญหา"); return; }
    const success = await handleStatusUpdate("Resolved", {
      lineUid: initialTicket.users?.line_uid,
      notes: resolveNotes + (extraNotes ? `\nหมายเหตุ: ${extraNotes}` : ""),
      module: resolveModule,
      issue_type: resolveIssueType
    });
    if (success) {
      setIsResolveModalOpen(false);
      showToast("ปิดงานเรียบร้อยแล้ว! กำลังกลับหน้าหลัก...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  };

  const handleConfirmEscalate = async () => {
    if (!escalateNotes.trim()) { alert("กรุณาระบุจุดประสงค์หรือรายละเอียดการส่งต่องาน"); return; }
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newDepartmentId: escalateDept, 
          notes: escalateNotes,
          status: "Escalated"
        })
      });
      if (res.ok) {
        setIsEscalateModalOpen(false);
        showToast(`ส่งต่องานไปยังฝ่ายเรียบร้อยแล้ว! ✅`);
        setTimeout(() => router.push("/"), 1500);
      } else {
        showToast("เกิดข้อผิดพลาดในการส่งต่องาน");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsEscalating(false);
    }
  };

  const handleTransferJob = async (newAssignee: string, notes: string) => {
    if (!newAssignee) return;
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeName: newAssignee, notes })
      });
      if (res.ok) {
        setIsTransferModalOpen(false);
        showToast(`ส่งมอบงานให้คุณ ${newAssignee} สำเร็จ ✅`);
        setTimeout(() => router.push("/"), 1500);
      } else {
        showToast("เกิดข้อผิดพลาดในการส่งมอบงาน");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อส่งมอบงานได้");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleExportPDF = async () => {
    console.log("PDF Export Triggered. ref:", reportRef.current);
    if (!reportRef.current || isGeneratingPDF) {
      console.warn("PDF Export aborted: ref is null or already generating");
      return;
    }
    setIsGeneratingPDF(true);
    try {
      console.log("Starting PDF generation flow...");
      // Ensure fonts are loaded before capturing
      if (typeof document !== "undefined" && (document as any).fonts) {
        console.log("Waiting for fonts...");
        await (document as any).fonts.ready;
        console.log("Fonts ready.");
      }

      const reportEl = reportRef.current;
      if (!reportEl) throw new Error("Report element found null during process");
      const parent = reportEl.parentElement;
      
      // Temporarily move to a visible but off-screen location with opacity 1 for capture
      // We use 'fixed' and 'top: 0' but 'visibility: visible' to ensure it's rendered
      const originalStyles = {
        position: parent?.style.position || "",
        top: parent?.style.top || "",
        left: parent?.style.left || "",
        opacity: parent?.style.opacity || "",
        zIndex: parent?.style.zIndex || "",
        visibility: parent?.style.visibility || ""
      };

      if (parent) {
        parent.style.position = "fixed";
        parent.style.top = "0";
        parent.style.left = "0";
        parent.style.opacity = "1";
        parent.style.visibility = "visible";
        parent.style.zIndex = "99999";
      }

      // Slightly longer delay to ensure everything is rendered
      await new Promise(r => setTimeout(r, 1200));

      const canvas = await html2canvas(reportEl, { 
        scale: 2.5, // High quality
        useCORS: true,
        logging: true,
        backgroundColor: "#ffffff",
        allowTaint: false,
        onclone: (clonedDoc) => {
           const el = clonedDoc.querySelector('[data-pdf-report]');
           if (el instanceof HTMLElement) {
             el.style.opacity = '1';
             el.style.visibility = 'visible';
             el.style.display = 'block';
             el.style.position = 'relative';
             el.style.top = '0';
             el.style.left = '0';
           }
        }
      });
      
      // Restore original Styles immediately after capture
      if (parent) {
        parent.style.position = originalStyles.position;
        parent.style.top = originalStyles.top;
        parent.style.left = originalStyles.left;
        parent.style.opacity = originalStyles.opacity;
        parent.style.zIndex = originalStyles.zIndex;
        parent.style.visibility = originalStyles.visibility;
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Report_${initialTicket.ticket_no || 'Ticket'}.pdf`);
      showToast("ดาวน์โหลด PDF เรียบร้อยแล้ว ✅");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast("มีข้อผิดพลาดในการสร้าง PDF ❌");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleAssign = async () => {
    // ── Optimistic: update UI instantly, no router.refresh() ─
    setAssigneeName("IT Support");
    setCurrentStatus("In Progress");
    setIsAssigning(true);
    showToast("รับงานสำเร็จ! ✅");
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeName: "IT Support" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback on error
      setAssigneeName("");
      setCurrentStatus(initialTicket.status);
      showToast("รับงานไม่สำเร็จ กรุณาลองใหม่");
    } finally { setIsAssigning(false); }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'Pending': return 'งานใหม่';
      case 'In Progress': return 'กำลังดำเนินการ';
      case 'Resolved': return 'แก้ไขเสร็จสิ้น';
      case 'Closed': return 'ปิดงาน';
      case 'Escalated': return 'ส่งต่องาน';
      default: return s;
    }
  };

  const userName = initialTicket.users?.display_name || "Unknown User";
  const hospitalName = initialTicket.users?.hospitals?.name || "Unknown Hospital";
  let badgeCls = "status-pending";
  if (currentStatus === "In Progress") badgeCls = "status-in-progress";
  if (["Resolved", "Closed"].includes(currentStatus)) badgeCls = "status-done";
  if (currentStatus === "Escalated") badgeCls = "status-escalated";

  const prioCls = `prio-badge prio-${currentPriority.toLowerCase()}`;

  return (
    <div className={`dashboard-container ${theme}`} style={{ height: "100vh", overflow: "hidden" }}>
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`} style={{ 
        width: isSidebarOpen ? "280px" : "90px", 
        padding: isSidebarOpen ? "2.5rem 1rem" : "2rem 0.75rem", 
        alignItems: isSidebarOpen ? "stretch" : "center", 
        background: "var(--bg-glass)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease",
        position: 'relative'
      }}>
        <div className="sidebar-logo" style={{ padding: isSidebarOpen ? "0 1rem" : 0 }}>
          <div className="logo-icon-container" style={{ width: isSidebarOpen ? '42px' : '40px', height: isSidebarOpen ? '42px' : '40px' }}>
            <Activity className="logo-icon" size={isSidebarOpen ? 24 : 20} />
          </div>
          {isSidebarOpen && <span className="logo-text">NEO Support</span>}
        </div>
        
        <nav className="sidebar-nav" style={{ alignItems: isSidebarOpen ? 'stretch' : 'center', width: '100%', flex: 1, overflowY: 'auto', gap: '0.5rem' }}>
          <Link href="/" className="nav-item" title="Back to Dashboard" style={{ 
            padding: "0.85rem", 
            width: isSidebarOpen ? '100%' : '50px', 
            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
            marginBottom: '1.5rem',
            background: 'var(--bg-color)',
          }}>
            <ArrowLeft size={isSidebarOpen ? 20 : 24} />
            {isSidebarOpen && <span className="nav-label">กลับหน้าหลัก</span>}
          </Link>

          {isSidebarOpen && myActiveTickets.length > 0 && (
            <div style={{ padding: "0 0.8rem", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              งานที่กำลังทำ ({myActiveTickets.length})
            </div>
          )}

          {myActiveTickets.map(t => (
            <Link 
              key={t.id} 
              href={`/tickets/${t.id}`} 
              className={`nav-item ${t.id === initialTicket.id ? 'active' : ''}`}
              style={{ 
                padding: "0.85rem", 
                width: isSidebarOpen ? '100%' : '50px', 
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                flexDirection: 'column',
                alignItems: isSidebarOpen ? 'flex-start' : 'center',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <Clock size={16} />
                {isSidebarOpen && <span className="nav-label" style={{ fontWeight: 600 }}>{t.ticket_no}</span>}
              </div>
              {isSidebarOpen && (
                <div style={{ fontSize: '0.7rem', opacity: 0.7, paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {t.users?.display_name} - {t.description}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          style={{
            zIndex: 1002, // Ensure it's above other elements
            border: theme === 'light' ? '2px solid white' : '2px solid var(--bg-color)'
          }}
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      <main className="main-content" style={{ display: "flex", gap: "2rem", padding: "1.5rem 2rem", flex: 1 }}>
        {/* Left Side: Detail Card */}
        <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="stat-card animate-fade-in" style={{ padding: "2rem", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className={`status-badge ${badgeCls}`}>{getStatusLabel(currentStatus)}</span>
                    <select 
                      value={currentPriority}
                      onChange={handlePriorityUpdate}
                      disabled={isUpdatingPriority || !assigneeName}
                      className={prioCls}
                      style={{ border: "2px solid currentColor", outline: "none", cursor: assigneeName ? "pointer" : "not-allowed", opacity: isUpdatingPriority ? 0.5 : 1, appearance: "none", paddingRight: "1.2rem", backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.2rem center" }}
                    >
                      <option value="Critical">🔴 CRITICAL</option>
                      <option value="High">🟠 HIGH</option>
                      <option value="Medium">🔵 MEDIUM</option>
                      <option value="Low">⚪ LOW</option>
                    </select>
                  </div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 800, fontFamily: "Outfit" }}>{initialTicket.ticket_no}</h2>
                </div>
                {["Resolved", "Closed"].includes(currentStatus) && (
                  <button 
                    onClick={() => {
                      console.log("Export Button Clicked");
                      handleExportPDF();
                    }} 
                    className="btn-primary" 
                    style={{ 
                      padding: "0.6rem 1rem", 
                      borderRadius: "14px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem",
                      background: "var(--primary)",
                      boxShadow: "0 4px 12px var(--primary-glow)"
                    }} 
                    title="Export PDF Report"
                  >
                    <FileText size={18} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>PDF</span>
                  </button>
                )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>Description</label>
                <p style={{ fontSize: "1.1rem", color: "var(--text-heading)", marginTop: "0.25rem" }}>{initialTicket.description}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div><label style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Reporter</label><p style={{ fontWeight: 600 }}>👤 {userName}</p></div>
                <div><label style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Type</label><p style={{ fontWeight: 600 }}>⚙️ {initialTicket.issue_type || "รอระบุตอนปิดงาน"}</p></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Hospital</label><p style={{ fontWeight: 600 }}>🏥 {hospitalName}</p></div>
              </div>

              {/* Handover Section */}
              {initialTicket.handover_notes && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--status-escalated-text)', fontWeight: 700 }}>⚠️ หมายเหตุการส่งมอบงาน</label>
                  <p style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>{initialTicket.handover_notes}</p>
                </div>
              )}

              {/* AI Summary Section */}
              {aiSummary && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--primary-glow)' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} /> AI สรุปงาน (Insight)
                  </label>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                    {aiSummary.split('\n').map((line: string, i: number) => <p key={i} style={{ marginBottom: '0.4rem' }}>{line}</p>)}
                  </div>
                </div>
              )}

              <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
                <label style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "1rem" }}>ASSIGNED STAFF</label>
                {assigneeName ? (
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>👨‍💻</div>
                    {assigneeName}
                  </div>
                ) : (
                  <button 
                    onClick={handleAssign} 
                    disabled={isAssigning} 
                    className="btn-claim-premium"
                  >
                    {isAssigning ? (
                      <div className="loading-spinner-small" />
                    ) : (
                      <>
                        <div className="claim-icon-wrapper">
                          <Hand size={24} className="claim-icon" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>กดรับงาน (Claim)</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>คลิกเพื่อยืนยันว่าคุณคือผู้รับผิดชอบ</span>
                        </div>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {currentStatus !== "Resolved" && assigneeName && (
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button 
                      onClick={() => setIsResolveModalOpen(true)} 
                      className="btn-primary" 
                      style={{ flex: 2, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 10px 20px rgba(16,185,129,0.3)" }}
                    >
                     <CheckCircle size={20} /> ปิดงาน (Resolve)
                    </button>
                    <button 
                      onClick={() => setIsTransferModalOpen(true)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", borderColor: "var(--primary)" }}
                    >
                      <UserCheck size={20} /> ส่งมอบ Staff
                    </button>
                    <button 
                      onClick={() => setIsEscalateModalOpen(true)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(239, 68, 68, 0.05)", color: "var(--status-escalated-text)", borderColor: "var(--status-escalated-text)" }}
                    >
                      <Share2 size={20} /> ส่งฝ่ายอื่น
                    </button>
                 </div>
              )}
              
              {assigneeName && (
                <button 
                  onClick={handleGenerateAISummary}
                  disabled={isGeneratingAI}
                  className="btn-secondary"
                  style={{ width: "100%", padding: "0.85rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", borderStyle: "dashed", borderColor: "var(--primary)" }}
                >
                  {isGeneratingAI ? <div className="spinner-mini" /> : <><Zap size={16} /> {aiSummary ? "AI สรุปใหม่" : "ให้ AI สรุปงาน"}</>}
                </button>
              )}

              {currentStatus === "Resolved" && (
                <button 
                  onClick={() => setIsResolveModalOpen(true)} 
                  className="btn-secondary" 
                  style={{ width: "100%", padding: "1rem", borderRadius: "14px" }}
                >
                  แก้ไขข้อมูลการปิดงาน
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Modern Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-glass)", backdropFilter: "blur(20px)", borderRadius: "32px", border: "1px solid var(--border-color)", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
          <div className="chat-area" style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFileAndSend(f); }}>
            {isDragOver && <div style={{ position: "absolute", inset: "1rem", borderRadius: "20px", background: "rgba(99, 102, 241, 0.1)", border: "3px dashed var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <span style={{ background: "var(--bg-surface)", padding: "1.5rem 2.5rem", borderRadius: "16px", fontWeight: 800, color: "var(--primary)" }}>วางรูปภาพเพื่อส่งให้ลูกค้า</span>
            </div>}
            
            {messages.map((msg, idx) => {
              const isIT = msg.direction === "outbound";
              const isImage = msg.message_type === "image";
              const isOptimistic = String(msg.id).startsWith('opt-');
              return (
                <div key={msg.id ?? idx} style={{ alignSelf: isIT ? "flex-end" : "flex-start", maxWidth: "80%", opacity: isOptimistic ? 0.75 : 1, transition: 'opacity 0.3s' }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", textAlign: isIT ? "right" : "left", padding: "0 0.5rem", display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: isIT ? 'flex-end' : 'flex-start' }}>
                    {isIT ? "IT Support" : userName} • {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    {isOptimistic && <Clock size={10} className="animate-pulse" style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div style={{ 
                    padding: isImage ? "0.5rem" : "1rem 1.25rem", 
                    borderRadius: "20px", 
                    background: isIT ? "linear-gradient(135deg, var(--primary), var(--primary-hover))" : "var(--bg-surface)", 
                    color: isIT ? "white" : "var(--text-main)",
                    boxShadow: isIT ? "0 4px 15px var(--primary-glow)" : "0 4px 10px rgba(0,0,0,0.1)",
                    border: isIT ? "none" : "1px solid var(--border-color)",
                    borderBottomRightRadius: isIT ? "4px" : "20px",
                    borderBottomLeftRadius: isIT ? "20px" : "4px",
                    position: 'relative',
                  }}>
                    {isImage && msg.content.startsWith('http') ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={msg.content}
                          alt="Attachment"
                          style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "14px", cursor: "zoom-in", display: 'block' }}
                          onClick={() => setSelectedImage(msg.content)}
                        />
                        {/* ✏️ Annotate button — only for inbound images */}
                        {!isIT && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setAnnotationImage(msg.content); }}
                            title="วาดและส่งคืนลูกค้า"
                            style={{
                              position: 'absolute', bottom: '8px', right: '8px',
                              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px',
                              color: 'white', padding: '0.35rem 0.7rem',
                              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.8)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
                          >
                            <Pencil size={12} /> แก้ไขรูป
                          </button>
                        )}
                      </div>
                    ) : isImage && !msg.content.startsWith('http') ? (
                      <div style={{ padding: "0.5rem" }}>{msg.content}</div>
                    ) : msg.message_type === 'video' ? (
                      <video
                        src={msg.content}
                        controls
                        style={{
                          maxWidth: '100%', maxHeight: '320px',
                          borderRadius: '14px', display: 'block',
                          background: '#000',
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "1rem", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          {initialSettings?.quick_replies?.length > 0 && (
            <div style={{
              padding: "0.75rem 2rem 0",
              background: "rgba(0,0,0,0.2)",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} className="text-amber-500" /> สำเร็จรูป:
              </span>
              {initialSettings.quick_replies.map((reply: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReplyText(reply)}
                  style={{
                    padding: "0.3rem 0.85rem",
                    borderRadius: "20px",
                    border: "1px solid rgba(99,102,241,0.4)",
                    background: "rgba(99,102,241,0.08)",
                    color: "var(--primary)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.4)";
                  }}
                  title={reply}
                >
                  {reply.length > 25 ? reply.substring(0, 25) + "…" : reply}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Bar */}
          <div style={{ padding: "1.25rem 2rem", background: "rgba(0,0,0,0.2)", borderTop: initialSettings?.quick_replies?.length > 0 ? "none" : "1px solid var(--border-color)" }}>
            <form onSubmit={handleSendReply} style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
              {/* Attach Image/Video Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="btn-secondary"
                title="แนบรูปภาพ / วิดีโอ"
                style={{ width: "64px", height: "64px", borderRadius: "18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isUploadingImage ? 0.6 : 1, gap: '2px' }}
              >
                {isUploadingImage
                  ? <div style={{ width: "24px", height: "24px", border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  : <>
                      <ImageIcon size={18} color="var(--primary)" />
                      <Video size={14} color="var(--primary)" style={{ opacity: 0.7 }} />
                    </>}
              </button>
              <input
                type="file"
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFileAndSend(f); }}
                style={{ display: "none" }}
              />

              {/* Text Input */}
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="พิมพ์ข้อความตอบกลับ..."
                style={{ flex: 1, padding: "1.1rem 1.5rem", borderRadius: "20px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "white", outline: "none", fontSize: "1rem", height: "64px", boxSizing: "border-box" }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="btn-primary"
                title="ส่งข้อความ"
                style={{ width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                {isSending
                  ? <div style={{ width: "24px", height: "24px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  : <Send size={26} />}
              </button>
            </form>
          </div>
        </div>
      </main>


      {/* Resolve Modal */}
      {isResolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={28} className="text-green-500" /> ปิดงาน / Resolved Ticket
            </h2>
            <div className="form-group"><label>โมดูล / ระบบ</label><select value={resolveModule} onChange={e => setResolveModule(e.target.value)}>{initialSettings?.modules?.map((m: any, idx: number) => <option key={idx} value={m}>{m}</option>)}</select></div>
            <div className="form-group"><label>ประเภทงาน</label><select value={resolveIssueType} onChange={e => setResolveIssueType(e.target.value)}>{initialSettings?.issue_types?.map((t: any, idx: number) => <option key={idx} value={t}>{t}</option>)}</select></div>
            <div className="form-group">
              <label>วิธีแก้ไขปัญหา (Resolution Notes) *</label>
              <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {initialSettings?.resolution_notes?.map((note: any, idx: number) => <button key={idx} type="button" onClick={() => setResolveNotes(note)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}>+ {note}</button>)}
              </div>
              <textarea rows={2} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="อธิบายขั้นตอนการแก้ไขงาน..." style={{ borderRadius: "12px", marginBottom: "1rem" }} />
              
              <label>หมายเหตุเพิ่มเติม (Optional)</label>
              <textarea rows={2} value={extraNotes} onChange={e => setExtraNotes(e.target.value)} placeholder="หมายเหตุถึงทีมงานหรือลูกค้า..." style={{ borderRadius: "12px" }} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsResolveModalOpen(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleConfirmResolve} disabled={isUpdatingStatus} style={{ background: "var(--primary)" }}>{isUpdatingStatus ? "Saving..." : "ยืนยันปิดงาน"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {isEscalateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Share2 size={28} className="text-blue-500" /> ส่งต่องานไปที่ไหน?
            </h2>
            <div className="form-group">
              <label>หน่วยงาน / ฝ่ายที่จะส่งต่อ (Department Escalation)</label>
              <select value={escalateDept} onChange={e => setEscalateDept(e.target.value)} style={{ padding: "1rem", fontSize: "1.1rem" }}>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                {departments.length === 0 && <option value="wait" disabled>กำลังโหลดแผนก...</option>}
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>รายละเอียดประกอบการส่งต่อ (Handover Notes) *</label>
              <textarea 
                rows={3} 
                required
                value={escalateNotes} 
                onChange={e => setEscalateNotes(e.target.value)} 
                placeholder="ระบุสิ่งที่ทำไปแล้ว หรือทำไมต้องส่งต่อ..." 
                style={{ borderRadius: "12px", background: "var(--bg-color)" }} 
              />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>* การส่งต่อจะเปลี่ยนสถานะเป็น <strong style={{ color: 'var(--status-escalated-text)' }}>Escalated</strong> และบันทึกลงประวัติการส่งมอบงาน</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsEscalateModalOpen(false)}>ยกเลิก</button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmEscalate} 
                disabled={isEscalating || !escalateDept || !escalateNotes.trim()} 
                style={{ background: "var(--accent)" }}
              >
                {isEscalating ? "กำลังส่งต่อ..." : "ยืนยันการส่งต่อ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover / Transfer Modal */}
      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem", maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Share2 size={28} style={{ color: "var(--primary)" }} /> ส่งมอบงานให้เพื่อนทีม IT
            </h2>
            <div className="form-group">
              <label>เลือกพนักงานที่จะรับช่วงต่อ</label>
              <select 
                value={transferStaffName} 
                onChange={e => setTransferStaffName(e.target.value)} 
                style={{ padding: "1rem", fontSize: "1.1rem" }}
              >
                <option value="">-- เลือกรายชื่อ Staff --</option>
                {staffList.filter(s => s.display_name !== assigneeName).map(s => (
                  <option key={s.id} value={s.display_name}>{s.display_name}</option>
                ))}
                {staffList.length === 0 && <option disabled>กำลังโหลดรายชื่อพนักงาน...</option>}
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>หมายเหตุการส่งมอบ (Handover Notes)</label>
              <textarea 
                rows={3} 
                value={transferNotes} 
                onChange={e => setTransferNotes(e.target.value)} 
                placeholder="ระบุสิ่งที่ทำไปแล้ว หรือสิ่งที่ต้องทำต่อ..." 
                style={{ borderRadius: "12px", background: "var(--bg-color)" }} 
              />
            </div>
            <div className="modal-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-secondary" onClick={() => setIsTransferModalOpen(false)}>ยกเลิก</button>
              <button 
                className="btn-primary" 
                onClick={() => handleTransferJob(transferStaffName, transferNotes)} 
                disabled={!transferStaffName || isTransferring}
                style={{ background: "var(--primary)" }}
              >
                {isTransferring ? "กำลังส่งมอบ..." : "ยืนยันการส่งมอบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Generation Template (Optimized for Thai) */}
      <div style={{ position: "fixed", top: "-20000px", left: "-20000px", opacity: 0, pointerEvents: "none", zIndex: -100 }} data-pdf-report>
        <div ref={reportRef} style={{ 
          width: "800px", 
          padding: "60px", 
          background: "white", 
          color: "black", 
          fontFamily: "'IBM Plex Sans Thai', sans-serif", 
          display: "block",
          textAlign: "left"
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #4f46e5', paddingBottom: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ color: "#4f46e5", margin: 0, fontSize: "28px", fontWeight: 700 }}>NEO SUPPORT</h1>
              <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>Service Report & Technical Summary</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, margin: 0, fontSize: "18px" }}>Ticket: {initialTicket.ticket_no}</p>
              <p style={{ color: "#666", margin: "5px 0" }}>Date: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'left' }}>
               <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', fontSize: '16px', fontWeight: 700 }}>CLIENT INFO</h3>
               <p style={{ margin: '5px 0' }}><strong>Hospital:</strong> {initialTicket.users?.hospitals?.name || '-'}</p>
               <p style={{ margin: '5px 0' }}><strong>Department:</strong> {initialTicket.users?.department || '-'}</p>
               <p style={{ margin: '5px 0' }}><strong>Reporter:</strong> {initialTicket.users?.display_name || '-'}</p>
             </div>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'left' }}>
               <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', fontSize: '16px', fontWeight: 700 }}>ISSUE DETAILS</h3>
               <p style={{ margin: '5px 0' }}><strong>Type:</strong> {initialTicket.issue_type || '-'}</p>
               <p style={{ margin: '5px 0' }}><strong>Module:</strong> {initialTicket.module || '-'}</p>
               <p style={{ margin: '5px 0' }}><strong>Status:</strong> {currentStatus === 'Resolved' ? 'แก้ไขเสร็จสิ้น' : 'ปิดงาน'}</p>
             </div>
          </div>

          <div style={{ marginBottom: '40px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', color: '#4f46e5', borderLeft: '4px solid #4f46e5', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>PROBLEM DESCRIPTION</h3>
            <p style={{ background: '#fff', border: '1px solid #eee', padding: '15px', borderRadius: '8px', lineHeight: '1.6', minHeight: '60px' }}>{initialTicket.description}</p>
          </div>

          <div style={{ marginBottom: '40px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', color: '#10b981', borderLeft: '4px solid #10b981', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>RESOLUTION & NOTES</h3>
            <div style={{ background: '#f0fdf4', border: '1px solid #10b981', padding: '20px', borderRadius: '8px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '10px' }}><strong>วิธีแก้ไข:</strong> {initialTicket.notes || resolveNotes || 'N/A'}</p>
              {initialTicket.notes?.includes('\nหมายเหตุ:') && <p style={{ marginTop: '10px', borderTop: '1px dashed #10b981', paddingTop: '10px' }}>รายละเอียดเพิ่มเติมตามบันทึกระบบ</p>}
            </div>
            
            {aiSummary && (
              <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '8px', color: '#4f46e5', fontWeight: 700 }}>AI สรุปผลการตรวจสอบ:</p>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  {aiSummary.split('\n').map((line: string, i: number) => <p key={i} style={{ margin: '0 0 4px 0' }}>{line}</p>)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '100px' }}>
            <div style={{ textAlign: 'center', width: '250px' }}>
              <p style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}>&nbsp;</p>
              <p style={{ fontWeight: 600 }}>({assigneeName || 'IT Support Specialist'})</p>
              <p style={{ fontSize: '12px', color: '#666' }}>Responsible Engineer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal — scrollable full-size view */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position:'fixed', inset:0, zIndex:9998,
            background:'rgba(0,0,0,0.92)',
            overflow:'auto',
            display:'flex',
            alignItems:'flex-start',
            justifyContent:'center',
            padding:'2rem',
            cursor:'zoom-out',
          }}
        >
          {/* Close button top-right */}
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position:'fixed', top:'1rem', right:'1rem',
              background:'rgba(255,255,255,0.15)', border:'none',
              borderRadius:'50%', width:'44px', height:'44px',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'white', zIndex:1,
            }}
          >
            <X size={24}/>
          </button>
          <img
            src={selectedImage}
            alt="Zoomed"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth:'100%',
              height:'auto',
              borderRadius:'12px',
              boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
              cursor:'default',
              marginTop: '2rem',
            }}
          />
        </div>
      )}

      {/* Image Annotation Modal */}
      {annotationImage && (
        <ImageAnnotationModal
          imageUrl={annotationImage}
          onClose={() => setAnnotationImage(null)}
          onSend={uploadFileAndSend}
        />
      )}


      {toast.show && (
        <div className="toast-notification">
           <Info size={18} /> {toast.message}
        </div>
      )}

      {isGeneratingPDF && (
        <div className="modal-overlay" style={{ zIndex: 10001, background: "rgba(0,0,0,0.7)" }}>
          <div className="modal-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
            <div className="loading-spinner" style={{ width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <p style={{ fontWeight: 600 }}>กำลังจัดเตรียมเอกสาร PDF...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .btn-claim-premium {
          width: 100%;
          padding: 1.25rem 1.5rem;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 25px var(--primary-glow);
          position: relative;
          overflow: hidden;
        }

        .btn-claim-premium::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: 0.5s;
        }

        .btn-claim-premium:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 15px 35px var(--primary-glow), 0 0 15px var(--accent-glow);
        }

        .btn-claim-premium:hover::before {
          left: 100%;
        }

        .btn-claim-premium:active {
          transform: translateY(-2px) scale(0.98);
        }

        .btn-claim-premium:disabled {
          opacity: 0.7;
          filter: grayscale(0.5);
          cursor: not-allowed;
          transform: none;
        }

        .claim-icon-wrapper {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
          transition: transform 0.3s ease;
        }

        .btn-claim-premium:hover .claim-icon-wrapper {
          transform: rotate(-10deg) scale(1.1);
          background: rgba(255, 255, 255, 0.3);
        }

        .loading-spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
