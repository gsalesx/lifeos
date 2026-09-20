import { AREA_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import { I } from '../components/Icons'

export function VillagePage() {
  const s = useLifeOS()
  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="mb-5 card p-5">
        <div className="text-sm font-bold">Nível da vila {s.level}</div>
        <p className="mt-1 text-xs text-[#71717a]">Cada área da vida vira um prédio. Completar hábitos e tarefas sobe o nível do edifício.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {s.buildings.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${b.color}18` }}><I.home size={20} color={b.color} /></div>
              <div>
                <div className="text-[15px] font-extrabold">{b.name}</div>
                <div className="text-[11px] text-[#a1a1aa]">{AREA_META[b.area].label} · Nível {b.level}</div>
              </div>
            </div>
            <div className="mb-1.5 h-2 overflow-hidden rounded bg-[#f0f0f1]"><div className="h-full rounded" style={{ width: `${b.progress}%`, background: b.color }} /></div>
            <div className="text-[11px] font-semibold text-[#a1a1aa]">{b.progress}% para o Nv {b.level + 1}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
