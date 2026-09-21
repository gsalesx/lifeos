import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { greeting, longDate, todayISO, weekNumber } from '../lib/dates'
import { AREA_META, areaScore, habitDueOn, habitDone } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import { I } from './Icons'
import { AddAnything } from './AddAnything'

const NAV = [
  { to: '/', label: 'Dashboard', icon: I.grid, end: true },
  { to: '/calendario', label: 'Calendário', icon: I.cal },
  { to: '/tarefas', label: 'Tarefas', icon: I.list, badge: 'tasks' as const },
  { to: '/habitos', label: 'Hábitos', icon: I.habit, badge: 'habits' as const },
  { to: '/tracking', label: 'Life Tracking', icon: I.pulse },
  { to: '/estatisticas', label: 'Estatísticas', icon: I.bars },
  { to: '/projetos', label: 'Projetos', icon: I.folder },
]

const NAV2 = [
  { to: '/vila', label: 'Vila', icon: I.home, village: true },
  { to: '/conquistas', label: 'Conquistas', icon: I.medal },
  { to: '/hermes', label: 'Hermes IA', icon: I.chat, dot: true },
]

const MOBILE_NAV = [
  { to: '/', label: 'Início', icon: I.grid, end: true },
  { to: '/calendario', label: 'Agenda', icon: I.cal },
  { to: '/tarefas', label: 'Tarefas', icon: I.list },
  { to: '/habitos', label: 'Hábitos', icon: I.habit },
  { to: '/tracking', label: 'Vida', icon: I.pulse },
]

const TITLES: Record<string, string> = {
  '/': 'dash',
  '/calendario': 'Calendário',
  '/tarefas': 'Tarefas',
  '/habitos': 'Hábitos',
  '/tracking': 'Life Tracking',
  '/estatisticas': 'Estatísticas',
  '/projetos': 'Projetos',
  '/vila': 'Sua Vila',
  '/conquistas': 'Conquistas',
  '/hermes': 'Hermes IA',
}

