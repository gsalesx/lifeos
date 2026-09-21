import { useMemo, useState, type ReactNode } from 'react'
import { AddAnything } from '../components/AddAnything'
import { I } from '../components/Icons'
import { MONTHS, monthGrid, todayISO } from '../lib/dates'
import { dayScore, eventOnDate, habitDone, habitDueOn, PRIORITY_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'

export function CalendarPage() {
  const s = useLifeOS()
  const today = todayISO()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [sel, setSel] = useState(today)
  const [add, setAdd] = useState(false)
  const cells = monthGrid(year, month)
  const label = `${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)} ${year}`

  function shift(n: number) {
    const d = new Date(year, month + n, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const dayTasks = s.tasks.filter((t) => !t.archived && t.date === sel)
  const dayHabits = s.habits.filter((h) => habitDueOn(h, sel))
  const dayEvents = s.events.filter((e) => eventOnDate(e, sel)).sort((a, b) => a.time.localeCompare(b.time))
  const score = dayScore(s.habits, s.tasks, s.tracking[sel], sel)
  const dateObj = new Date(sel + 'T12:00:00')
  const dateLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateShort = sel === today ? 'hoje' : sel.split('-').reverse().slice(0, 2).join('/')

  const agenda = useMemo(() => {
    const items = [
      ...dayHabits.map((h) => ({ id: h.id, time: h.time ?? '—', type: 'hábito', name: h.name, done: habitDone(h, sel), accent: h.color, sub: '' })),
      ...dayTasks.map((t) => ({ id: t.id, time: t.time ?? '—', type: 'tarefa', name: t.title, done: t.done, accent: '#4f46e5', sub: s.projects.find((p) => p.id === t.projectId)?.name ?? '' })),
      ...dayEvents.map((e) => ({ id: e.id, time: e.time, type: 'evento', name: e.title, done: !!e.done, accent: '#f97316', sub: e.recurrence === 'weekly' ? `Toda semana${e.location ? ` · ${e.location}` : ''}` : e.location ?? '' })),
    ].sort((a, b) => a.time.localeCompare(b.time))
    const nowIdx = items.findIndex((x) => !x.done)
    return items.map((item, i) => ({ ...item, isNow: i === nowIdx && sel === today }))
  }, [dayHabits, dayTasks, dayEvents, sel, today, s.projects])

  return (
    <div className="grid h-auto min-h-full grid-cols-1 overflow-visible lg:h-full lg:grid-cols-[270px_1fr_300px] lg:overflow-hidden">
      <div className="overflow-visible border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-5 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[15px] font-extrabold tracking-tight">{label}</span>
          <div className="flex gap-1">
            <NavBtn onClick={() => shift(-1)}><I.chevL size={13} color="#52525b" /></NavBtn>
            <NavBtn onClick={() => shift(1)}><I.chevR size={13} color="#52525b" /></NavBtn>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <div key={i} className="py-0.5 text-center text-[9px] font-bold text-[#a1a1aa]">{d}</div>)}
        </div>
        <div className="mb-5 grid grid-cols-7 gap-[3px]">
          {cells.map((c, i) => {
            if (!c.iso) return <div key={i} />
            const iso = c.iso
            const isToday = iso === today
            const isSel = iso === sel
            const future = iso > today
            const has = s.tasks.some((t) => t.date === iso) || s.habits.some((h) => habitDone(h, iso)) || s.events.some((e) => eventOnDate(e, iso))
            return (
              <button key={iso} onClick={() => setSel(iso)} className="flex h-8 w-full flex-col items-center justify-center gap-0.5 rounded-lg" style={{ background: isSel ? '#18181b' : isToday ? '#4f46e5' : 'transparent' }}>
                <span className="text-[11px] leading-none" style={{ fontWeight: isToday ? 800 : 500, color: isSel || isToday ? '#fff' : future ? '#c4c4c6' : '#18181b' }}>{c.day}</span>
                {has && <span className="size-1 rounded-full" style={{ background: isSel || isToday ? '#fff' : '#16a34a' }} />}
              </button>
            )
          })}
        </div>
        <div className="rounded-[14px] border border-[#e4e4e7] bg-white p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">{dateLabel}</div>
          {[
            ['Tarefas', dayTasks.length, '#4f46e5'],
            ['Hábitos', dayHabits.length, '#16a34a'],
            ['Eventos', dayEvents.length, '#f59e0b'],
          ].map(([l, n, c]) => (
            <div key={String(l)} className="mb-2 flex items-center gap-2 rounded-[9px] bg-[#fafafa] px-2.5 py-2">
              <span className="size-2 rounded-full" style={{ background: String(c) }} />
              <span className="flex-1 text-xs font-semibold text-[#52525b]">{l}</span>
              <span className="text-[13px] font-extrabold">{n}</span>
            </div>
          ))}
          <div className="mt-3.5 flex items-center justify-between border-t border-[#f0f0f1] pt-3">
            <span className="text-[11px] font-semibold text-[#a1a1aa]">Score do dia</span>
            <span className="text-lg font-extrabold" style={{ color: sel > today ? '#a1a1aa' : '#16a34a' }}>{sel > today ? '—' : `${score.total}%`}</span>
          </div>
        </div>
      </div>

      <div className="overflow-visible bg-white lg:overflow-y-auto">
        <div className="sticky top-0 z-2 flex items-center gap-4 border-b border-[#e4e4e7] bg-white px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight capitalize">{dateLabel}</h2>
            <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{dayTasks.length} tarefas · {dayHabits.length} hábitos · {dayEvents.length} eventos</p>
          </div>
          <button onClick={() => setAdd(true)} className="ml-auto flex items-center gap-1.5 rounded-[9px] bg-[#18181b] px-4 py-2 text-xs font-bold text-white">
            <I.plus size={12} strokeWidth={3} /> Adicionar
          </button>
        </div>
        <div className="px-6 py-5 pb-12">
          <div className="relative pl-[60px]">
            <div className="absolute top-2 bottom-2 left-[42px] w-px bg-[#e4e4e7]" />
            {agenda.map((item) => (
              <div key={item.id + item.type} className="relative mb-3.5">
                <span className="absolute top-3 left-[-60px] w-9 text-right text-[11px] font-semibold" style={{ color: item.isNow ? '#4f46e5' : item.done ? '#c4c4c6' : '#71717a' }}>{item.time}</span>
                <span className="absolute top-3.5 rounded-full" style={{ left: item.isNow ? -20 : -18, width: item.isNow ? 14 : 10, height: item.isNow ? 14 : 10, background: item.done ? '#16a34a' : item.isNow ? '#4f46e5' : '#d4d4d8', boxShadow: item.isNow ? '0 0 0 3px rgba(79,70,229,0.18)' : 'none' }} />
                <div className="rounded-[10px] border-l-[3px] px-3.5 py-2.5" style={{ background: item.isNow ? '#eef2ff' : item.done ? '#fafafa' : '#fff', borderColor: item.isNow ? '#c7d2fe' : item.done ? '#f0f0f1' : '#e4e4e7', borderLeftColor: item.accent }}>
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: item.accent }}>{item.type}</span>
                    {item.done && <span className="text-[10px] font-bold text-[#16a34a]">feito</span>}
                  </div>
                  <div className={`text-sm font-bold ${item.done ? 'text-[#a1a1aa] line-through' : ''}`}>{item.name}</div>
                  {item.sub && <div className="mt-0.5 text-[11px] text-[#a1a1aa]">{item.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-visible border-t border-[#e4e4e7] bg-[#fafafa] px-[18px] py-5 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="mb-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Tarefas · {dateShort}</div>
          <div className="flex flex-col gap-2">
            {dayTasks.map((t) => (
              <button key={t.id} onClick={() => s.toggleTask(t.id)} className="flex items-center gap-2.5 rounded-[10px] border border-[#e4e4e7] bg-white px-3 py-2.5">
                <div className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[2.5px]" style={{ borderColor: PRIORITY_META[t.priority].color, background: t.done ? PRIORITY_META[t.priority].color : 'transparent' }}>
                  {t.done && <I.check size={10} color="#fff" strokeWidth={4} />}
                </div>
                <div className="min-w-0 text-left">
                  <div className={`truncate text-[13px] font-semibold ${t.done ? 'text-[#a1a1aa] line-through' : ''}`}>{t.title}</div>
                  {t.time && <div className="text-[10px] text-[#a1a1aa]">{t.time}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Hábitos · {dateShort}</div>
          <div className="grid grid-cols-2 gap-2">
            {dayHabits.map((h) => {
              const done = habitDone(h, sel)
              return (
                <button key={h.id} onClick={() => s.toggleHabit(h.id, sel)} className="rounded-xl border p-3 text-left" style={{ background: done ? '#f0fdf4' : '#fff', borderColor: done ? '#bbf7d0' : '#e4e4e7' }}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md text-[11px] font-extrabold" style={{ background: h.iconBg, color: h.color }}>{h.name[0]}</div>
                    <span className="text-[12px] font-semibold">{h.name}</span>
                  </div>
                  {h.quantitative && <div className="text-[10px] text-[#a1a1aa]">{Number(h.logs[sel] || 0)}/{h.quantitative.goal}</div>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} />}
    </div>
  )
}

function NavBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex size-[26px] items-center justify-center rounded-md border border-[#e4e4e7] bg-white">{children}</button>
}
