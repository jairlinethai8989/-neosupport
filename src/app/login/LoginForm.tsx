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
    <div className="technical-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
      <div className="scanner-line" style={{ background: 'var(--primary)', opacity: 0.3 }} />
      
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', padding: '10px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sharp)', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '2px' }}>NEO_SUPPORT_v3</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '1px' }}>SECURE_COMMAND_INTERFACE // ENTER_CREDENTIALS</p>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255, 123, 114, 0.1)', border: '1px solid var(--status-escalated-text)', borderRadius: 'var(--radius-sharp)', color: 'var(--status-escalated-text)', fontSize: '0.8rem', textAlign: 'center', fontFamily: 'monospace' }}>
          [AUTH_ERROR]: {errorMsg.toUpperCase()}
        </div>
      )}

      <form action={isLogin ? login : signup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>USER_ID</label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            required 
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: 'var(--text-heading)', outline: 'none', fontFamily: 'monospace' }} 
            placeholder="e.g. admin"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>AUTH_KEY</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: 'var(--text-heading)', outline: 'none', fontFamily: 'monospace' }} 
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
            letterSpacing: '2px',
            boxShadow: '0 0 20px var(--primary-glow)',
            border: 'none'
          }}>
          {isLogin ? 'INITIALIZE_SESSION' : 'REGISTER_NODE'}
        </button>
      </form>

      {isLogin && (
        <>
          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>SECONDARY_AUTH</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          <a 
            href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINE_LOGIN_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent((process.env.NEXT_PUBLIC_APP_URL || '') + '/api/line/callback')}&state=login_staff&scope=profile%20openid`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              padding: '0.85rem', 
              backgroundColor: '#06C755', 
              color: 'white', 
              borderRadius: 'var(--radius-sharp)', 
              textDecoration: 'none', 
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '1px',
              transition: 'opacity 0.2s',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Image 
              src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" 
              alt="LINE Logo" 
              width={20} 
              height={20}
              style={{ width: '18px', height: '18px' }}
            />
            LINK_VIA_LINE_PROTOCOL
          </a>
        </>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
        {isLogin ? "UNREGISTERED_ENTITY? " : "EXISTING_NODE? "}
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 900, textDecoration: 'underline' }}>
          {isLogin ? 'CREATE_ACCOUNT' : 'VALIDATE_IDENTITY'}
        </button>
      </div>
    </div>
  );
}
