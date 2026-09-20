import { todayISO } from '../lib/dates'
import { hermesTips } from '../lib/logic'
import { useLifeOS } from '../store/useStore'

export function HermesPage() {
  const s = useLifeOS()
  const tips = hermesTips({ tasks: s.tasks, habits: s.habits, tracking: s.tracking, date: todayISO() })
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:px-7">
      <div className="mb-5 rounded-2xl bg-linear-to-br from-[#18181b] to-[#27272a] p-6 text-white">
        <div className="mb-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#4ade80]" />
          <span className="text-sm font-bold">Hermes está online</span>
        </div>
        <p className="text-[13px] leading-relaxed text-[#a1a1aa]">Análise local com base nas suas tarefas, hábitos e tracking. Sem API externa — os insights saem dos seus dados neste navegador.</p>
      </div>
      <div className="flex flex-col gap-3">
        {tips.map((t) => (
          <div key={t} className="card p-5 text-[13px] leading-relaxed">{t}</div>
        ))}
      </div>
    </div>
  )
}
