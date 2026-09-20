import { useState } from 'react'
import { AddAnything } from '../components/AddAnything'
import { I } from '../components/Icons'
import { lastNDays, todayISO } from '../lib/dates'
import { AREA_META, habitDone, habitDueOn, habitLateDays, habitStreak } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import type { AreaId } from '../store/types'

const LATE = {
  0: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: '' },
  1: { color: '#94a3b8', bg: '#f8fafc', border: '#cbd5e1', label: 'hoje' },
  2: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'há 2 dias' },
  3: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'há 3 dias' },
}

export function HabitsPage() {
  const s = useLifeOS()
  const today = todayISO()
  const [filter, setFilter] = useState<'all' | AreaId>('all')
  const [add, setAdd] = useState(false)
  const list = s.habits.filter((h) => filter === 'all' || h.category === filter)
  const doneToday = s.habits.filter((h) => habitDueOn(h, today) && habitDone(h, today)).length
  const dueToday = s.habits.filter((h) => habitDueOn(h, today)).length
  const maxStreak = Math.max(1, ...s.habits.map((h) => habitStreak(h, today)))
  const week = lastNDays(7, today)

  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-[#a1a1aa]">{doneToday} de {dueToday} concluídos hoje · Maior sequência: {maxStreak} dias</p>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-[#e4e4e7] bg-[#fafafa] p-1">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</Chip>
            {(['fe', 'saude', 'estudos'] as const).map((id) => (
              <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{AREA_META[id].label}</Chip>
            ))}
          </div>
          <button onClick={() => setAdd(true)} className="flex items-center gap-1.5 rounded-[9px] bg-[#18181b] px-4 py-2 text-xs font-bold text-white"><I.plus size={13} /> Novo Hábito</button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2">
          {list.map((h) => {
            const done = habitDone(h, today)
            const late = Math.min(3, habitLateDays(h, today)) as 0 | 1 | 2 | 3
            const lateMeta = LATE[late]
            const streak = habitStreak(h, today)
            const val = Number(h.logs[today] || 0)
            return (
              <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border px-3 py-3 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-4" style={{ background: !done && late >= 3 ? '#fffafa' : !done && late === 2 ? '#fffefb' : '#fff', borderColor: !done && late >= 3 ? '#fecaca' : !done && late === 2 ? '#fde68a' : '#e4e4e7' }}>
                <div className="flex size-[42px] shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: h.iconBg, color: h.color }}>{h.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold tracking-tight">{h.name}</div>
                  <div className="mt-0.5 text-xs text-[#a1a1aa]">{AREA_META[h.category].label} · {freqLabel(h.frequency)} · +{h.xp} XP</div>
                </div>
                {h.quantitative && (
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-[5px] w-20 overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full rounded-[3px]" style={{ width: `${Math.min(100, (val / h.quantitative.goal) * 100)}%`, background: h.color }} /></div>
                    <span className="text-xs font-semibold text-[#71717a]">{val}/{h.quantitative.goal}</span>
                  </div>
                )}
                {done && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <I.flame size={14} color="#f97316" />
                    <span className="w-[22px] text-sm font-extrabold">{streak}</span>
                  </div>
                )}
                {!done && late > 0 && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ background: lateMeta.bg, borderColor: lateMeta.border }}>
                    <span className="size-1.5 rounded-full" style={{ background: lateMeta.color }} />
                    <span className="text-[11px] font-bold" style={{ color: lateMeta.color }}>{lateMeta.label}</span>
                  </div>
                )}
                <button onClick={() => s.toggleHabit(h.id)} className="flex size-9 shrink-0 items-center justify-center rounded-full border-2" style={{ background: done ? '#16a34a' : '#fff', borderColor: done ? '#16a34a' : lateMeta.color }}>
                  {done && <I.check size={16} color="#fff" strokeWidth={3} />}
                </button>
              </div>
            )
          })}
          <div className="mt-1 flex items-center gap-4 px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">Atraso inteligente</span>
            <Legend c="#94a3b8" t="Dia 1 · normal" />
            <Legend c="#f59e0b" t="Dia 2 · atenção" />
            <Legend c="#ef4444" t="Dia 3+ · crítico" />
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card p-5">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Progresso por área</div>
            <div className="flex justify-around">
              {(['fe', 'saude', 'estudos'] as const).map((id) => {
                const hs = s.habits.filter((h) => h.category === id && habitDueOn(h, today))
                const pct = hs.length ? Math.round((hs.filter((h) => habitDone(h, today)).length / hs.length) * 100) : 0
                const circ = 188.5
                return (
                  <div key={id} className="text-center">
                    <div className="relative mx-auto mb-2 size-20">
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" fill="none" stroke="#f0f0f1" strokeWidth="7" />
                        <circle cx="40" cy="40" r="30" fill="none" stroke={AREA_META[id].color} strokeWidth="7" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset={circ - (circ * pct) / 100} transform="rotate(-90 40 40)" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-base font-extrabold" style={{ color: AREA_META[id].color }}>{pct}%</div>
                    </div>
                    <div className="text-xs font-semibold text-[#52525b]">{AREA_META[id].label}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Maiores sequências</div>
            {[...s.habits].map((h) => ({ h, streak: habitStreak(h, today) })).filter((x) => x.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 4).map((x) => (
              <div key={x.h.id} className="mb-2 flex items-center gap-2">
                <span className="w-16 text-xs font-semibold">{x.h.name}</span>
                <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full rounded-[3px]" style={{ width: `${(x.streak / maxStreak) * 100}%`, background: x.h.color }} /></div>
                <span className="text-[11px] font-bold">{x.streak}d</span>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Últimos 7 dias</div>
            {list.slice(0, 5).map((h) => (
              <div key={h.id} className="mb-2 flex items-center gap-2">
                <span className="w-16 truncate text-[11px] font-semibold">{h.name}</span>
                <div className="flex flex-1 gap-1">
                  {week.map((iso) => {
                    const due = habitDueOn(h, iso)
                    const done = habitDone(h, iso)
                    return <div key={iso} className="h-3 flex-1 rounded-sm" style={{ background: !due ? '#f0f0f1' : done ? '#16a34a' : '#e4e4e7' }} />
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} />}
    </div>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-[7px] px-3 py-1.5 text-xs ${active ? 'bg-[#18181b] font-bold text-white' : 'font-semibold text-[#71717a]'}`}>{children}</button>
}
function Legend({ c, t }: { c: string; t: string }) {
  return <div className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c }} /><span className="text-[11px] font-medium text-[#71717a]">{t}</span></div>
}
function freqLabel(f: 'daily' | 'weekdays' | number[]) {
  if (f === 'daily') return 'Diário'
  if (f === 'weekdays') return 'Seg a Sex'
  return 'Alguns dias'
}
