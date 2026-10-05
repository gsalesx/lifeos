import { useEffect, useState } from 'react'
import { api } from '../store/api'
import { useLifeOS } from '../store/useStore'

type TokenRow = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

export function Settings({ onClose }: { onClose: () => void }) {
  const store = useLifeOS()
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [freshToken, setFreshToken] = useState<string | null>(null)
  const [tokenName, setTokenName] = useState('Assistente')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function refreshTokens() {
    const data = await api<{ tokens: TokenRow[] }>('/api/tokens')
    setTokens(data.tokens.filter((t) => !t.revoked_at))
  }

  useEffect(() => { void refreshTokens().catch(() => {}) }, [])

  async function connectGoogle() {
    window.location.href = '/api/auth/google?connect=1'
  }

  async function disconnectGoogle() {
    setBusy('google')
    try {
      const data = await api('/api/auth/google/disconnect', { method: 'POST' })
      store.apply(data.state)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar')
    } finally { setBusy('') }
  }

  async function syncNow() {
    setBusy('sync')
    setError('')
    try { await store.syncCalendar() } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na sincronização')
    } finally { setBusy('') }
  }

  async function createToken() {
    setBusy('token')
    setError('')
    try {
      const created = await api<{ token: string }>('/api/tokens', { method: 'POST', body: JSON.stringify({ name: tokenName }) })
      setFreshToken(created.token)
      setCopied(false)
      await refreshTokens()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar token')
    } finally { setBusy('') }
  }

  async function revoke(id: string) {
    await api(`/api/tokens/${id}`, { method: 'DELETE' })
    if (freshToken?.includes(id)) setFreshToken(null)
    await refreshTokens()
  }

  const lastSync = store.calendarLastSync
    ? new Date(store.calendarLastSync).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'nunca'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[15px] font-extrabold">Configurações</h2>
        <label className="mb-3 block text-[11px] font-bold uppercase text-[#a1a1aa]">Seu nome
          <input className="mt-1.5 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-[13px]" value={store.userName} onChange={(e) => store.setName(e.target.value)} />
        </label>
        <p className="mb-4 text-xs text-[#a1a1aa]">{store.email}</p>

        <div className="mb-4 rounded-xl border border-[#e4e4e7] p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">Google</div>
          <p className="mb-2 text-xs text-[#52525b]">
            {store.googleConnected ? `Calendar conectado · última sync ${lastSync}` : 'Entre com Google para login e sincronizar a agenda.'}
          </p>
          {store.googleConnected ? (
            <div className="flex gap-2">
              <button disabled={busy === 'sync'} className="flex-1 rounded-lg bg-[#18181b] py-2 text-xs font-semibold text-white disabled:opacity-60" onClick={() => void syncNow()}>
                {busy === 'sync' ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
              <button disabled={busy === 'google'} className="rounded-lg border border-[#e4e4e7] px-3 py-2 text-xs font-semibold" onClick={() => void disconnectGoogle()}>Desconectar</button>
            </div>
          ) : (
            <button className="w-full rounded-lg border border-[#e4e4e7] py-2 text-xs font-semibold" onClick={() => void connectGoogle()}>Conectar Google Calendar</button>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[#e4e4e7] p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">Tokens MCP / API</div>
          <p className="mb-2 text-xs text-[#52525b]">Use no header <code className="rounded bg-[#f4f4f5] px-1">Authorization: Bearer</code> em <code className="rounded bg-[#f4f4f5] px-1">/mcp</code>.</p>
          <div className="mb-2 flex gap-2">
            <input className="min-w-0 flex-1 rounded-lg border border-[#e4e4e7] px-2 py-1.5 text-xs" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Nome do token" />
            <button disabled={busy === 'token'} className="rounded-lg bg-[#18181b] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void createToken()}>Criar</button>
          </div>
          {freshToken && (
            <div className="mb-2 rounded-lg bg-[#f0fdf4] p-2">
              <div className="mb-1 text-[10px] font-bold uppercase text-[#16a34a]">Copie agora — não aparece de novo</div>
              <code className="block break-all text-[11px]">{freshToken}</code>
              <button
                className="mt-1 text-[11px] font-semibold text-[#16a34a]"
                onClick={() => { void navigator.clipboard.writeText(freshToken); setCopied(true) }}
              >{copied ? 'Copiado' : 'Copiar'}</button>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-[#fafafa] px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{t.name}</div>
                  <div className="text-[10px] text-[#a1a1aa]">{t.prefix}…</div>
                </div>
                <button className="text-[11px] font-semibold text-[#ef4444]" onClick={() => void revoke(t.id)}>Revogar</button>
              </div>
            ))}
            {tokens.length === 0 && <div className="text-xs text-[#a1a1aa]">Nenhum token ativo.</div>}
          </div>
        </div>

        {error && <div className="mb-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#ef4444]">{error}</div>}
        <button className="mb-2 w-full rounded-lg border border-[#e4e4e7] py-2 text-xs font-semibold" onClick={() => { void store.reopenOnboarding(); onClose() }}>Ver guia inicial</button>
        <button className="w-full rounded-lg bg-[#18181b] py-2 text-xs font-semibold text-white" onClick={() => { void store.logout(); onClose() }}>Sair</button>
      </div>
    </div>
  )
}
