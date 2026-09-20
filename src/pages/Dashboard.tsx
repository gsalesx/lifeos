import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { todayISO } from '../lib/dates'
import { dayScore, habitDone, habitDueOn, hermesTips, PRIORITY_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import { I } from '../components/Icons'
import { useEffect, useState } from 'react'

export function Dashboard() {
  const s = useLifeOS()
  const today = todayISO()
  const dayTasks = s.tasks.filter((t) => !t.archived && t.date === today)
  const pending = dayTasks.filter((t) => !t.done)
  const done = dayTasks.filter((t) => t.done)
  const overdue = s.tasks.filter((t) => !t.archived && !t.done && t.date && t.date < today)
  const track = s.tracking[today]
  const score = dayScore(s.habits, s.tasks, track, today)
  const focus = s.tasks.find((t) => t.id === s.focusTaskId) ?? pending[0]
  const projectOf = (id?: string) => s.projects.find((p) => p.id === id)
  const dueHabits = s.habits.filter((h) => habitDueOn(h, today))
  const tips = hermesTips({ tasks: s.tasks, habits: s.habits, tracking: s.tracking, date: today })
  const events = s.events.filter((e) => e.date === today).sort((a, b) => a.time.localeCompare(b.time))
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const focusLeft = s.focusUntil ? Math.max(0, s.focusUntil - now) : 0
  const focusLabel = s.focusUntil
    ? `${String(Math.floor(focusLeft / 60000)).padStart(2, '0')}:${String(Math.floor((focusLeft % 60000) / 1000)).padStart(2, '0')}`
    : null

  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.75fr_1fr]">
        <div className="flex flex-col gap-4">
          {focus && (
            <div className="flex flex-col gap-4 rounded-2xl bg-[#18181b] px-4 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-[22px]">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white/10">
                <I.target size={22} color="#fff" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/50">Foque nisso agora</div>
                <div className="text-lg font-extrabold tracking-tight text-white">{focus.title}</div>
                <div className="mt-1 text-xs text-white/50">
                  {projectOf(focus.projectId)?.name ?? 'Pessoal'}
                  {focus.time && focus.timeEnd ? ` · Estimado ${focus.time}–${focus.timeEnd}` : focus.time ? ` · ${focus.time}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {s.focusUntil && focusLeft > 0 ? (
                  <button onClick={() => s.stopFocus()} className="rounded-[9px] bg-white px-5 py-2.5 text-[13px] font-bold">{focusLabel} · Encerrar</button>
                ) : (
                  <button onClick={() => s.startFocus(focus.id)} className="rounded-[9px] bg-white px-5 py-2.5 text-[13px] font-bold">Iniciar foco</button>
                )}
                <span className="text-[11px] text-white/40">25 minutos de foco profundo</span>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
            <div className="flex items-center gap-3 border-b border-[#f0f0f1] px-5 py-4">
              <I.list size={16} />
              <span className="text-sm font-bold">Tarefas de hoje</span>
              <div className="ml-auto flex gap-1.5">
                <span className="rounded-full bg-[#fef2f2] px-2.5 py-[3px] text-[11px] font-semibold text-[#ef4444]">{pending.length} pendentes</span>
                <span className="rounded-full bg-[#fafafa] px-2.5 py-[3px] text-[11px] font-semibold text-[#71717a]">{done.length} concluídas</span>
              </div>
            </div>
            <div className="hidden grid-cols-[26px_1fr_120px_80px_72px] gap-2.5 bg-[#fafafa] px-5 py-2 md:grid">
              {['', 'Tarefa', 'Projeto', 'Horário', 'Prior.'].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#a1a1aa]">{h}</span>
              ))}
            </div>
            {dayTasks.length === 0 && (
              <div className="border-t border-[#f0f0f1] px-5 py-8 text-center text-sm text-[#a1a1aa]">Nenhuma tarefa hoje. Adicione a primeira quando quiser.</div>
            )}
            {dayTasks.map((t) => {
              const prio = PRIORITY_META[t.priority]
              return (
                <button key={t.id} onClick={() => s.toggleTask(t.id)} className={`grid w-full grid-cols-[26px_1fr_auto] items-center gap-2.5 border-t border-[#f0f0f1] px-4 py-3 text-left md:grid-cols-[26px_1fr_120px_80px_72px] md:px-5 ${t.done ? 'opacity-50' : ''}`}>
                  <Check done={t.done} />
                  <span className={`min-w-0 text-[13px] font-medium ${t.done ? 'text-[#a1a1aa] line-through' : ''}`}>{t.title}</span>
                  <span className="hidden truncate text-[11px] text-[#71717a] md:block">{projectOf(t.projectId)?.name ?? '—'}</span>
                  <span className="hidden text-[11px] text-[#71717a] md:block">{t.time ? (t.timeEnd ? `${t.time} – ${t.timeEnd}` : t.time) : '—'}</span>
                  <span className="rounded-md px-2 py-[3px] text-center text-[10px] font-bold" style={{ color: prio.color, background: prio.bg }}>{prio.label}</span>
                </button>
              )
            })}
          </div>

          {overdue[0] && (
            <div className="flex flex-col gap-3 rounded-[13px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3.5 sm:px-[18px]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#fef3c7]"><I.warn size={18} color="#f59e0b" /></div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">"{overdue[0].title}" está atrasada</div>
                <div className="mt-0.5 text-[11px] text-[#a1a1aa]">Criada em {overdue[0].createdAt.split('-').reverse().join('/')} · {projectOf(overdue[0].projectId)?.name}</div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button onClick={() => s.toggleTask(overdue[0].id)} className="rounded-[7px] bg-[#18181b] px-3.5 py-1.5 text-[11px] font-bold text-white">Já fiz</button>
                <button onClick={() => s.rescheduleTask(overdue[0].id, today)} className="rounded-[7px] border border-[#e4e4e7] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#52525b]">Reagendar</button>
                <button onClick={() => s.archiveTask(overdue[0].id)} className="rounded-[7px] border border-[#e4e4e7] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#52525b]">Arquivar</button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">Projetos ativos</span>
              <Link to="/projetos" className="text-xs font-semibold text-[#4f46e5]">Ver todos</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {s.projects.filter((p) => p.status !== 'concluido').slice(0, 2).map((p) => {
                const pts = s.tasks.filter((t) => t.projectId === p.id && !t.archived)
                const pct = pts.length ? Math.round((pts.filter((t) => t.done).length / pts.length) * 100) : 0
                return (
                  <div key={p.id} className="rounded-[14px] border border-[#e4e4e7] bg-white p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${p.color}18` }}>
                        <I.bolt size={15} color={p.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold">{p.name}</div>
                        <div className="text-[10px] text-[#a1a1aa] capitalize">{p.status === 'andamento' ? 'Em andamento' : 'Planejamento'}</div>
                      </div>
                    </div>
                    <div className="mb-1.5 h-[5px] overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: p.color }} /></div>
                    <div className="flex justify-between text-[10px] font-semibold text-[#a1a1aa]"><span>{pct}% concluído</span><span>{pts.length} tarefas</span></div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e4e4e7] bg-white px-[22px] py-5">
            <div className="mb-5 text-[10px] font-bold uppercase tracking-[1px] text-[#a1a1aa]">Agenda de hoje</div>
            <div className={events.length ? 'relative pl-[52px]' : ''}>
              {events.length === 0 && <div className="text-sm text-[#a1a1aa]">Nada na agenda hoje.</div>}
              {events.length > 0 && <div className="absolute top-2 bottom-2 left-9 w-px bg-[#e4e4e7]" />}
              {events.map((e, i) => {
                const past = e.done || e.time < '12:00'
                const current = !e.done && i === events.findIndex((x) => !x.done)
                return (
                  <div key={e.id} className="relative mb-4 flex min-h-[22px] items-center last:mb-0">
                    <span className={`absolute left-[-52px] w-[30px] text-right text-[11px] font-semibold ${current ? 'font-bold text-[#18181b]' : past ? 'text-[#c4c4c6]' : 'text-[#a1a1aa]'}`}>{e.time.replace(/^0/, '')}</span>
                    <span className={`absolute ${current ? 'left-[-21px] size-3.5 bg-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,0.18)]' : 'left-[-19px] size-2.5 border-[1.5px] border-[#d4d4d8] bg-white'} rounded-full`} />
                    <div>
                      <div className={`text-[13px] font-medium ${current ? 'font-bold' : past ? 'text-[#c4c4c6]' : 'text-[#71717a]'}`}>{e.title}</div>
                      {current && e.location && <div className="mt-1 text-[11px] font-semibold text-[#f59e0b]">{e.location}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold">Score do dia</span>
              <span className="text-[22px] font-extrabold">{score.total}%</span>
            </div>
            <div className="mb-3.5 h-2.5 overflow-hidden rounded-[5px] bg-[#f0f0f1]"><div className="h-full rounded-[5px] bg-linear-to-r from-[#4f46e5] to-[#818cf8]" style={{ width: `${score.total}%` }} /></div>
            {[
              ['Tarefas', score.taskPct, '#4f46e5'],
              ['Hábitos', score.habitPct, '#16a34a'],
              ['Saúde', score.healthPct, '#f59e0b'],
              ['Foco', score.focusPct, '#7c3aed'],
            ].map(([label, pct, color]) => (
              <div key={String(label)} className="mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: String(color) }} />
                <span className="flex-1 text-xs font-semibold">{label}</span>
                <div className="h-[5px] w-20 overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full" style={{ width: `${pct}%`, background: String(color) }} /></div>
                <span className="w-7 text-right text-[11px] text-[#a1a1aa]">{pct}%</span>
              </div>
            ))}
          </div>

          <div className="card px-5 py-[18px]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-sm font-bold">Hábitos</span>
              <span className="text-xs text-[#a1a1aa]">{dueHabits.filter((h) => habitDone(h, today)).length}/{dueHabits.length} hoje</span>
            </div>
            <div className="flex flex-col gap-2">
              {dueHabits.length === 0 && <div className="text-sm text-[#a1a1aa]">Nenhum hábito ainda. Crie o primeiro quando quiser.</div>}
              {dueHabits.map((h) => {
                const doneH = habitDone(h, today)
                return (
                  <button key={h.id} onClick={() => s.toggleHabit(h.id)} className={`flex items-center gap-2.5 rounded-[10px] p-2.5 ${doneH ? 'bg-[#f0fdf4]' : 'bg-[#fafafa]'}`}>
                    <div className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${doneH ? 'bg-[#16a34a]' : 'border-2 border-[#d4d4d8]'}`}>
                      {doneH && <I.check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span className={`flex-1 text-left text-[13px] font-semibold ${doneH ? '' : 'text-[#52525b]'}`}>{h.name}</span>
                    <span className={`text-[10px] font-bold ${doneH ? 'text-[#16a34a]' : 'text-[#a1a1aa]'}`}>+{h.xp} XP</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card px-5 py-[18px]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-sm font-bold">Life Tracking</span>
              <Link to="/tracking" className="text-[11px] font-semibold text-[#4f46e5]">Registrar</Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <TrackTile color="#4f46e5" bg="#f0f4ff" label="Sono" value={track ? `${Math.floor((new Date(`2000-01-01T${track.wakeTime}`).getTime() - new Date(`2000-01-01T${track.bedTime}`).getTime() + (track.wakeTime < track.bedTime ? 86400000 : 0)) / 3600000)}h${String(Math.round(((new Date(`2000-01-01T${track.wakeTime}`).getTime() - new Date(`2000-01-01T${track.bedTime}`).getTime() + (track.wakeTime < track.bedTime ? 86400000 : 0)) / 60000) % 60)).padStart(2, '0')}` : '—'} sub={track ? `Dormiu ${track.bedTime}` : ''} icon={<I.moon size={20} color="#4f46e5" />} />
              <TrackTile color="#16a34a" bg="#ecfdf5" label="Água" value={track ? `${(track.water * 0.25).toFixed(1)}` : '0'} suffix="/2L" icon={<I.drop size={20} color="#16a34a" />} bar={track ? (track.water / 8) * 100 : 0} />
              <TrackTile color="#d97706" bg="#fefce8" label="Humor" value={['', 'Péssimo', 'Mau', 'Normal', 'Motivado', 'Ótimo'][track?.mood ?? 0] || '—'} icon={<I.smile size={20} color="#f59e0b" />} />
              <TrackTile color="#7c3aed" bg="#faf5ff" label="Energia" value={String(track ? Math.round(track.energy * 2) : 0)} suffix="/10" icon={<I.pulse size={20} color="#7c3aed" />} />
            </div>
          </div>

          <div className="card px-5 py-[18px]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-sm font-bold">Sua Vila</span>
              <span className="text-[11px] font-semibold text-[#a1a1aa]">Nível geral {s.level}</span>
            </div>
            {s.buildings.map((b) => (
              <div key={b.id} className="mb-2 flex items-center gap-2.5">
                <span className="w-[72px] shrink-0 text-xs font-semibold text-[#52525b]">{b.name}</span>
                <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#f0f0f1]"><div className="h-full" style={{ width: `${b.progress}%`, background: b.color }} /></div>
                <span className="w-7 text-right text-[10px] font-semibold text-[#a1a1aa]">Nv {b.level}</span>
              </div>
            ))}
            <Link to="/vila" className="mt-3.5 block w-full rounded-[9px] border border-[#e4e4e7] bg-[#fafafa] py-2 text-center text-xs font-semibold text-[#52525b]">Explorar Vila</Link>
          </div>

          <div className="rounded-2xl bg-linear-to-br from-[#18181b] to-[#27272a] px-5 py-[18px]">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="size-2 rounded-full bg-[#4ade80]" />
              <span className="text-sm font-bold text-white">Hermes IA</span>
            </div>
            <p className="mb-3.5 text-xs leading-relaxed text-[#a1a1aa]">{tips[0]}</p>
            <Link to="/hermes" className="inline-block rounded-lg border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white">Ver análise completa</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Check({ done }: { done: boolean }) {
  return done
    ? <div className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#18181b]"><I.check size={10} color="#fff" strokeWidth={3.5} /></div>
    : <div className="size-[18px] rounded-[5px] border-2 border-[#d4d4d8]" />
}

function TrackTile({ color, bg, label, value, suffix, sub, icon, bar }: { color: string; bg: string; label: string; value: string; suffix?: string; sub?: string; icon: ReactNode; bar?: number }) {
  return (
    <div className="rounded-xl p-3.5 text-center" style={{ background: bg }}>
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <div className="text-base font-extrabold">{value}{suffix && <span className="text-xs text-[#a1a1aa]">{suffix}</span>}</div>
      <div className="mt-0.5 text-[10px] font-semibold" style={{ color }}>{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-[#a1a1aa]">{sub}</div>}
      {bar !== undefined && <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-white/60"><div className="h-full" style={{ width: `${bar}%`, background: color }} /></div>}
    </div>
  )
}
