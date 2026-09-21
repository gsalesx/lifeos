import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AddAnything } from '../components/AddAnything'
import { I } from '../components/Icons'
import { PRIORITY_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import type { ProjectStatus } from '../store/types'

const STATUS: { id: ProjectStatus; label: string }[] = [
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'concluido', label: 'Concluído' },
]

export function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useLifeOS()
  const p = s.projects.find((x) => x.id === id)
  const [add, setAdd] = useState(false)
  const [desc, setDesc] = useState(p?.description ?? '')
  if (!p) {
    return (
      <div className="p-6 text-sm text-[#a1a1aa]">
        Projeto não encontrado. <button className="font-semibold text-[#4f46e5]" onClick={() => nav('/projetos')}>Voltar</button>
      </div>
    )
  }
  const tasks = s.tasks.filter((t) => t.projectId === p.id && !t.archived)
  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:px-7">
      <Link to="/projetos" className="mb-4 inline-block text-xs font-semibold text-[#71717a]">← Projetos</Link>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl" style={{ background: `${p.color}18` }}>
          <I.folder size={22} color={p.color} />
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-xl font-extrabold tracking-tight outline-none"
            value={p.name}
            onChange={(e) => s.updateProject(p.id, { name: e.target.value })}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {STATUS.map((st) => (
              <button
                key={st.id}
                onClick={() => s.updateProject(p.id, { status: st.id })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === st.id ? 'bg-[#18181b] text-white' : 'bg-[#f4f4f5] text-[#71717a]'}`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <textarea
        className="mb-5 w-full rounded-2xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm outline-none"
        rows={3}
        placeholder="O que esse projeto precisa entregar?"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => { if (desc !== (p.description || '')) s.updateProject(p.id, { description: desc }) }}
      />
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-[11px] font-semibold text-[#a1a1aa]">
          <span>{pct}% concluído</span>
          <span>{open.length} abertas</span>
        </div>
        <div className="h-[6px] overflow-hidden rounded-full bg-[#f0f0f1]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} /></div>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Subtarefas</h2>
        <button onClick={() => setAdd(true)} className="flex items-center gap-1 rounded-[9px] bg-[#18181b] px-3 py-1.5 text-xs font-bold text-white">
          <I.plus size={12} /> Tarefa
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
        {tasks.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#a1a1aa]">Nada aqui ainda. Adicione o primeiro passo.</div>}
        {open.concat(done).map((t) => {
          const prio = PRIORITY_META[t.priority]
          return (
            <button key={t.id} onClick={() => s.toggleTask(t.id)} className="flex w-full items-center gap-3 border-b border-[#f0f0f1] px-4 py-3 text-left last:border-0">
              <div className={`flex size-[18px] items-center justify-center rounded-[5px] ${t.done ? 'bg-[#18181b]' : 'border-2 border-[#d4d4d8]'}`}>
                {t.done && <I.check size={10} color="#fff" strokeWidth={3.5} />}
              </div>
              <span className={`min-w-0 flex-1 text-[13px] ${t.done ? 'text-[#a1a1aa] line-through' : 'font-medium'}`}>{t.title}</span>
              {t.date && <span className="text-[10px] text-[#a1a1aa]">{t.date.split('-').reverse().join('/')}</span>}
              <span className="rounded-md px-2 py-[3px] text-[10px] font-bold" style={{ color: prio.color, background: prio.bg }}>{prio.label}</span>
            </button>
          )
        })}
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} defaultTab="tarefa" projectId={p.id} />}
    </div>
  )
}
