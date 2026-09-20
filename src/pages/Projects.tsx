import { useState } from 'react'
import { AddAnything } from '../components/AddAnything'
import { I } from '../components/Icons'
import { useLifeOS } from '../store/useStore'

export function ProjectsPage() {
  const s = useLifeOS()
  const [add, setAdd] = useState(false)
  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setAdd(true)} className="flex items-center gap-1.5 rounded-[9px] bg-[#18181b] px-4 py-2 text-xs font-bold text-white"><I.plus size={13} /> Novo projeto</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {s.projects.map((p) => {
          const pts = s.tasks.filter((t) => t.projectId === p.id && !t.archived)
          const pct = pts.length ? Math.round((pts.filter((t) => t.done).length / pts.length) * 100) : 0
          return (
            <div key={p.id} className="card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: `${p.color}18` }}><I.folder size={18} color={p.color} /></div>
                <div>
                  <div className="text-[15px] font-bold">{p.name}</div>
                  <div className="text-[11px] capitalize text-[#a1a1aa]">{p.status === 'andamento' ? 'Em andamento' : p.status}</div>
                </div>
              </div>
              <div className="mb-2 h-[5px] overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: p.color }} /></div>
              <div className="flex justify-between text-[11px] font-semibold text-[#a1a1aa]"><span>{pct}% concluído</span><span>{pts.filter((t) => !t.done).length} abertas</span></div>
              <div className="mt-4 flex flex-col gap-2">
                {pts.slice(0, 4).map((t) => (
                  <button key={t.id} onClick={() => s.toggleTask(t.id)} className="flex items-center gap-2 text-left">
                    <div className={`size-3.5 rounded-[4px] border ${t.done ? 'bg-[#18181b] border-[#18181b]' : 'border-[#d4d4d8]'}`} />
                    <span className={`text-[13px] ${t.done ? 'text-[#a1a1aa] line-through' : 'font-medium'}`}>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} />}
    </div>
  )
}
