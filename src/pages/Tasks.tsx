import { useState } from 'react'
import { AddAnything } from '../components/AddAnything'
import { I } from '../components/Icons'
import { addDays, todayISO } from '../lib/dates'
import { PRIORITY_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'

export function TasksPage() {
  const s = useLifeOS()
  const today = todayISO()
  const [filter, setFilter] = useState<'hoje' | 'atrasadas' | 'todas'>('hoje')
  const [add, setAdd] = useState(false)
  const list = s.tasks.filter((t) => {
    if (t.archived) return false
    if (filter === 'hoje') return t.date === today
    if (filter === 'atrasadas') return !!t.date && t.date < today && !t.done
    return true
  })

  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-[10px] border border-[#e4e4e7] bg-[#fafafa] p-1">
          {(['hoje', 'atrasadas', 'todas'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === f ? 'bg-[#18181b] text-white' : 'text-[#71717a]'}`}>{f}</button>
          ))}
        </div>
        <button onClick={() => setAdd(true)} className="flex items-center gap-1.5 rounded-[9px] bg-[#18181b] px-4 py-2 text-xs font-bold text-white"><I.plus size={13} /> Nova tarefa</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
        {list.length === 0 && <div className="p-10 text-center text-sm text-[#a1a1aa]">Nada por aqui.</div>}
        {list.map((t) => {
          const prio = PRIORITY_META[t.priority]
          const late = t.date && t.date < today && !t.done
          return (
            <div key={t.id} className="flex items-center gap-3 border-b border-[#f0f0f1] px-5 py-3.5 last:border-0">
              <button onClick={() => s.toggleTask(t.id)}>
                {t.done
                  ? <div className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#18181b]"><I.check size={10} color="#fff" strokeWidth={3.5} /></div>
                  : <div className="size-[18px] rounded-[5px] border-2" style={{ borderColor: prio.color }} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-semibold ${t.done ? 'text-[#a1a1aa] line-through' : ''}`}>{t.title}</div>
                <div className="text-[11px] text-[#a1a1aa]">{s.projects.find((p) => p.id === t.projectId)?.name} {t.time ? `· ${t.time}` : ''} {t.date && t.date !== today ? `· ${t.date.split('-').reverse().join('/')}` : ''}</div>
              </div>
              {late && <span className="rounded-full bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#ef4444]">atrasada</span>}
              <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ color: prio.color, background: prio.bg }}>{prio.label}</span>
              {!t.done && late && (
                <button onClick={() => s.rescheduleTask(t.id, addDays(today, 1))} className="text-[11px] font-semibold text-[#52525b]">+1 dia</button>
              )}
            </div>
          )
        })}
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} />}
    </div>
  )
}
