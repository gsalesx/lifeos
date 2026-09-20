import { habitStreak, habitDone, habitDueOn } from '../lib/logic'
import { todayISO } from '../lib/dates'
import { useLifeOS } from '../store/useStore'
import { I } from '../components/Icons'

export function AchievementsPage() {
  const s = useLifeOS()
  const today = todayISO()
  const maxStreak = Math.max(0, ...s.habits.map((h) => habitStreak(h, today)))
  const doneHabits = s.habits.filter((h) => habitDueOn(h, today) && habitDone(h, today)).length
  const doneTasks = s.tasks.filter((t) => t.done).length
  const badges = [
    { title: 'Primeiro foco', desc: 'Inicie um bloco de 25 min', on: !!s.focusTaskId },
    { title: 'Sequência 7', desc: 'Mantenha um hábito por 7 dias', on: maxStreak >= 7 },
    { title: 'Sequência 21', desc: 'Três semanas no mesmo hábito', on: maxStreak >= 21 },
    { title: 'Dia cheio', desc: 'Complete todos os hábitos do dia', on: doneHabits > 0 && doneHabits === s.habits.filter((h) => habitDueOn(h, today)).length },
    { title: 'Executor', desc: 'Conclua 10 tarefas', on: doneTasks >= 10 },
    { title: 'Nível 10', desc: 'Chegue ao nível 10', on: s.level >= 10 },
    { title: 'Vila viva', desc: 'Tenha 5 prédios na vila', on: s.buildings.length >= 5 },
    { title: 'Corpo e mente', desc: 'Registre sono, humor e água hoje', on: !!(s.tracking[today]?.mood && s.tracking[today]?.water) },
  ]
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:px-7 xl:grid-cols-4">
      {badges.map((b) => (
        <div key={b.title} className={`card p-5 ${b.on ? '' : 'opacity-50'}`}>
          <div className={`mb-3 flex size-11 items-center justify-center rounded-xl ${b.on ? 'bg-[#fef3c7]' : 'bg-[#f4f4f5]'}`}>
            <I.medal size={20} color={b.on ? '#f59e0b' : '#a1a1aa'} />
          </div>
          <div className="text-[14px] font-bold">{b.title}</div>
          <div className="mt-1 text-[12px] text-[#71717a]">{b.desc}</div>
          <div className={`mt-3 text-[11px] font-bold ${b.on ? 'text-[#16a34a]' : 'text-[#a1a1aa]'}`}>{b.on ? 'Desbloqueada' : 'Bloqueada'}</div>
        </div>
      ))}
    </div>
  )
}
