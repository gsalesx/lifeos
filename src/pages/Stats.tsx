import { useState } from 'react'
import { I } from '../components/Icons'
import type { ReactNode } from 'react'
import { lastNDays, minutesBetween, todayISO } from '../lib/dates'
import { habitDone, habitDueOn, hermesTips } from '../lib/logic'
import { useLifeOS } from '../store/useStore'

export function StatsPage() {
  const s = useLifeOS()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week')
  const today = todayISO()
  const days = period === 'year' ? 365 : period === 'month' ? 30 : 7
  const range = lastNDays(days, today)
  const week = lastNDays(7, today)
  const doneTasks = s.tasks.filter((t) => t.done && t.date && range.includes(t.date)).length
  const prev = lastNDays(days, range[0]).slice(0, -1)
  const prevTasks = s.tasks.filter((t) => t.done && t.date && prev.includes(t.date)).length
  const dueHabits = range.flatMap((d) => s.habits.filter((h) => habitDueOn(h, d)))
  const doneHabits = range.flatMap((d) => s.habits.filter((h) => habitDueOn(h, d) && habitDone(h, d)))
  const habitPct = dueHabits.length ? Math.round((doneHabits.length / dueHabits.length) * 100) : 0
  const sleeps = range.map((d) => s.tracking[d]).filter(Boolean).map((t) => minutesBetween(t.bedTime, t.wakeTime))
  const avgSleep = sleeps.length ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : 0
  const xpEst = doneHabits.reduce((a, h) => a + h.xp, 0) + doneTasks * 15
  const prod = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => {
    const iso = lastNDays(7, today)[i]
    return { label, val: s.tasks.filter((t) => t.done && t.date === iso).length, iso }
  })
  const prodMax = Math.max(1, ...prod.map((d) => d.val))
  const tips = hermesTips({ tasks: s.tasks, habits: s.habits, tracking: s.tracking, date: today })
  const matrixDays = lastNDays(28, today)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-[22px] lg:px-7">
      <div className="flex justify-end">
        <div className="flex gap-0.5 rounded-[10px] border border-[#e4e4e7] bg-[#fafafa] p-1">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`rounded-[7px] px-3.5 py-1.5 text-xs font-semibold ${period === p ? 'bg-[#18181b] text-white' : 'text-[#71717a]'}`}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi icon={<I.check size={14} color="#4f46e5" />} bg="#eef2ff" label="Tarefas" value={String(doneTasks)} delta={delta(doneTasks, prevTasks)} />
        <Kpi icon={<I.habit size={14} color="#f97316" />} bg="#fff7ed" label="Hábitos" value={`${habitPct}%`} delta={-3} />
        <Kpi icon={<I.moon size={14} color="#6366f1" />} bg="#eef2ff" label="Sono médio" value={avgSleep ? `${Math.floor(avgSleep / 60)}h${String(avgSleep % 60).padStart(2, '0')}` : '—'} delta={18} unit="min" />
        <Kpi icon={<I.bolt size={14} color="#ca8a04" />} bg="#fefce8" label="XP ganhos" value={xpEst.toLocaleString('pt-BR')} delta={220} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[2fr_1fr]">
        <div className="card px-[22px] py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold">Produtividade por dia</div>
              <div className="mt-0.5 text-[11px] text-[#a1a1aa]">tarefas concluídas</div>
            </div>
          </div>
          <div className="flex h-[150px] items-end gap-2.5">
            {prod.map((d) => (
              <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="font-mono text-xs font-bold" style={{ color: d.val === prodMax ? '#4f46e5' : '#a1a1aa' }}>{d.val}</div>
                <div className="w-full rounded-t-[7px]" style={{ height: `${(d.val / prodMax) * 100}%`, background: d.val === prodMax ? '#4f46e5' : '#e0e7ff' }} />
                <span className="text-[11px] font-bold" style={{ color: d.val === prodMax ? '#4f46e5' : '#a1a1aa' }}>{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#f0f0f1] bg-[#fafafa] px-3.5 py-3">
            <I.bolt size={14} color="#4f46e5" />
            <span className="text-xs text-[#52525b]"><strong>Hermes:</strong> {tips[0]}</span>
          </div>
        </div>
        <div className="card flex flex-col px-[22px] py-5">
          <div className="text-[13px] font-bold">Humor & Energia</div>
          <div className="mb-4 text-[11px] text-[#a1a1aa]">últimos 7 dias</div>
          <MoodChart days={week} tracking={s.tracking} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.7fr_1fr]">
        <div className="card px-[22px] py-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold">Tracker de hábitos</div>
              <div className="mt-0.5 text-[11px] text-[#a1a1aa]">últimas 4 semanas</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {s.habits.slice(0, 5).map((h) => (
              <div key={h.id} className="grid grid-cols-[70px_1fr] items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-[7px] shrink-0 rounded-full" style={{ background: h.color }} />
                  <span className="truncate text-[11px] font-semibold text-[#52525b]">{h.name}</span>
                </div>
                <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
                  {matrixDays.map((d) => {
                    const due = habitDueOn(h, d)
                    const done = habitDone(h, d)
                    return <div key={d} className="aspect-square rounded-[3px]" style={{ background: !due ? '#f0f0f1' : done ? h.color : '#e4e4e7' }} />
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card flex flex-col px-[22px] py-5">
          <div className="text-[13px] font-bold">Sono da semana</div>
          <div className="mb-4 text-[11px] text-[#a1a1aa]">Meta: 8h · Média: <strong className="text-[#6366f1]">{avgSleep ? `${Math.floor(avgSleep / 60)}h${avgSleep % 60}` : '—'}</strong></div>
          <div className="flex h-[120px] items-end gap-2">
            {week.map((d, i) => {
              const mins = s.tracking[d] ? minutesBetween(s.tracking[d].bedTime, s.tracking[d].wakeTime) : 0
              const color = mins >= 420 ? '#6366f1' : mins >= 360 ? '#f59e0b' : '#ef4444'
              return (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="font-mono text-[9px] font-bold" style={{ color }}>{mins ? `${Math.floor(mins / 60)}h${mins % 60 || ''}` : '—'}</div>
                  <div className="w-full rounded-t-[5px]" style={{ height: `${Math.min(100, (mins / 540) * 100)}%`, background: color, opacity: i === 6 ? 1 : 0.7 }} />
                  <span className="text-[9px] font-semibold text-[#a1a1aa]">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, bg, label, value, delta, unit }: { icon: ReactNode; bg: string; label: string; value: string; delta: number; unit?: string }) {
  const up = delta >= 0
  return (
    <div className="card px-5 py-[18px]">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: bg }}>{icon}</div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">{label}</span>
      </div>
      <div className="font-mono text-[32px] font-extrabold tracking-tight">{value}</div>
      <div className={`mt-1 text-[11px] font-bold ${up ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>{up ? '▲' : '▼'} {Math.abs(delta)}{unit ? unit : '%'} vs. período ant.</div>
    </div>
  )
}

function MoodChart({ days, tracking }: { days: string[]; tracking: Record<string, { mood: number; energy: number }> }) {
  const w = 220, h = 130
  const pts = (key: 'mood' | 'energy') => days.map((d, i) => {
    const v = tracking[d]?.[key] ?? 3
    const x = 8 + (i * (w - 16)) / 6
    const y = 110 - v * 16
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height="130" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" points={pts('mood')} />
      <polyline fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" points={pts('energy')} />
    </svg>
  )
}

function delta(cur: number, prev: number) {
  if (!prev) return cur ? 12 : 0
  return Math.round(((cur - prev) / prev) * 100)
}
