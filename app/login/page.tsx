'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Mail, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createSupabaseBrowser()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort falsch'
          : error.message)
        setIsLoading(false)
        return
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-secondary)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #007AFF, #5856D6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(0, 122, 255, 0.3)',
            }}
          >
            <Sparkles size={28} style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>
            Worknetic CRM
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
            {mode === 'login' ? 'Melde dich an, um fortzufahren' : 'Erstelle einen neuen Account'}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '24px',
            border: '1px solid var(--color-border)',
            padding: '36px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 18px',
                  background: 'rgba(255, 59, 48, 0.08)',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                  borderRadius: '14px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  color: '#FF3B30',
                }}
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                }}
              >
                E-Mail
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '0 16px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  transition: 'all 0.2s',
                }}
                className="focus-within:border-[#007AFF] focus-within:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]"
              >
                <Mail size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Passwort
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '0 16px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  transition: 'all 0.2s',
                }}
                className="focus-within:border-[#007AFF] focus-within:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]"
              >
                <Lock size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                  required
                  minLength={6}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '14px',
                background: isLoading ? '#007AFFcc' : '#007AFF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  {mode === 'login' ? 'Anmelden' : 'Account erstellen'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#007AFF',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {mode === 'login' ? 'Neuen Account erstellen' : 'Bereits registriert? Anmelden'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
