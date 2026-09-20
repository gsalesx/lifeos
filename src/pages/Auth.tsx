import { useState } from 'react'
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
