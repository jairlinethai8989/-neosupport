'use client'

import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'
import { useState, Suspense } from 'react'

// ─── Inner component that uses useSearchParams ───────────────
// Must be wrapped in <Suspense> by the parent to avoid build errors
function LoginForm() {
  const searchParams = useSearchParams()
  const errorMsg = searchParams?.get('error')
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '1.75rem' }}>🏥 NEO Support</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Sign in to manage IT Support tickets</p>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255, 123, 114, 0.1)', border: '1px solid var(--status-escalated-text)', borderRadius: '8px', color: 'var(--status-escalated-text)', fontSize: '0.9rem', textAlign: 'center' }}>
          {errorMsg}
        </div>
      )}

      <form action={isLogin ? login : signup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>Username</label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            required 
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-heading)', outline: 'none', transition: 'border-color 0.2s' }} 
            placeholder="e.g. admin"
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-heading)', outline: 'none', transition: 'border-color 0.2s' }} 
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          style={{ marginTop: '0.5rem', padding: '0.85rem', fontSize: '1rem', fontWeight: 'bold' }}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {isLogin && (
        <>
          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
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
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="" style={{ width: '20px', height: '20px' }} />
            Sign in with LINE
          </a>
        </>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </div>
    </div>
  )
}

// ─── Outer page wraps LoginForm in Suspense ──────────────────
// Required by Next.js 14+ when using useSearchParams() in a page
export default function LoginPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-color)', fontFamily: 'inherit' }}>
      <Suspense fallback={
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>กำลังโหลด...</div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
