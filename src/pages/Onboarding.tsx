import { useState, type ReactNode } from 'react'
import { I } from '../components/Icons'
import { AREA_META } from '../lib/logic'
import {
  EVENT_SUGGESTIONS,
  eventDate,
  HABIT_SUGGESTIONS,
  PROJECT_SUGGESTIONS,
  TASK_SUGGESTIONS,
} from '../lib/onboarding'
import { todayISO } from '../lib/dates'
import { useLifeOS } from '../store/useStore'

const STEPS = [
  { id: 'ola', title: 'Bem-vindo', icon: I.bolt },
  { id: 'habitos', title: 'Hábitos', icon: I.habit },
  { id: 'tarefas', title: 'Tarefas', icon: I.list },
  { id: 'agenda', title: 'Agenda', icon: I.cal },
  { id: 'projetos', title: 'Projetos', icon: I.folder },
  { id: 'tracking', title: 'Tracking', icon: I.pulse },
] as const

export function Onboarding() {
  const store = useLifeOS()
  const [step, setStep] = useState(0)
  const [habits, setHabits] = useState<string[]>([])
  const [tasks, setTasks] = useState<string[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [projects, setProjects] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const last = step === STEPS.length - 1
  const current = STEPS[step]

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  async function finish(skip = false) {
    setBusy(true)
    setError('')
    try {
      if (skip) await store.completeOnboarding()
      else {
        await store.applyOnboarding({
          habits: HABIT_SUGGESTIONS.filter((h) => habits.includes(h.id)).map(({ name, category, frequency, xp, color, iconBg, quantitative }) => ({
            name, category, frequency, xp, color, iconBg, quantitative,
          })),
          tasks: TASK_SUGGESTIONS.filter((t) => tasks.includes(t.id)).map(({ title, area, priority, time }) => ({
            title, area, priority, time, date: todayISO(),
          })),
          events: EVENT_SUGGESTIONS.filter((e) => events.includes(e.id)).map(({ title, time, offsetDays, location }) => ({
            title, time, location, date: eventDate(offsetDays),
          })),
          projects: PROJECT_SUGGESTIONS.filter((p) => projects.includes(p.id)).map(({ name, color }) => ({ name, color })),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-end justify-center bg-[#f0f0f0] p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#e4e4e7] bg-white sm:max-h-[92vh] sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-[#f0f0f1] px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#18181b]">
            <current.icon size={16} color="#fff" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">Passo {step + 1} de {STEPS.length}</div>
            <div className="text-[15px] font-extrabold tracking-tight">{current.title}</div>
          </div>
          <button className="text-xs font-semibold text-[#71717a]" disabled={busy} onClick={() => void finish(true)}>Pular</button>
        </div>
        <div className="flex gap-1 px-5 pt-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#18181b]' : 'bg-[#e4e4e7]'}`} />
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <div>
              <h2 className="mb-2 text-2xl font-extrabold tracking-tight">Oi, {store.userName}. Sua vida começa limpa.</h2>
              <p className="mb-5 text-sm leading-relaxed text-[#52525b]">
                Nada de tarefas de outra pessoa. Você monta a rotina — fé, saúde, trabalho, estudos e dinheiro — e o LifeOS guarda tudo numa fonte só.
              </p>
              <div className="grid gap-2.5">
                {[
                  ['Hábitos', 'Toque nas sugestões que fazem sentido. O resto fica de fora.'],
                  ['Tarefas e agenda', 'Pode aplicar 1 ou 2 agora, ou pular e criar a sua.'],
                  ['Life Tracking', 'Sono, água e humor — você registra quando quiser.'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border border-[#e4e4e7] bg-[#fafafa] px-4 py-3">
                    <div className="text-[13px] font-bold">{t}</div>
                    <div className="mt-0.5 text-xs text-[#71717a]">{d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <StepIntro title="Quais hábitos entram na sua semana?" text="Toque para aplicar. Não precisa marcar todos — 3 bons já mudam o dia.">
              {HABIT_SUGGESTIONS.map((h) => (
                <PickCard key={h.id} active={habits.includes(h.id)} title={h.name} hint={h.hint} tag={AREA_META[h.category].label} color={h.color} onClick={() => toggle(habits, setHabits, h.id)} />
              ))}
            </StepIntro>
          )}
          {step === 2 && (
            <StepIntro title="Uma tarefa para destravar hoje" text="Sugestões leves. Você pode deixar zerado e criar as suas depois.">
              {TASK_SUGGESTIONS.map((t) => (
                <PickCard key={t.id} active={tasks.includes(t.id)} title={t.title} hint={t.hint} tag={AREA_META[t.area].label} color={AREA_META[t.area].color} onClick={() => toggle(tasks, setTasks, t.id)} />
              ))}
            </StepIntro>
          )}
          {step === 3 && (
            <StepIntro title="Coloque um compromisso na agenda" text="O calendário só fica útil quando o que importa tem horário.">
              {EVENT_SUGGESTIONS.map((e) => (
                <PickCard key={e.id} active={events.includes(e.id)} title={e.title} hint={`${e.hint} · ${e.time}`} tag="Agenda" color="#f59e0b" onClick={() => toggle(events, setEvents, e.id)} />
              ))}
            </StepIntro>
          )}
          {step === 4 && (
            <StepIntro title="Pastas para os seus projetos" text="Só um nome. As tarefas entram neles depois.">
              {PROJECT_SUGGESTIONS.map((p) => (
                <PickCard key={p.id} active={projects.includes(p.id)} title={p.name} hint={p.hint} tag="Projeto" color={p.color} onClick={() => toggle(projects, setProjects, p.id)} />
              ))}
            </StepIntro>
          )}
          {step === 5 && (
            <div>
              <h2 className="mb-2 text-xl font-extrabold tracking-tight">Life Tracking é o termômetro</h2>
              <p className="mb-5 text-sm leading-relaxed text-[#52525b]">
                Sono, água, humor e energia não vêm preenchidos. Você registra no seu ritmo — e o score do dia usa isso.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Sono', 'Hora de dormir e acordar'],
                  ['Água', 'Copos até 2L'],
                  ['Humor', 'Como você chegou hoje'],
                  ['Energia', 'Combustível do dia'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-3">
                    <div className="text-[13px] font-bold">{t}</div>
                    <div className="mt-0.5 text-[11px] text-[#71717a]">{d}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[#a1a1aa]">
                {habits.length + tasks.length + events.length + projects.length} sugestões prontas para aplicar. O resto você cria.
              </p>
            </div>
          )}
          {error && <div className="mt-4 rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#ef4444]">{error}</div>}
        </div>
        <div className="flex gap-2 border-t border-[#f0f0f1] px-5 py-4">
          {step > 0 && (
            <button className="rounded-xl border border-[#e4e4e7] px-4 py-2.5 text-sm font-bold" disabled={busy} onClick={() => setStep(step - 1)}>Voltar</button>
          )}
          <button
            disabled={busy}
            className="flex-1 rounded-xl bg-[#18181b] py-2.5 text-sm font-bold text-white disabled:opacity-60"
            onClick={() => { if (last) void finish(false); else setStep(step + 1) }}
          >
            {busy ? 'Salvando...' : last ? 'Começar meu LifeOS' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepIntro({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-xl font-extrabold tracking-tight">{title}</h2>
      <p className="mb-4 text-sm text-[#52525b]">{text}</p>
      <div className="grid gap-2">{children}</div>
    </div>
  )
}

function PickCard({ active, title, hint, tag, color, onClick }: { active: boolean; title: string; hint: string; tag: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left ${active ? 'border-[#18181b] bg-[#18181b] text-white' : 'border-[#e4e4e7] bg-white'}`}
    >
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-white bg-white' : 'border-[#d4d4d8]'}`}>
        {active && <I.check size={12} color="#18181b" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold">{title}</span>
        <span className={`block text-[11px] ${active ? 'text-white/60' : 'text-[#71717a]'}`}>{hint}</span>
      </span>
      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: active ? '#fff' : color, background: active ? 'rgba(255,255,255,0.12)' : `${color}18` }}>{tag}</span>
    </button>
  )
}
