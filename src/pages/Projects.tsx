import { useState } from 'react'
import { Link } from 'react-router-dom'
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
            <Link key={p.id} to={`/projetos/${p.id}`} className="card block p-5 text-left">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: `${p.color}18` }}><I.folder size={18} color={p.color} /></div>
                <div>
                  <div className="text-[15px] font-bold">{p.name}</div>
                  <div className="text-[11px] capitalize text-[#a1a1aa]">{p.status === 'andamento' ? 'Em andamento' : p.status}</div>
                </div>
              </div>
              {p.description && <p className="mb-3 line-clamp-2 text-xs text-[#71717a]">{p.description}</p>}
              <div className="mb-2 h-[5px] overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: p.color }} /></div>
              <div className="flex justify-between text-[11px] font-semibold text-[#a1a1aa]"><span>{pct}% concluído</span><span>{pts.filter((t) => !t.done).length} abertas</span></div>
            </Link>
          )
        })}
      </div>
      {add && <AddAnything onClose={() => setAdd(false)} />}
    </div>
  )
}
