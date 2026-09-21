import { useState, type ReactNode } from 'react'
import { DayChips } from '../components/DayChips'
import { I } from '../components/Icons'
import { Field, inputClass, Sheet } from '../components/Modal'
import { AREA_META, freqLabel, frequencyFromDays } from '../lib/logic'
import {
  defaultEventDraft,
  defaultHabitDraft,
  defaultProjectDraft,
  defaultTaskDraft,
  EVENT_SUGGESTIONS,
  HABIT_SUGGESTIONS,
  PROJECT_SUGGESTIONS,
  TASK_SUGGESTIONS,
  type EventSuggestion,
  type HabitSuggestion,
  type ProjectSuggestion,
} from '../lib/onboarding'
import { useLifeOS } from '../store/useStore'

const STEPS = [
  { id: 'ola', title: 'Bem-vindo', icon: I.bolt },
  { id: 'habitos', title: 'Hábitos', icon: I.habit },
  { id: 'tarefas', title: 'Tarefas', icon: I.list },
  { id: 'agenda', title: 'Agenda', icon: I.cal },
  { id: 'projetos', title: 'Projetos', icon: I.folder },
  { id: 'tracking', title: 'Tracking', icon: I.pulse },
] as const

type HabitDraft = ReturnType<typeof defaultHabitDraft>
type EventDraft = ReturnType<typeof defaultEventDraft>
type TaskDraft = ReturnType<typeof defaultTaskDraft>
type ProjectDraft = ReturnType<typeof defaultProjectDraft>
type SheetKind = { type: 'habit'; id: string } | { type: 'task'; id: string } | { type: 'event'; id: string } | { type: 'project'; id: string }

