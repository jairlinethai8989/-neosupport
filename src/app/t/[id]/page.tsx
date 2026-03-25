import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { Activity, Clock, Hospital, User, FileText, CheckCircle, Zap } from 'lucide-react';
import PublicTicketForm from './PublicTicketForm';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("ticket_no, description, users!reporter_id(hospitals(name))")
    .eq("id", id)
    .single();

  if (!ticket) return { title: "ไม่พบใบงาน - NEO Support" };

  const hospital = (ticket.users as any)?.hospitals?.name || "ไม่ระบุหน่วยงาน";
  const desc = ticket.description.length > 50 ? ticket.description.substring(0, 47) + "..." : ticket.description;

  return {
    title: `[งานส่งต่อ] #${ticket.ticket_no} - ${hospital}`,
    description: `🏥 ${hospital}\n🛠️ ปัญหา: ${desc}`,
    openGraph: {
      title: `🛠️ งานส่งต่อ #${ticket.ticket_no}`,
      description: `แจ้งโดย: ${hospital}\nอาการ: ${desc}`,
      type: "website",
    }
  };
}

export default async function PublicTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch ticket using admin client (since it's a public page)
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      users!reporter_id (
        display_name,
        department,
        hospitals (
          name
        )
      ),
      departments!current_department_id (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error || !ticket) {
    return notFound();
  }

  const isResolved = ['Resolved', 'Closed'].includes(ticket.status);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans">
      <header className="bg-white border-b border-[#e2e8f0] py-5 px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-[#0066cc] p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                <Activity size={22} />
             </div>
             <div>
                <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight">NEO Support</h1>
                <p className="text-[10px] text-[#64748b] font-bold tracking-[0.2em] uppercase">External Service Portal</p>
             </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold ${
              isResolved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
            <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></span>
            {isResolved ? 'ดำเนินการเสร็จสิ้น' : 'กำลังดำเนินการ (In Progress)'}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-10 px-6">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-[#e2e8f0] overflow-hidden">
          {/* Main Info Section */}
          <div className="bg-[#0f172a] text-white p-8 md:p-12 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
              <div>
                <span className="text-blue-400 text-[11px] font-bold tracking-widest uppercase mb-2 block">Ticket Reference</span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">#{ticket.ticket_no}</h2>
              </div>
              <div className="flex flex-col md:items-end gap-2">
                <span className="text-slate-400 text-[11px] font-bold tracking-widest uppercase">ความสำคัญ (Priority)</span>
                <span className={`text-sm font-bold px-4 py-1 rounded-lg border-2 ${
                  ticket.priority === 'Critical' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 
                  ticket.priority === 'High' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                }`}>
                  {(ticket.priority || 'Medium').toUpperCase()}
                </span>
              </div>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Grid Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Hospital size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">หน่วยงานผู้แจ้ง</label>
                    <p className="text-lg font-bold text-slate-800">{ticket.users?.hospitals?.name || 'ไม่ระบุ'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <User size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ผู้รับผิดชอบ/ผู้แจ้ง</label>
                    <p className="text-lg font-bold text-slate-800">{ticket.users?.display_name} <span className="text-slate-400 font-medium">({ticket.users?.department})</span></p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Clock size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">วันเวลาที่สร้าง</label>
                    <p className="text-lg font-bold text-slate-800">{new Date(ticket.created_at).toLocaleString('th-TH')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Activity size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ส่วนงานที่รับผิดชอบ</label>
                    <p className="text-lg font-bold text-red-600">{ticket.departments?.name || 'รอดำเนินการ'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Description Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                <h3 className="text-lg font-bold text-slate-800">รายละเอียดงาน (Work Details)</h3>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-slate-700 text-lg leading-relaxed font-medium">
                &quot;{ticket.description}&quot;
              </div>
            </div>

            {/* Handover Section */}
            {ticket.handover_notes && (
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4 items-start">
                 <div className="bg-amber-400 p-2 rounded-lg text-white mt-1">
                   <Zap size={18} fill="currentColor" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 block">บันทึกส่งมอบงาน (Handover Notes)</label>
                    <p className="text-slate-800 font-semibold">{ticket.handover_notes}</p>
                 </div>
              </div>
            )}

            {/* Form or Result */}
            <div className="mt-8">
              {!isResolved ? (
                <PublicTicketForm ticketId={ticket.id} currentTicketId={ticket.ticket_no} />
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-3xl text-center space-y-4 transition-all hover:shadow-lg hover:shadow-emerald-50">
                  <div className="flex justify-center">
                    <div className="bg-emerald-500 p-4 rounded-full text-white shadow-xl shadow-emerald-200">
                      <CheckCircle size={40} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-800">ดำเนินการแก้ไขเรียบร้อยแล้ว</h3>
                  <p className="text-emerald-600 font-medium italic">ส่งผลลัพธ์กลับไปยังเจ้าหน้าที่ IT เมื่อ {new Date(ticket.updated_at).toLocaleString('th-TH')} น.</p>
                  <div className="pt-6 border-t border-emerald-100 mt-6 text-left max-w-lg mx-auto">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">บันทึกสรุปงาน:</label>
                    <p className="text-emerald-900 font-bold text-lg bg-white p-4 rounded-xl shadow-inner-sm">{ticket.notes || 'ไม่มีบันทึกเพิ่มเติม'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-center text-slate-400 text-[10px] mt-12 font-bold tracking-[0.3em] uppercase opacity-50">
          Powered by NEO Protocol Security Architecture • 2026
        </p>
      </main>
    </div>
  );
}