export function Layout() {
  const loc = useLocation()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [settings, setSettings] = useState(false)
  const [menu, setMenu] = useState(false)
  const store = useLifeOS()
  const today = todayISO()
  const pendingTasks = store.tasks.filter((t) => !t.archived && !t.done && t.date && t.date <= today).length
  const pendingHabits = store.habits.filter((h) => habitDueOn(h, today) && !habitDone(h, today)).length
  const alerts = store.tasks.filter((t) => !t.archived && !t.done && t.date && t.date < today).length
  const xpPct = Math.min(100, Math.round((store.xp / store.nextLevelXp) * 100))

  const results = useMemo(() => {
    if (!q.trim()) return []
    const s = q.toLowerCase()
    return [
      ...store.tasks.filter((t) => t.title.toLowerCase().includes(s)).map((t) => ({ kind: 'Tarefa', title: t.title, to: '/tarefas' })),
      ...store.habits.filter((h) => h.name.toLowerCase().includes(s)).map((h) => ({ kind: 'Hábito', title: h.name, to: '/habitos' })),
      ...store.projects.filter((p) => p.name.toLowerCase().includes(s)).map((p) => ({ kind: 'Projeto', title: p.name, to: '/projetos' })),
    ].slice(0, 8)
  }, [q, store.tasks, store.habits, store.projects])

  const sidebar = (
    <>
      <div className="border-b border-[#f0f0f1] px-[18px] py-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#18181b]">
            <I.bolt size={17} color="#fff" stroke="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">LifeOS</div>
            <div className="text-[10px] font-semibold tracking-wide text-[#a1a1aa]">Personal OS</div>
          </div>
          <button className="ml-auto rounded-lg p-1.5 lg:hidden" onClick={() => setMenu(false)} aria-label="Fechar menu">
            <I.x size={18} color="#52525b" />
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-3">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} pendingTasks={pendingTasks} pendingHabits={pendingHabits} onClick={() => setMenu(false)} />
        ))}
        <div className="my-1.5 h-px bg-[#f0f0f1]" />
        {NAV2.map((item) => (
          <NavItem key={item.to} {...item} level={store.level} onClick={() => setMenu(false)} />
        ))}
      </nav>

      <div className="mx-2.5 mb-2 border-t border-[#f0f0f1] px-3 py-3.5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Áreas da vida</div>
        <div className="flex flex-col gap-2.5">
          {(Object.keys(AREA_META) as Array<keyof typeof AREA_META>).map((id) => {
            const meta = AREA_META[id]
            const pct = areaScore(store.habits, store.tasks, id, today)
            return (
              <div key={id} className="flex items-center gap-2">
                <I.diamond size={11} color={meta.color} />
                <span className="flex-1 text-xs font-semibold">{meta.label}</span>
                <div className="h-[3px] w-16 overflow-hidden rounded-sm bg-[#f0f0f1]">
                  <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
                <span className="w-7 text-right text-[11px] font-bold" style={{ color: meta.color }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-[#e4e4e7] p-3">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#4f46e5] to-[#7c3aed] text-sm font-bold text-white">
            {store.userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{store.userName}</div>
            <div className="text-[11px] text-[#a1a1aa]">Nível {store.level} · {store.xp.toLocaleString('pt-BR')} XP</div>
          </div>
          <button className="rounded-[7px] p-1.5 hover:bg-[#f4f4f5]" onClick={() => { setSettings(true); setMenu(false) }} title="Configurações">
            <I.gear size={15} color="#a1a1aa" />
          </button>
        </div>
        <div className="mb-1 h-[5px] overflow-hidden rounded-[3px] bg-[#f0f0f1]">
          <div className="h-full rounded-[3px] bg-linear-to-r from-[#4f46e5] to-[#818cf8]" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-[#a1a1aa]">
          <span>{store.xp.toLocaleString('pt-BR')} XP</span>
          <span>{store.nextLevelXp.toLocaleString('pt-BR')} XP</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden w-[244px] shrink-0 flex-col overflow-y-auto border-r border-[#e4e4e7] bg-white lg:flex">
        {sidebar}
      </aside>

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} aria-label="Fechar menu" />
          <aside className="relative z-50 flex h-full w-[min(86vw,280px)] flex-col overflow-y-auto bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {loc.pathname !== '/calendario' && (
          <header className="flex min-h-[58px] shrink-0 flex-wrap items-center gap-2 border-b border-[#e4e4e7] bg-white px-3 py-2 sm:gap-3 sm:px-5 lg:h-[58px] lg:flex-nowrap lg:gap-4 lg:px-7 lg:py-0">
            <button className="rounded-lg p-1.5 hover:bg-[#f4f4f5] lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menu">
              <I.menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-extrabold tracking-tight sm:text-[17px]">
                {loc.pathname === '/' ? `${greeting()}, ${store.userName}` : loc.pathname.startsWith('/projetos/') ? (store.projects.find((p) => loc.pathname === `/projetos/${p.id}`)?.name ?? 'Projeto') : TITLES[loc.pathname] ?? 'LifeOS'}
              </h1>
              <p className="mt-px hidden text-[11px] text-[#a1a1aa] sm:block">{longDate(today)} · Semana {weekNumber(today)}</p>
            </div>
            <div className="relative order-last w-full lg:order-none lg:w-auto">
              <div className="flex w-full items-center gap-2 rounded-[9px] border border-[#e4e4e7] bg-[#fafafa] px-3 py-2 lg:w-[220px]">
                <I.search size={14} color="#a1a1aa" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="w-full bg-transparent text-xs outline-none placeholder:text-[#a1a1aa]" />
              </div>
              {results.length > 0 && (
                <div className="absolute top-11 z-20 w-full overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-lg lg:w-72">
                  {results.map((r) => (
                    <button key={r.kind + r.title} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafafa]" onClick={() => { nav(r.to); setQ('') }}>
                      <span className="text-[10px] font-bold uppercase text-[#a1a1aa]">{r.kind}</span>
                      <span className="text-[13px] font-semibold">{r.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-[9px] bg-[#18181b] px-3 py-2 text-xs font-bold text-white sm:px-4">
              <I.plus size={13} strokeWidth={2.5} /> <span className="hidden sm:inline">Adicionar</span>
            </button>
            <button onClick={() => nav('/tarefas')} className="flex items-center gap-1.5 rounded-[9px] border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 sm:px-3">
              <I.bell size={13} color="#f59e0b" />
              <span className="text-[11px] font-bold text-[#f59e0b]">{alerts}</span>
            </button>
          </header>
        )}
        {loc.pathname === '/calendario' && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e4e4e7] bg-white px-3 lg:hidden">
            <button className="rounded-lg p-1.5" onClick={() => setMenu(true)} aria-label="Abrir menu"><I.menu size={20} /></button>
            <h1 className="text-[15px] font-extrabold">Calendário</h1>
            <button onClick={() => setAddOpen(true)} className="ml-auto rounded-[9px] bg-[#18181b] px-3 py-1.5 text-xs font-bold text-white">Adicionar</button>
          </header>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto ${loc.pathname === '/calendario' ? 'lg:overflow-hidden' : ''} pb-16 lg:pb-0`}>
          <Outlet />
        </div>
      </main>

      <nav className="safe-nav fixed inset-x-0 bottom-0 z-30 flex border-t border-[#e4e4e7] bg-white/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-[#18181b]' : 'text-[#a1a1aa]'}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {addOpen && <AddAnything onClose={() => setAddOpen(false)} />}
      {settings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setSettings(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-[15px] font-extrabold">Configurações</h2>
            <label className="mb-3 block text-[11px] font-bold uppercase text-[#a1a1aa]">Seu nome
              <input className="mt-1.5 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-[13px]" value={store.userName} onChange={(e) => store.setName(e.target.value)} />
            </label>
            <p className="mb-4 text-xs text-[#a1a1aa]">{store.email}</p>
            <button className="mb-2 w-full rounded-lg border border-[#e4e4e7] py-2 text-xs font-semibold" onClick={() => { void store.reopenOnboarding(); setSettings(false) }}>Ver guia inicial</button>
            <button className="w-full rounded-lg bg-[#18181b] py-2 text-xs font-semibold text-white" onClick={() => { void store.logout(); setSettings(false) }}>Sair</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({
  to, label, icon: Icon, end, badge, village, dot, pendingTasks = 0, pendingHabits = 0, level = 0, onClick,
}: {
  to: string
  label: string
  icon: typeof I.grid
  end?: boolean
  badge?: 'tasks' | 'habits'
  village?: boolean
  dot?: boolean
  pendingTasks?: number
  pendingHabits?: number
  level?: number
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-[9px] px-2.5 py-[9px] ${isActive ? 'bg-[#18181b] text-white' : 'text-[#52525b] hover:bg-[#f4f4f5]'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} />
          <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{label}</span>
          {badge === 'tasks' && pendingTasks > 0 && (
            <span className={`ml-auto rounded-full px-[7px] py-0.5 text-[10px] font-bold ${isActive ? 'bg-white text-[#18181b]' : 'bg-[#ef4444] text-white'}`}>{pendingTasks}</span>
          )}
          {badge === 'habits' && pendingHabits > 0 && (
            <span className={`ml-auto rounded-full px-[7px] py-0.5 text-[10px] font-bold ${isActive ? 'bg-white text-[#18181b]' : 'bg-[#f59e0b] text-white'}`}>{pendingHabits}</span>
          )}
          {village && <span className="ml-auto rounded-full bg-[#f0fdf4] px-[7px] py-0.5 text-[10px] font-bold text-[#16a34a]">Nv {level}</span>}
          {dot && <span className="ml-auto size-2 rounded-full bg-[#4f46e5]" />}
        </>
      )}
    </NavLink>
  )
}
