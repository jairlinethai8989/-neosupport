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
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-[#0066cc] p-2 rounded-lg text-white">
                <Activity size={20} />
             </div>
             <div>
                <h1 className="text-lg font-bold text-[#0f172a]">NEO Support</h1>
                <p className="text-[10px] text-[#64748b] font-bold tracking-widest">EXTERNAL_WORK_INTERFACE</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${
              isResolved ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef9c3] text-[#854d0e]'
            }`}>
              {ticket.status === 'Resolved' ? 'RESOLVED' : ticket.status === 'Closed' ? 'CLOSED' : 'IN_PROGRESS'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          {/* Ticket ID Banner */}
          <div className="bg-[#0f172a] text-white px-8 py-6 flex justify-between items-center">
            <div>
              <p className="text-[#94a3b8] text-xs font-bold mb-1">REFERENCE_NO</p>
              <h2 className="text-3xl font-mono font-black tracking-tighter">#{ticket.ticket_no}</h2>
            </div>
            <div className="text-right">
              <p className="text-[#94a3b8] text-xs font-bold mb-1">PRIORITY</p>
              <span className={`text-xs font-black px-2 py-1 rounded border ${
                ticket.priority === 'Critical' ? 'border-[#ef4444] text-[#ef4444]' : 
                ticket.priority === 'High' ? 'border-[#f97316] text-[#f97316]' : 'border-[#22c55e] text-[#22c55e]'
              }`}>
                {(ticket.priority || 'Medium').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-[#0066cc] mt-1"><Hospital size={18} /></div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748b] block">HOSPITAL_NODE</label>
                    <p className="font-bold text-[#334155]">{ticket.users?.hospitals?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-[#0066cc] mt-1"><User size={18} /></div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748b] block">REPORTER</label>
                    <p className="font-bold text-[#334155]">{ticket.users?.display_name} ({ticket.users?.department})</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-[#0066cc] mt-1"><Clock size={18} /></div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748b] block">CREATED_AT</label>
                    <p className="font-bold text-[#334155]">{new Date(ticket.created_at).toLocaleString('th-TH')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-[#0066cc] mt-1"><Activity size={18} /></div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748b] block">ASSIGNED_TO_DEPT</label>
                    <p className="font-bold text-[#ef4444]">{ticket.departments?.name || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-[#f1f5f9]" />

            {/* Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#64748b]" />
                <h3 className="font-bold text-[#0f172a]">รายละเอียดปัญหา (Objective)</h3>
              </div>
              <div className="bg-[#f8fafc] p-6 rounded-xl border border-[#e2e8f0] text-[#334155] leading-relaxed italic">
                &quot;{ticket.description}&quot;
              </div>
            </div>

            {/* Handover Notes if any */}
            {ticket.handover_notes && (
              <div className="bg-[#fff9eb] border border-[#fef08a] p-4 rounded-xl">
                 <label className="text-[10px] font-bold text-[#854d0e] block mb-1">💡 บันทึกความต้องการส่งต่อ (Handover Notes)</label>
                 <p className="text-sm text-[#713f12]">{ticket.handover_notes}</p>
              </div>
            )}

            {/* Action Form */}
            {!isResolved ? (
              <PublicTicketForm ticketId={ticket.id} currentTicketId={ticket.ticket_no} />
            ) : (
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-8 rounded-2xl text-center space-y-3">
                <div className="flex justify-center">
                  <div className="bg-[#22c55e] p-3 rounded-full text-white">
                    <CheckCircle size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#166534]">ปิดงานสำเร็จแล้ว (Ticket Resolved)</h3>
                <p className="text-[#15803d]">เมื่อ {new Date(ticket.updated_at).toLocaleString('th-TH')}</p>
                <div className="pt-4 border-t border-[#dcfce7] mt-4 text-left">
                  <label className="text-[10px] font-bold text-[#166534] block mb-1">บันทึกการแก้ไข:</label>
                  <p className="text-[#166534] font-medium">{ticket.notes || 'ไม่มีบันทึกพิเศษ'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-center text-[#94a3b8] text-[10px] mt-8 font-bold tracking-widest">
          SYSTEM_MANAGED_BY_NEO_PROTOCOL • © 2026
        </p>
      </main>
    </div>
  );
}