export function Onboarding() {
  const store = useLifeOS()
  const [step, setStep] = useState(0)
  const [habitIds, setHabitIds] = useState<string[]>([])
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [eventIds, setEventIds] = useState<string[]>([])
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [habitDrafts, setHabitDrafts] = useState<Record<string, HabitDraft>>({})
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({})
  const [eventDrafts, setEventDrafts] = useState<Record<string, EventDraft>>({})
  const [projectDrafts, setProjectDrafts] = useState<Record<string, ProjectDraft>>({})
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const last = step === STEPS.length - 1
  const current = STEPS[step]
  const selectedCount = habitIds.length + taskIds.length + eventIds.length + projectIds.length

  function pick<T extends { id: string }>(
    item: T,
    ids: string[],
    setIds: (v: string[]) => void,
    kind: SheetKind['type'],
    init: () => void,
  ) {
    if (!ids.includes(item.id)) {
      setIds([...ids, item.id])
      init()
    }
    setSheet({ type: kind, id: item.id })
  }

  async function finish(skip = false) {
    setBusy(true)
    setError('')
    try {
      if (skip) await store.completeOnboarding()
      else {
        await store.applyOnboarding({
          habits: HABIT_SUGGESTIONS.filter((h) => habitIds.includes(h.id)).map((h) => {
            const d = habitDrafts[h.id] ?? defaultHabitDraft(h)
            return { ...h, frequency: frequencyFromDays(d.days), time: d.time || undefined }
          }),
          tasks: TASK_SUGGESTIONS.filter((t) => taskIds.includes(t.id)).map((t) => {
            const d = taskDrafts[t.id] ?? defaultTaskDraft(t)
            return { title: t.title, area: t.area, priority: d.priority, time: d.time || undefined, date: d.date }
          }),
          events: EVENT_SUGGESTIONS.filter((e) => eventIds.includes(e.id)).map((e) => {
            const d = eventDrafts[e.id] ?? defaultEventDraft(e)
            return {
              title: e.title,
              time: d.time,
              location: d.location || e.location,
              date: d.date,
              recurrence: d.recurrence === 'weekly' ? 'weekly' as const : undefined,
              weekdays: d.recurrence === 'weekly' ? d.weekdays : undefined,
            }
          }),
          projects: PROJECT_SUGGESTIONS.filter((p) => projectIds.includes(p.id)).map((p) => ({
            name: p.name,
            color: p.color,
            description: (projectDrafts[p.id] ?? defaultProjectDraft()).description,
          })),
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
                Toque numa sugestão e ajuste o dia e o horário. Recorrência fica na agenda e nos hábitos — culto todo domingo, treino na segunda, quarta e sexta.
              </p>
              <div className="grid gap-2.5">
                {[
                  ['Hábitos', 'Dias da semana e horário, tipo Jiu Jitsu.'],
                  ['Agenda', 'Evento único ou toda semana no mesmo horário.'],
                  ['Projetos', 'Depois você entra e coloca subtarefas.'],
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
            <StepIntro title="Quais hábitos entram na sua semana?" text="Toque para escolher e definir os dias. Não precisa marcar todos.">
              {HABIT_SUGGESTIONS.map((h) => {
                const d = habitDrafts[h.id]
                const hint = habitIds.includes(h.id) && d
                  ? `${freqLabel(frequencyFromDays(d.days))}${d.time ? ` · ${d.time}` : ''}`
                  : h.hint
                return (
                  <PickCard key={h.id} active={habitIds.includes(h.id)} title={h.name} hint={hint} tag={AREA_META[h.category].label} color={h.color} onClick={() => pick(h, habitIds, setHabitIds, 'habit', () => setHabitDrafts((s) => ({ ...s, [h.id]: s[h.id] ?? defaultHabitDraft(h) })))} />
                )
              })}
            </StepIntro>
          )}
          {step === 2 && (
            <StepIntro title="Uma tarefa para destravar hoje" text="Toque e escolha data e hora, ou pule.">
              {TASK_SUGGESTIONS.map((t) => {
                const d = taskDrafts[t.id]
                const hint = taskIds.includes(t.id) && d ? `${d.date.split('-').reverse().join('/')} ${d.time}`.trim() : t.hint
                return (
                  <PickCard key={t.id} active={taskIds.includes(t.id)} title={t.title} hint={hint} tag={AREA_META[t.area].label} color={AREA_META[t.area].color} onClick={() => pick(t, taskIds, setTaskIds, 'task', () => setTaskDrafts((s) => ({ ...s, [t.id]: s[t.id] ?? defaultTaskDraft(t) })))} />
                )
              })}
            </StepIntro>
          )}
          {step === 3 && (
            <StepIntro title="Coloque um compromisso na agenda" text="Toque e diga se é só uma vez ou toda semana.">
              {EVENT_SUGGESTIONS.map((e) => {
                const d = eventDrafts[e.id]
                const hint = eventIds.includes(e.id) && d
                  ? d.recurrence === 'weekly'
                    ? `Toda semana · ${freqLabel(d.weekdays)} · ${d.time}`
                    : `${d.date.split('-').reverse().join('/')} · ${d.time}`
                  : `${e.hint} · ${e.time}`
                return (
                  <PickCard key={e.id} active={eventIds.includes(e.id)} title={e.title} hint={hint} tag="Agenda" color="#f59e0b" onClick={() => pick(e, eventIds, setEventIds, 'event', () => setEventDrafts((s) => ({ ...s, [e.id]: s[e.id] ?? defaultEventDraft(e) })))} />
                )
              })}
            </StepIntro>
          )}
          {step === 4 && (
            <StepIntro title="Pastas para os seus projetos" text="Depois você entra no projeto e adiciona subtarefas.">
              {PROJECT_SUGGESTIONS.map((p) => (
                <PickCard key={p.id} active={projectIds.includes(p.id)} title={p.name} hint={p.hint} tag="Projeto" color={p.color} onClick={() => pick(p, projectIds, setProjectIds, 'project', () => setProjectDrafts((s) => ({ ...s, [p.id]: s[p.id] ?? defaultProjectDraft() })))} />
              ))}
            </StepIntro>
          )}
          {step === 5 && (
            <div>
              <h2 className="mb-2 text-xl font-extrabold tracking-tight">Life Tracking é o termômetro</h2>
              <p className="mb-5 text-sm leading-relaxed text-[#52525b]">
                Sono, água, humor e energia não vêm preenchidos. Você registra no seu ritmo.
              </p>
              <p className="text-xs text-[#a1a1aa]">{selectedCount} itens prontos para aplicar.</p>
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

      {sheet?.type === 'habit' && (
        <HabitSheet
          item={HABIT_SUGGESTIONS.find((x) => x.id === sheet.id)!}
          draft={habitDrafts[sheet.id] ?? defaultHabitDraft(HABIT_SUGGESTIONS.find((x) => x.id === sheet.id)!)}
          onChange={(d) => setHabitDrafts((s) => ({ ...s, [sheet.id]: d }))}
          onClose={() => setSheet(null)}
          onRemove={() => { setHabitIds(habitIds.filter((id) => id !== sheet.id)); setSheet(null) }}
        />
      )}
      {sheet?.type === 'task' && (
        <TaskSheet
          draft={taskDrafts[sheet.id] ?? defaultTaskDraft(TASK_SUGGESTIONS.find((x) => x.id === sheet.id)!)}
          onChange={(d) => setTaskDrafts((s) => ({ ...s, [sheet.id]: d }))}
          onClose={() => setSheet(null)}
          onRemove={() => { setTaskIds(taskIds.filter((id) => id !== sheet.id)); setSheet(null) }}
        />
      )}
      {sheet?.type === 'event' && (
        <EventSheet
          item={EVENT_SUGGESTIONS.find((x) => x.id === sheet.id)!}
          draft={eventDrafts[sheet.id] ?? defaultEventDraft(EVENT_SUGGESTIONS.find((x) => x.id === sheet.id)!)}
          onChange={(d) => setEventDrafts((s) => ({ ...s, [sheet.id]: d }))}
          onClose={() => setSheet(null)}
          onRemove={() => { setEventIds(eventIds.filter((id) => id !== sheet.id)); setSheet(null) }}
        />
      )}
      {sheet?.type === 'project' && (
        <ProjectSheet
          item={PROJECT_SUGGESTIONS.find((x) => x.id === sheet.id)!}
          draft={projectDrafts[sheet.id] ?? defaultProjectDraft()}
          onChange={(d) => setProjectDrafts((s) => ({ ...s, [sheet.id]: d }))}
          onClose={() => setSheet(null)}
          onRemove={() => { setProjectIds(projectIds.filter((id) => id !== sheet.id)); setSheet(null) }}
        />
      )}
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

function HabitSheet({ item, draft, onChange, onClose, onRemove }: { item: HabitSuggestion; draft: HabitDraft; onChange: (d: HabitDraft) => void; onClose: () => void; onRemove: () => void }) {
  return (
    <Sheet title={item.name} onClose={onClose} footer={<SheetActions onRemove={onRemove} onDone={onClose} />}>
      <p className="mb-3 text-xs text-[#71717a]">Quais dias esse hábito vale?</p>
      <DayChips value={draft.days} onChange={(days) => onChange({ ...draft, days: days.length ? days : draft.days })} />
      <Field label="Horário (opcional)">
        <input type="time" className={inputClass} value={draft.time} onChange={(e) => onChange({ ...draft, time: e.target.value })} />
      </Field>
    </Sheet>
  )
}

function TaskSheet({ draft, onChange, onClose, onRemove }: { draft: TaskDraft; onChange: (d: TaskDraft) => void; onClose: () => void; onRemove: () => void }) {
  return (
    <Sheet title="Quando essa tarefa entra?" onClose={onClose} footer={<SheetActions onRemove={onRemove} onDone={onClose} />}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input type="date" className={inputClass} value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} /></Field>
        <Field label="Horário"><input type="time" className={inputClass} value={draft.time} onChange={(e) => onChange({ ...draft, time: e.target.value })} /></Field>
      </div>
    </Sheet>
  )
}

function EventSheet({ item, draft, onChange, onClose, onRemove }: { item: EventSuggestion; draft: EventDraft; onChange: (d: EventDraft) => void; onClose: () => void; onRemove: () => void }) {
  return (
    <Sheet title={item.title} onClose={onClose} footer={<SheetActions onRemove={onRemove} onDone={onClose} />}>
      <div className="mb-3 flex gap-1 rounded-[10px] bg-[#fafafa] p-1">
        {(['once', 'weekly'] as const).map((r) => (
          <button key={r} type="button" onClick={() => onChange({ ...draft, recurrence: r })} className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${draft.recurrence === r ? 'bg-[#18181b] text-white' : 'text-[#71717a]'}`}>
            {r === 'once' ? 'Só uma vez' : 'Toda semana'}
          </button>
        ))}
      </div>
      {draft.recurrence === 'weekly' ? (
        <>
          <p className="mb-2 text-xs text-[#71717a]">Dias</p>
          <DayChips value={draft.weekdays} onChange={(weekdays) => onChange({ ...draft, weekdays: weekdays.length ? weekdays : draft.weekdays })} />
        </>
      ) : (
        <Field label="Data"><input type="date" className={inputClass} value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} /></Field>
      )}
      <Field label="Horário">
        <input type="time" className={inputClass} value={draft.time} onChange={(e) => onChange({ ...draft, time: e.target.value })} />
      </Field>
    </Sheet>
  )
}

function ProjectSheet({ item, draft, onChange, onClose, onRemove }: { item: ProjectSuggestion; draft: ProjectDraft; onChange: (d: ProjectDraft) => void; onClose: () => void; onRemove: () => void }) {
  return (
    <Sheet title={item.name} onClose={onClose} footer={<SheetActions onRemove={onRemove} onDone={onClose} />}>
      <Field label="Pra que esse projeto existe?">
        <textarea className={`${inputClass} min-h-20`} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} placeholder="Opcional" />
      </Field>
    </Sheet>
  )
}

function SheetActions({ onRemove, onDone }: { onRemove: () => void; onDone: () => void }) {
  return (
    <>
      <button type="button" className="rounded-xl border border-[#e4e4e7] px-4 py-2.5 text-xs font-bold text-[#ef4444]" onClick={onRemove}>Remover</button>
      <button type="button" className="flex-1 rounded-xl bg-[#18181b] py-2.5 text-xs font-bold text-white" onClick={onDone}>Pronto</button>
    </>
  )
}
