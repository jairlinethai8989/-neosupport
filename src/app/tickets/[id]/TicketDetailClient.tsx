"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { ArrowLeft, Activity, Clock, Zap, FileText, Share2, CheckCircle, Hand, UserCheck, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import ImageAnnotationModal from "./components/ImageAnnotationModal";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import TicketHeader from "./components/TicketHeader";

const supabase = createClient();

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
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

      const { data: sData } = await supabase.from('users').select('id, display_name').eq('role', 'Staff').eq('status', 'approved');
      if (sData) setStaffList(sData);

      const { data: deptData } = await supabase.from('departments').select('id, name').order('name', { ascending: true });
      if (deptData) {
        setDepartments(deptData);
        const prog = deptData.find(d => d.name === 'Programmer');
        if (prog) setEscalateDept(prog.id);
        else if (deptData.length > 0) setEscalateDept(deptData[0].id);
      }

      const staffName = assigneeName || currentUserName;
      if (staffName) {
        const { data: tData } = await supabase.from('tickets').select('id, ticket_no, status, priority, description, users(display_name)')
          .eq('assignee_name', staffName).neq('status', 'Resolved').neq('status', 'Closed').order('created_at', { ascending: false });
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase.channel(`ticket-${initialTicket.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `ticket_id=eq.${initialTicket.id}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          if (payload.new.direction === 'outbound') {
            const optIdx = prev.findIndex(m => String(m.id).startsWith('opt-') && m.direction === 'outbound');
            if (optIdx !== -1) { const next = [...prev]; next[optIdx] = payload.new; return next; }
          }
          return [...prev, payload.new];
        });
        // Force refresh server components (status, transfer logs, etc.)
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [initialTicket.id, router]);

  const handleSendReply = async (content: string, file?: File) => {
    if ((!content && !file) || isSending) return;
    const lineUid = initialTicket.users?.line_uid;
    if (!lineUid) { showToast("ไม่พบ LINE account ของลูกค้า"); return; }

    const optimisticId = `opt-${Date.now()}`;
    const isVideo = file?.type.startsWith("video/");
    const isImage = file?.type.startsWith("image/");

    setMessages(prev => [...prev, {
      id: optimisticId,
      content: file ? URL.createObjectURL(file) : content,
      direction: 'outbound',
      message_type: isVideo ? 'video' : isImage ? 'image' : 'text',
      created_at: new Date().toISOString(),
    }]);

    if (!file) setReplyText("");
    setIsSending(true);

    try {
      if (file) {
        const processedFile = isImage ? await compressImage(file) : file;
        const formData = new FormData();
        formData.append("lineUid", lineUid);
        formData.append("file", processedFile);
        if (isVideo) formData.append("fileType", "video");
        const res = await fetch(`/api/tickets/${initialTicket.id}/reply`, { method: "POST", body: formData });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`/api/tickets/${initialTicket.id}/reply`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: content, lineUid }),
        });
        if (!res.ok) throw new Error();
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      if (content) setReplyText(content);
      showToast("ส่งไม่สำเร็จ");
    } finally {
      setIsSending(false);
    }
  };

  const compressImage = (file: File): Promise<File | Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width, height = img.height;
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
    if (isVideo && file.size > 10 * 1024 * 1024) {
      alert("❌ วิดีโอขนาดใหญ่เกินไป (จำกัดไม่เกิน 10MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploadingImage(true);
    await handleSendReply("", file);
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerateAISummary = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: initialTicket.id }) });
      const data = await res.json();
      if (data.summary) { setAiSummary(data.summary); showToast("AI สรุปงานให้เรียบร้อยแล้ว ✨"); }
      else showToast(`❌ ${data.error || "ไม่สามารถสรุปงานได้ในขณะนี้"}`);
    } catch { showToast("❌ ระบบ AI ขัดข้อง กรุณาลองใหม่อีกครั้ง"); }
    finally { setIsGeneratingAI(false); }
  };

  const handleStatusUpdate = async (newStatus: string, additionalData: any = {}) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, lineUid: initialTicket.users?.line_uid, ...additionalData }),
      });
      if (!res.ok) throw new Error();
      setCurrentStatus(newStatus);
      router.refresh();
      return true;
    } catch { alert("Failed to update status"); return false; }
    finally { setIsUpdatingStatus(false); }
  };

  const handlePriorityUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value;
    setIsUpdatingPriority(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/priority`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error();
      setCurrentPriority(newPriority);
      showToast(`อัปเดตความสำคัญเป็น ${newPriority} แล้ว`);
      router.refresh();
    } catch { showToast("อัปเดตความสำคัญไม่สำเร็จ"); }
    finally { setIsUpdatingPriority(false); }
  };

  const handleConfirmResolve = async () => {
    if (!resolveNotes.trim()) { alert("กรุณาระบุวิธีแก้ไขปัญหา"); return; }
    const success = await handleStatusUpdate("Resolved", {
      lineUid: initialTicket.users?.line_uid,
      notes: resolveNotes + (extraNotes ? `\nหมายเหตุ: ${extraNotes}` : ""),
      module: resolveModule, issue_type: resolveIssueType
    });
    if (success) { setIsResolveModalOpen(false); showToast("ปิดงานเรียบร้อยแล้ว! กำลังกลับหน้าหลัก..."); setTimeout(() => { window.location.href = "/"; }, 1000); }
  };

  const handleConfirmEscalate = async () => {
    if (!escalateNotes.trim()) { alert("กรุณาระบุจุดประสงค์หรือรายละเอียดการส่งต่องาน"); return; }
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDepartmentId: escalateDept, notes: escalateNotes, status: "Escalated" })
      });
      if (res.ok) { setIsEscalateModalOpen(false); showToast(`ส่งต่องานไปยังฝ่ายเรียบร้อยแล้ว! ✅`); setTimeout(() => router.push("/"), 1500); }
      else showToast("เกิดข้อผิดพลาดในการส่งต่องาน");
    } catch { showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
    finally { setIsEscalating(false); }
  };

  const handleTransferJob = async (newAssignee: string, notes: string) => {
    if (!newAssignee) return;
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeName: newAssignee, notes })
      });
      if (res.ok) { setIsTransferModalOpen(false); showToast(`ส่งมอบงานให้คุณ ${newAssignee} สำเร็จ ✅`); setTimeout(() => router.push("/"), 1500); }
      else showToast("เกิดข้อผิดพลาดในการส่งมอบงาน");
    } catch { showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อส่งมอบงานได้"); }
    finally { setIsTransferring(false); }
  };

  const waitForImages = (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll('img'));
    return Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const reportEl = reportRef.current;
      const parent = reportEl.parentElement;
      const originalStyles = { position: parent?.style.position || "", top: parent?.style.top || "", left: parent?.style.left || "", opacity: parent?.style.opacity || "", zIndex: parent?.style.zIndex || "", visibility: parent?.style.visibility || "" };

      if (parent) { parent.style.position = "fixed"; parent.style.top = "0"; parent.style.left = "0"; parent.style.opacity = "1"; parent.style.visibility = "visible"; parent.style.zIndex = "99999"; }
      
      // Ensure Thai font is fully loaded for the canvas renderer
      if (typeof document !== "undefined" && (document as any).fonts) {
        try {
          await (document as any).fonts.load("1em 'IBM Plex Sans Thai'");
          await (document as any).fonts.ready;
        } catch (e) {
          console.warn("Font loading failed, proceeding with system fonts", e);
        }
      }
      await waitForImages(reportEl);
      await new Promise(r => setTimeout(r, 800));

      const canvas = await html2canvas(reportEl, { scale: 1.5, useCORS: true, logging: false, backgroundColor: "#ffffff", allowTaint: false });

      if (parent) { parent.style.position = originalStyles.position; parent.style.top = originalStyles.top; parent.style.left = originalStyles.left; parent.style.opacity = originalStyles.opacity; parent.style.zIndex = originalStyles.zIndex; parent.style.visibility = originalStyles.visibility; }

      const imgData = canvas.toDataURL("image/jpeg", 0.75);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob); setPdfUrl(url); setIsPDFPreviewOpen(true);
      showToast("สร้างพรีวิว PDF เรียบร้อยแล้ว ✨");
    } catch { showToast("มีข้อผิดพลาดในการสร้าง PDF ❌"); }
    finally { setIsGeneratingPDF(false); }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `Report_${initialTicket.ticket_no || 'Ticket'}.pdf`;
    link.click();
    showToast("ดาวน์โหลด PDF เรียบร้อยแล้ว ✅");
  };

  const handlePrintPDF = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) { printWindow.onload = () => { printWindow.print(); }; }
    else showToast("กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์เอกสาร");
  };

  const handleAssign = async () => {
    setAssigneeName("IT Support");
    setCurrentStatus("In Progress");
    setIsAssigning(true);
    showToast("รับงานสำเร็จ! ✅");
    try {
      const res = await fetch(`/api/tickets/${initialTicket.id}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assigneeName: "IT Support" }),
      });
      if (!res.ok) throw new Error();
    } catch { setAssigneeName(""); setCurrentStatus(initialTicket.status); showToast("รับงานไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setIsAssigning(false); }
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

  const handleCopyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(initialTicket.ticket_no);
      showToast("คัดลอก Ticket ID แล้ว");
    } catch { showToast("ไม่สามารถคัดลอกได้"); }
  };

  return (
    <div className={`dashboard-container ${theme}`} style={{ height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`} style={{
        width: isSidebarOpen ? "280px" : "90px", padding: isSidebarOpen ? "2.5rem 1rem" : "2rem 0.75rem",
        alignItems: isSidebarOpen ? "stretch" : "center", background: "var(--bg-glass)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease", position: 'relative'
      }}>
        <div className="sidebar-logo" style={{ padding: isSidebarOpen ? "0 1rem" : 0 }}>
          <div className="logo-icon-container" style={{ width: isSidebarOpen ? '42px' : '40px', height: isSidebarOpen ? '42px' : '40px' }}>
            <Activity className="logo-icon" size={isSidebarOpen ? 24 : 20} />
          </div>
          {isSidebarOpen && <span className="logo-text">NEO Support</span>}
        </div>

        <nav className="sidebar-nav" style={{ alignItems: isSidebarOpen ? 'stretch' : 'center', width: '100%', flex: 1, overflowY: 'auto', gap: '0.5rem' }}>
          <Link href="/" className="nav-item" title="Back to Dashboard" style={{ padding: "0.85rem", width: isSidebarOpen ? '100%' : '50px', justifyContent: isSidebarOpen ? 'flex-start' : 'center', marginBottom: '1.5rem', background: 'var(--bg-color)' }}>
            <ArrowLeft size={isSidebarOpen ? 20 : 24} />
            {isSidebarOpen && <span className="nav-label">กลับหน้าหลัก</span>}
          </Link>

          {isSidebarOpen && myActiveTickets.length > 0 && (
            <div style={{ padding: "0 0.8rem", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              งานที่กำลังทำ ({myActiveTickets.length})
            </div>
          )}

          {myActiveTickets.map(t => (
            <Link key={t.id} href={`/tickets/${t.id}`} className={`nav-item ${t.id === initialTicket.id ? 'active' : ''}`}
              style={{ padding: "0.85rem", width: isSidebarOpen ? '100%' : '50px', justifyContent: isSidebarOpen ? 'flex-start' : 'center', flexDirection: 'column', alignItems: isSidebarOpen ? 'flex-start' : 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <Clock size={16} />
                {isSidebarOpen && <span className="nav-label" style={{ fontWeight: 600 }}>{t.ticket_no}</span>}
              </div>
              {isSidebarOpen && <div style={{ fontSize: '0.7rem', opacity: 0.7, paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{t.users?.display_name} - {t.description}</div>}
            </Link>
          ))}
        </nav>

        <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          style={{ zIndex: 1002, border: theme === 'light' ? '2px solid white' : '2px solid var(--bg-color)' }}>
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      <main className="main-content" style={{ display: "flex", gap: "2rem", padding: "1.5rem 2rem", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left Side: Detail Card */}
        <div className="detail-panel" style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: "1.5rem", minHeight: 0 }}>
          <div className="stat-card animate-fade-in" style={{ padding: "1.5rem 2rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* Ticket Header Component */}
            <TicketHeader ticket={initialTicket} assigneeName={assigneeName} onCopyTicketId={handleCopyTicketId} />

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
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

              {/* Assign Section */}
              <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
                <label style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "1rem" }}>ASSIGNED STAFF</label>
                {assigneeName ? (
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>👨‍💻</div>
                    {assigneeName}
                  </div>
                ) : (
                  <button onClick={handleAssign} disabled={isAssigning} className="btn-claim-premium">
                    {isAssigning ? <div className="loading-spinner-small" /> : (
                      <>
                        <div className="claim-icon-wrapper"><Hand size={24} className="claim-icon" /></div>
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
                  <button onClick={() => setIsResolveModalOpen(true)} className="btn-primary"
                    style={{ flex: 2, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 10px 20px rgba(16,185,129,0.3)" }}>
                    <CheckCircle size={20} /> ปิดงาน (Resolve)
                  </button>
                  <button onClick={() => setIsTransferModalOpen(true)} className="btn-secondary"
                    style={{ flex: 1, padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", borderColor: "var(--primary)" }}>
                    <UserCheck size={20} /> ส่งมอบ Staff
                  </button>
                  <button onClick={() => setIsEscalateModalOpen(true)} className="btn-secondary"
                    style={{ flex: 1, padding: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(239, 68, 68, 0.05)", color: "var(--status-escalated-text)", borderColor: "var(--status-escalated-text)" }}>
                    <Share2 size={20} /> ส่งฝ่ายอื่น
                  </button>
                </div>
              )}
              {assigneeName && (
                <button onClick={handleGenerateAISummary} disabled={isGeneratingAI} className="btn-secondary"
                  style={{ width: "100%", padding: "0.85rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", borderStyle: "dashed", borderColor: "var(--primary)" }}>
                  {isGeneratingAI ? <div className="spinner-mini" /> : <><Zap size={16} /> {aiSummary ? "AI สรุปใหม่" : "ให้ AI สรุปงาน"}</>}
                </button>
              )}
              {currentStatus === "Resolved" && (
                <button onClick={() => setIsResolveModalOpen(true)} className="btn-secondary" style={{ width: "100%", padding: "1rem", borderRadius: "14px" }}>
                  แก้ไขข้อมูลการปิดงาน
                </button>
              )}
              {["Resolved", "Closed"].includes(currentStatus) && (
                <button onClick={() => { handleExportPDF(); }} className="btn-primary"
                  style={{ padding: "0.6rem 1rem", borderRadius: "14px", display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--primary)", boxShadow: "0 4px 12px var(--primary-glow)", zIndex: 50 }}>
                  <FileText size={18} /><span style={{ fontSize: "0.85rem", fontWeight: 700 }}>PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-glass)", backdropFilter: "blur(20px)", borderRadius: "32px", border: "1px solid var(--border-color)", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
          <div className="chat-area" ref={reportRef} data-pdf-report style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFileAndSend(f); }}>
            
            {isDragOver && <div style={{ position: "absolute", inset: "1rem", borderRadius: "20px", background: "rgba(99, 102, 241, 0.1)", border: "3px dashed var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <span style={{ background: "var(--bg-surface)", padding: "1.5rem 2.5rem", borderRadius: "16px", fontWeight: 800, color: "var(--primary)" }}>วางรูปภาพเพื่อส่งให้ลูกค้า</span>
            </div>}

            {/* Message Bubbles */}
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id ?? idx} msg={msg} isIT={msg.direction === "outbound"} setAnnotationImage={setAnnotationImage} setSelectedImage={setSelectedImage} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          {initialSettings?.quick_replies?.length > 0 && (
            <div style={{ padding: "0.75rem 2rem 0", background: "rgba(0,0,0,0.2)", borderTop: "1px solid var(--border-color)", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} className="text-amber-500" /> สำเร็จรูป:
              </span>
              {initialSettings.quick_replies.map((reply: string, idx: number) => (
                <button key={idx} type="button" onClick={() => setReplyText(reply)}
                  style={{ padding: "0.3rem 0.85rem", borderRadius: "20px", border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "var(--primary)", fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.4)"; }} title={reply}>
                  {reply.length > 25 ? reply.substring(0, 25) + "…" : reply}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Component */}
          <ChatInput 
            ticketId={initialTicket.id} 
            onSendMessage={handleSendReply} 
            isLoading={isSending || isUploadingImage} 
            value={replyText}
            onChange={setReplyText}
          />
        </div>
      </main>

      {/* Modals */}
      {isResolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle size={28} className="text-green-500" /> ปิดงาน / Resolved Ticket</h2>
            <div className="form-group">
              <label style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem', display: 'block' }}>โมดูล / ระบบ</label>
              <select value={resolveModule} onChange={e => setResolveModule(e.target.value)} style={{ padding: '0.8rem', background: '#ffffff', color: '#1f2937', border: '2px solid #e2e8f0', borderRadius: '12px', width: '100%', fontSize: '1rem' }}>
                {initialSettings?.modules?.map((m: any, idx: number) => <option key={idx} value={m} style={{ background: '#ffffff', color: '#1f2937' }}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem', display: 'block' }}>ประเภทงาน</label>
              <select value={resolveIssueType} onChange={e => setResolveIssueType(e.target.value)} style={{ padding: '0.8rem', background: '#ffffff', color: '#1f2937', border: '2px solid #e2e8f0', borderRadius: '12px', width: '100%', fontSize: '1rem' }}>
                {initialSettings?.issue_types?.map((t: any, idx: number) => <option key={idx} value={t} style={{ background: '#ffffff', color: '#1f2937' }}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>วิธีแก้ไขปัญหา (Resolution Notes) *</label>
              <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {initialSettings?.resolution_notes?.map((note: any, idx: number) => <button key={idx} type="button" onClick={() => setResolveNotes(note)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}>+ {note}</button>)}
              </div>
              <textarea rows={3} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="อธิบายขั้นตอนการแก้ไขงาน..." style={{ borderRadius: "12px", marginBottom: "1rem", background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '1rem' }} />
              <label>หมายเหตุเพิ่มเติม (Optional)</label>
              <textarea rows={2} value={extraNotes} onChange={e => setExtraNotes(e.target.value)} placeholder="หมายเหตุถึงทีมงานหรือลูกค้า..." style={{ borderRadius: "12px", background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '1rem' }} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsResolveModalOpen(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleConfirmResolve} disabled={isUpdatingStatus} style={{ background: "var(--primary)" }}>{isUpdatingStatus ? "Saving..." : "ยืนยันปิดงาน"}</button>
            </div>
          </div>
        </div>
      )}

      {isEscalateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Share2 size={28} className="text-blue-500" /> ส่งต่องานไปที่ไหน?</h2>
            <div className="form-group">
              <label>หน่วยงาน / ฝ่ายที่จะส่งต่อ (Department Escalation)</label>
              <select value={escalateDept} onChange={e => setEscalateDept(e.target.value)} style={{ padding: "1rem", fontSize: "1.1rem" }}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                {departments.length === 0 && <option value="wait" disabled>กำลังโหลดแผนก...</option>}
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>รายละเอียดประกอบการส่งต่อ (Handover Notes) *</label>
              <textarea rows={3} required value={escalateNotes} onChange={e => setEscalateNotes(e.target.value)} placeholder="ระบุสิ่งที่ทำไปแล้ว หรือทำไมต้องส่งต่อ..." style={{ borderRadius: "12px", background: "var(--bg-color)" }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>* การส่งต่อจะเปลี่ยนสถานะเป็น <strong style={{ color: 'var(--status-escalated-text)' }}>Escalated</strong> และบันทึกลงประวัติการส่งมอบงาน</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsEscalateModalOpen(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleConfirmEscalate} disabled={isEscalating || !escalateDept || !escalateNotes.trim()} style={{ background: "var(--accent)" }}>
                {isEscalating ? "กำลังส่งต่อ..." : "ยืนยันการส่งต่อ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: "24px", padding: "2.5rem", maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Share2 size={28} style={{ color: "var(--primary)" }} /> ส่งมอบงานให้เพื่อนทีม IT</h2>
            <div className="form-group">
              <label>เลือกพนักงานที่จะรับช่วงต่อ</label>
              <select value={transferStaffName} onChange={e => setTransferStaffName(e.target.value)} style={{ padding: "1rem", fontSize: "1.1rem" }}>
                <option value="">-- เลือกรายชื่อ Staff --</option>
                {staffList.filter(s => s.display_name !== assigneeName).map(s => <option key={s.id} value={s.display_name}>{s.display_name}</option>)}
                {staffList.length === 0 && <option disabled>กำลังโหลดรายชื่อพนักงาน...</option>}
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>หมายเหตุการส่งมอบ (Handover Notes)</label>
              <textarea rows={3} value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="ระบุสิ่งที่ทำไปแล้ว หรือสิ่งที่ต้องทำต่อ..." style={{ borderRadius: "12px", background: "var(--bg-color)" }} />
            </div>
            <div className="modal-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-secondary" onClick={() => setIsTransferModalOpen(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={() => handleTransferJob(transferStaffName, transferNotes)} disabled={!transferStaffName || isTransferring} style={{ background: "var(--primary)" }}>
                {isTransferring ? "กำลังส่งมอบ..." : "ยืนยันการส่งมอบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.92)', overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem', cursor:'zoom-out' }}>
          <button onClick={() => setSelectedImage(null)} style={{ position:'fixed', top:'1rem', right:'1rem', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', zIndex:1 }}><X size={24}/></button>
          <img src={selectedImage} alt="Zoomed" onClick={e => e.stopPropagation()} style={{ maxWidth:'100%', height:'auto', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', cursor:'default', marginTop: '2rem' }} />
        </div>
      )}

      {/* PDF Preview Modal */}
      {isPDFPreviewOpen && (
        <div className="modal-overlay" style={{ zIndex: 10002 }}>
          <div className="modal-content" style={{ maxWidth: "900px", width: "95%", height: "90vh", display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>พรีวิวเอกสาร / PDF Preview</h2>
              <button onClick={() => { setIsPDFPreviewOpen(false); if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); setPdfBlob(null); }} className="btn-icon-modern"><X size={20} /></button>
            </div>
            <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pdfUrl ? <iframe src={`${pdfUrl}#toolbar=0`} style={{ width: "100%", height: "100%", border: "none" }} title="PDF Preview" /> : <div className="loading-spinner" />}
            </div>
            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button className="btn-secondary" onClick={() => setIsPDFPreviewOpen(false)} style={{ padding: "0.75rem 1.5rem" }}>ยกเลิก</button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-secondary" onClick={handlePrintPDF} style={{ padding: "0.75rem 1.5rem", display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>🖨️ พิมพ์ (Print)</button>
                <button className="btn-primary" onClick={handleDownloadPDF} style={{ padding: "0.75rem 1.5rem", display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)' }}>💾 บันทึก (Save PDF)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Annotation Modal */}
      {annotationImage && <ImageAnnotationModal imageUrl={annotationImage} onClose={() => setAnnotationImage(null)} onSend={uploadFileAndSend} />}

      {/* Toast & Loading */}
      {toast.show && <div className="toast-notification"><Info size={18} /> {toast.message}</div>}
      {isGeneratingPDF && (
        <div className="modal-overlay" style={{ zIndex: 10001, background: "rgba(0,0,0,0.7)" }}>
          <div className="modal-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
            <div className="loading-spinner" style={{ width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <p style={{ fontWeight: 600 }}>กำลังจัดเตรียมเอกสาร PDF...</p>
          </div>
        </div>
      )}

      {/* PDF Template (hidden) */}
      <div style={{ position: "fixed", top: "-20000px", left: "-20000px", opacity: 0, pointerEvents: "none", zIndex: -100 }} data-pdf-report>
        <div ref={reportRef} style={{ width: "800px", padding: "60px", background: "white", color: "black", fontFamily: "'IBM Plex Sans Thai', sans-serif", display: "block", textAlign: "left" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #4f46e5', paddingBottom: '20px' }}>
            <div style={{ textAlign: 'left' }}><div style={{ color: "#4f46e5", margin: 0, fontSize: "28px", fontWeight: 700 }}>NEO SUPPORT</div><p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>Service Report & Technical Summary</p></div>
            <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 700, margin: 0, fontSize: "18px" }}>Ticket: {initialTicket.ticket_no}</p><p style={{ color: "#666", margin: "5px 0" }}>Date: {new Date().toLocaleDateString('th-TH')}</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'left' }}><h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', fontSize: '16px', fontWeight: 700 }}>CLIENT INFO</h3><p style={{ margin: '5px 0' }}><strong>Hospital:</strong> {initialTicket.users?.hospitals?.name || '-'}</p><p style={{ margin: '5px 0' }}><strong>Department:</strong> {initialTicket.users?.department || '-'}</p><p style={{ margin: '5px 0' }}><strong>Reporter:</strong> {initialTicket.users?.display_name || '-'}</p></div>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'left' }}><h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', fontSize: '16px', fontWeight: 700 }}>ISSUE DETAILS</h3><p style={{ margin: '5px 0' }}><strong>Type:</strong> {initialTicket.issue_type || '-'}</p><p style={{ margin: '5px 0' }}><strong>Module:</strong> {initialTicket.module || '-'}</p><p style={{ margin: '5px 0' }}><strong>Status:</strong> {currentStatus === 'Resolved' ? 'แก้ไขเสร็จสิ้น' : 'ปิดงาน'}</p></div>
          </div>
          <div style={{ marginBottom: '40px', textAlign: 'left' }}><h3 style={{ fontSize: '18px', color: '#4f46e5', borderLeft: '4px solid #4f46e5', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>PROBLEM DESCRIPTION</h3><p style={{ background: '#fff', border: '1px solid #eee', padding: '15px', borderRadius: '8px', lineHeight: '1.6', minHeight: '60px' }}>{initialTicket.description}</p></div>
          <div style={{ marginBottom: '40px', textAlign: 'left' }}><h3 style={{ fontSize: '18px', color: '#10b981', borderLeft: '4px solid #10b981', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>RESOLUTION & NOTES</h3><div style={{ background: '#f0fdf4', border: '1px solid #10b981', padding: '20px', borderRadius: '8px', lineHeight: '1.6' }}><p style={{ margin: '5px 0' }}><strong>วิธีแก้ไข:</strong> {initialTicket.notes || resolveNotes || 'N/A'}</p>{initialTicket.notes?.includes('\nหมายเหตุ:') && <p style={{ marginTop: '10px', borderTop: '1px dashed #10b981', paddingTop: '10px' }}>รายละเอียดเพิ่มเติมตามบันทึกระบบ</p>}</div></div>
          <div style={{ marginBottom: '40px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', color: '#4f46e5', borderLeft: '4px solid #4f46e5', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>AI ANALYSIS & SATISFACTION</h3>
            {aiSummary && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', lineHeight: '1.6', marginBottom: '20px' }}><p style={{ margin: '5px 0', color: '#4f46e5', fontWeight: 700 }}>AI สรุปผลการตรวจสอบ:</p><div style={{ fontSize: '13px', color: '#475569' }}>{aiSummary.split('\n').map((line: string, i: number) => <p key={i} style={{ margin: '0 0 4px 0' }}>{line}</p>)}</div></div>}
            {(initialTicket.rating || 0) > 0 && <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '14px' }}>ความพึงพอใจของลูกค้า</p><p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>ประเมินโดยผู้แจ้งงานเมื่อปิดใบงาน</p></div><div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontSize: '24px', letterSpacing: '4px' }}>{"⭐".repeat(initialTicket.rating || 0)}</p><p style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>{initialTicket.rating} / 5 คะแนน</p></div></div>}
          </div>
          {(() => { const chatImages = messages.filter(m => m.message_type === 'image' && m.content.startsWith('http')).slice(0, 8); if (chatImages.length === 0) return null; return (<div style={{ marginTop: '20px' }}><h3 style={{ fontSize: '18px', color: '#4f46e5', borderLeft: '4px solid #4f46e5', paddingLeft: '10px', marginBottom: '15px', fontWeight: 700 }}>ATTACHED COMMUNICATIONS</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>{chatImages.map((img, idx) => (<div key={idx} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', height: chatImages.length > 2 ? '200px' : '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', pageBreakInside: 'avoid' }}><img src={img.content} alt={`Attachment ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>))}</div></div>); })()}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '100px' }}><div style={{ textAlign: 'center', width: '250px' }}><p style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}>&nbsp;</p><p style={{ fontWeight: 600 }}>({assigneeName || 'IT Support Specialist'})</p><p style={{ fontSize: '12px', color: '#666' }}>Responsible Engineer</p></div></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-claim-premium { width: 100%; padding: 1.25rem 1.5rem; border-radius: 18px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; border: none; display: flex; align-items: center; gap: 1.25rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 25px var(--primary-glow); position: relative; overflow: hidden; }
        .btn-claim-premium::before { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: 0.5s; }
        .btn-claim-premium:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 15px 35px var(--primary-glow), 0 0 15px var(--accent-glow); }
        .btn-claim-premium:hover::before { left: 100%; }
        .btn-claim-premium:active { transform: translateY(-2px) scale(0.98); }
        .btn-claim-premium:disabled { opacity: 0.7; filter: grayscale(0.5); cursor: not-allowed; transform: none; }
        .claim-icon-wrapper { width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); transition: transform 0.3s ease; }
        .btn-claim-premium:hover .claim-icon-wrapper { transform: rotate(-10deg) scale(1.1); background: rgba(255, 255, 255, 0.3); }
        .loading-spinner-small { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @media (max-width: 1200px) { .main-content { flex-direction: column !important; padding: 1rem !important; gap: 1.5rem !important; overflow-y: auto !important; } .detail-panel { flex: none !important; width: 100% !important; } .sidebar { display: none !important; } }
        .modal-content { max-width: 600px; width: 95%; max-height: 90vh; overflow-y: auto; }
        select { background-color: var(--bg-color) !important; color: white !important; border: 1px solid var(--border-color) !important; }
      `}</style>
    </div>
  );
}
