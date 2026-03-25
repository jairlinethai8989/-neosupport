'use client'

import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'
import { useState } from 'react'
import Image from 'next/image'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const errorMsg = searchParams?.get('error')
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="technical-panel" style={{ width: '100%', maxWidth: '440px', padding: '3rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '2.25rem', fontWeight: 800 }}>NEO Support</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>ระบบจัดการงาน IT สำหรับโรงพยาบาล</p>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--status-escalated-bg)', border: '1px solid var(--status-escalated-text)', borderRadius: '12px', color: 'var(--status-escalated-text)', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>
          เกิดข้อผิดพลาด: {errorMsg}
        </div>
      )}

      <form action={isLogin ? login : signup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>ชื่อผู้ใช้งาน (Username)</label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            required 
            className="input-base"
            style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-heading)', outline: 'none', fontWeight: 600 }} 
            placeholder="เช่น: admin"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>รหัสผ่าน (Password)</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="input-base"
            style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-heading)', outline: 'none', fontWeight: 600 }} 
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          style={{ 
            marginTop: '0.5rem', 
            padding: '1rem', 
            fontSize: '1rem', 
            fontWeight: 800, 
            width: '100%', 
            border: 'none',
            borderRadius: '12px'
          }}>
          {isLogin ? 'เข้าสู่ระบบ' : 'ลงชื่อใช้งาน'}
        </button>
      </form>

      {isLogin && (
        <>
          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>หรือ</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          <a 
            href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINE_LOGIN_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent((process.env.NEXT_PUBLIC_APP_URL || '') + '/api/line/callback')}&state=login_staff&scope=profile%20openid`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              padding: '0.9rem', 
              backgroundColor: '#06C755', 
              color: 'white', 
              borderRadius: '12px', 
              textDecoration: 'none', 
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'opacity 0.2s',
              border: 'none'
            }}
          >
            <Image 
              src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" 
              alt="LINE Logo" 
              width={20} 
              height={20}
              style={{ width: '20px', height: '20px' }}
            />
            เข้าสู่ระบบด้วย LINE
          </a>
        </>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
        {isLogin ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
          {isLogin ? 'สมัครสมาชิกใหม่' : 'ไปที่หน้าเข้าสู่ระบบ'}
        </button>
      </div>
    </div>
  );
}
