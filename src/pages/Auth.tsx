import { useEffect, useState } from 'react'
import { I } from '../components/Icons'
import { useLifeOS } from '../store/useStore'

export function AuthPage() {
  const store = useLifeOS()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error')
    if (authError) {
      setError(authError)
      window.history.replaceState({}, '', window.location.pathname)
    }
    void fetch('/api/auth/config').then((r) => r.json()).then((d) => setGoogleEnabled(!!d.googleEnabled)).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await store.login(email, password)
      else await store.register({ name, email, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[#f0f0f0] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#18181b]">
            <I.bolt size={18} color="#fff" stroke="#fff" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight">LifeOS</div>
            <div className="text-[11px] font-semibold text-[#a1a1aa]">Seu sistema operacional pessoal</div>
          </div>
        </div>
        {googleEnabled && (
          <a
            href="/api/auth/google"
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e4e4e7] bg-white py-2.5 text-sm font-bold text-[#18181b] hover:bg-[#fafafa]"
          >
            <GoogleMark />
            Entrar com Google
          </a>
        )}
        {googleEnabled && (
          <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            <span className="h-px flex-1 bg-[#e4e4e7]" />
            ou e-mail
            <span className="h-px flex-1 bg-[#e4e4e7]" />
          </div>
        )}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label className="mb-3 block text-[11px] font-bold uppercase text-[#a1a1aa]">Nome
              <input className="mt-1.5 w-full rounded-xl border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}
          <label className="mb-3 block text-[11px] font-bold uppercase text-[#a1a1aa]">E-mail
            <input type="email" className="mt-1.5 w-full rounded-xl border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="mb-4 block text-[11px] font-bold uppercase text-[#a1a1aa]">Senha
            <input type="password" minLength={8} className="mt-1.5 w-full rounded-xl border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="mb-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#ef4444]">{error}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-[#18181b] py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? 'Entrando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <button className="mt-4 w-full text-center text-xs font-semibold text-[#52525b]" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.26-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
