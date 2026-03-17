import { Suspense } from 'react'
import LoginForm from './LoginForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — NEO Support',
  robots: { index: false, follow: false },
}

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
