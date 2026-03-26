"use client";

import { useEffect, useState } from "react";
import { User, Hospital, Building2, CheckCircle2, ShieldCheck, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLiff } from "../components/LiffProvider";
import { getLiffHospitals, registerLiffUser } from "../liffActions";

export default function RegisterPage() {
  const { profile, liff, isRegistered, isLoading: contextLoading } = useLiff();
  const [formData, setFormData] = useState({
    fullName: "",
    hospitalId: "",
    department: "",
  });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchHospitals() {
      const data = await getLiffHospitals();
      setHospitals(data);
    }
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (!contextLoading && isRegistered) {
      router.push("/liff/menu");
    }
    
    // Auto-fill name if profile is available
    if (profile?.displayName && !formData.fullName) {
      setFormData(prev => ({ ...prev, fullName: profile.displayName }));
    }
  }, [contextLoading, isRegistered, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
       // In Case profile not yet available, trigger login if needed
       if (liff && !liff.isLoggedIn()) liff.login();
       return;
    }

    setIsSubmitting(true);
    
    const result = await registerLiffUser({
      line_uid: profile.userId,
      display_name: formData.fullName, // Use the name from form for accuracy
      hospital_id: formData.hospitalId,
      department: formData.department
    });

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => router.push("/liff/menu"), 1500);
    } else {
      alert("Registration failed: " + result.error);
    }
    setIsSubmitting(false);
  };

  if (contextLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="success-container animate-fade-in">
        <div className="success-icon">
           <CheckCircle2 color="white" size={40} />
        </div>
        <h2>ลงทะเบียนสำเร็จ!</h2>
        <p>ยินดีต้อนรับเข้าสู่นีโอซัพพอร์ตครับ</p>
        <style jsx>{`
          .success-container {
            display: flex; flex-direction: column; items-center: center; justify-content: center;
            min-height: 80vh; text-align: center; padding: 2rem;
          }
          .success-icon {
            width: 80px; height: 80px; background: #10b981; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.5rem; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          }
          h2 { font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin-bottom: 0.5rem; }
          p { color: var(--text-muted); font-weight: 500; }
          .animate-fade-in { animation: fadeIn 0.6s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="register-page animate-slide-up">
      <div className="header-section">
        <div className="accent-bar" />
        <h1>ลงทะเบียน<br/>เข้าใช้งานระบบ</h1>
        <p>กรุณากรอกข้อมูลเพื่อใช้ในการแจ้งใบงาน<br/>และติดตามสถิติการซ่อมครับ</p>
      </div>

      <form onSubmit={handleSubmit} className="register-form">
        <div className="input-group">
          <label>ชื่อ - นามสกุล *</label>
          <div className="input-wrapper">
            <User className="icon" size={18} />
            <input 
              required
              type="text"
              placeholder="กรอกชื่อและนามสกุล..."
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
        </div>

        <div className="input-group">
          <label>โรงพยาบาล / หน่วยงาน *</label>
          <div className="input-wrapper">
            <Hospital className="icon" size={18} />
            <select 
              required
              value={formData.hospitalId}
              onChange={(e) => setFormData({...formData, hospitalId: e.target.value})}
            >
              <option value="" disabled>เลือกโรงพยาบาล...</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <ChevronDown className="select-arrow" size={16} />
          </div>
        </div>

        <div className="input-group">
          <label>แผนก / วอร์ด *</label>
          <div className="input-wrapper">
            <Building2 className="icon" size={18} />
            <input 
              required
              type="text"
              placeholder="เช่น ฝั่งบริหาร / หอผู้ป่วยชาย..."
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
          </div>
        </div>

        <div className="security-notice">
           <ShieldCheck size={18} className="shield" />
           <p>แอปพลิเคชันจะจดจำตัวตนของคุณผ่าน LINE อัตโนมัติ เพื่อความสะดวกครับ</p>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !formData.fullName || !formData.hospitalId || !formData.department}
          className="btn-submit"
        >
          {isSubmitting ? <div className="spinner" /> : <>ยืนยันการลงทะเบียน <ArrowRight size={20} /></>}
        </button>
      </form>

      <div className="footer">
        <p>Secured by NEO Support System</p>
      </div>

      <style jsx>{`
        .register-page { padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 2rem; }
        .header-section { margin-top: 1rem; }
        .accent-bar { width: 48px; height: 4px; background: var(--primary); border-radius: 20px; margin-bottom: 1rem; }
        h1 { font-size: 1.85rem; line-height: 1.25; margin-bottom: 0.75rem; }
        p { font-size: 0.95rem; color: var(--text-muted); font-weight: 500; line-height: 1.6; }
        
        .register-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-group label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-left: 4px; }
        
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper .icon { position: absolute; left: 1rem; color: #94a3b8; transition: 0.2s; }
        
        input, select {
          width: 100%; padding: 1.1rem 1rem 1.1rem 3.25rem;
          border-radius: 16px; border: 2px solid #f1f5f9; background: white;
          font-size: 1.05rem; font-weight: 600; color: var(--text-heading);
          transition: all 0.2s; outline: none;
        }
        input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-glow); }
        .input-wrapper:focus-within .icon { color: var(--primary); }
        
        .select-arrow { position: absolute; right: 1rem; color: #94a3b8; pointer-events: none; }
        select { appearance: none; cursor: pointer; }

        .security-notice {
          display: flex; gap: 0.75rem; align-items: center; padding: 1rem;
          background: #f0f7ff; border: 1px solid #e0f2fe; border-radius: 16px;
        }
        .shield { color: var(--primary); flex-shrink: 0; }
        .security-notice p { font-size: 0.8rem; color: #0369a1; line-height: 1.4; font-weight: 600; }

        .btn-submit {
          width: 100%; padding: 1.25rem; border-radius: 20px;
          background: var(--primary); color: white; border: none;
          font-size: 1.1rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.75rem;
          transition: all 0.2s; margin-top: 1rem;
          box-shadow: 0 10px 20px var(--primary-glow);
        }
        .btn-submit:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .btn-submit:active { transform: scale(0.98); }

        .spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .footer { text-align: center; margin-top: auto; padding-bottom: 2rem; }
        .footer p { font-size: 0.65rem; color: #cbd5e1; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }

        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
