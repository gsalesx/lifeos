import type { ReactNode } from 'react'
import { formatDuration, minutesBetween, todayISO } from '../lib/dates'
import { useLifeOS } from '../store/useStore'
import { I } from '../components/Icons'

const BEDS = ['21:00', '22:00', '23:00', '00:00', '01:00']
const WAKES = ['05:00', '06:00', '07:00', '08:00', '09:00']
const MEALS = ['16h', '17h', '18h', '19h', '20h', '21h']
const MOODS = [
  { label: 'Péssimo', color: '#ef4444', bg: '#fef2f2', path: 'M16 16s-1.5-2-4-2-4 2-4 2' },
  { label: 'Mau', color: '#f97316', bg: '#fff7ed', path: 'M16 15.5s-1.5-1-4-1-4 1-4 1' },
  { label: 'Normal', color: '#a8a29e', bg: '#f5f5f4', path: '', flat: true },
  { label: 'Bem', color: '#f59e0b', bg: '#fefce8', path: 'M8 13s1.5 2 4 2 4-2 4-2' },
  { label: 'Ótimo', color: '#a855f7', bg: '#faf5ff', path: 'M7 13s2 3.5 5 3.5 5-3.5 5-3.5' },
]
const STRESS = ['#22c55e', '#22c55e', '#22c55e', '#84cc16', '#a3e635', '#f59e0b', '#f97316', '#ef4444', '#ef4444', '#dc2626']

export function TrackingPage() {
  const s = useLifeOS()
  const today = todayISO()
  const t = s.tracking[today] ?? { date: today, bedTime: '23:00', wakeTime: '07:00', mood: 3, stress: 3, energy: 3, water: 0, meal: '18h', notes: '' }
  const patch = (p: Partial<typeof t>) => s.saveTracking({ ...t, ...p, date: today })
  const dur = formatDuration(minutesBetween(t.bedTime, t.wakeTime))

  return (
    <div className="p-4 sm:p-6 lg:px-7">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="card px-[22px] py-5">
            <RowHead icon={<I.moon size={16} color="#4f46e5" />} bg="#eef2ff" title="Sono" extra={`${t.bedTime} → ${t.wakeTime} · ${dur}`} extraColor="#4f46e5" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold text-[#a1a1aa]">Dormiu</span>
              {BEDS.map((b) => <Chip key={b} on={t.bedTime === b} onClick={() => patch({ bedTime: b })}>{b.slice(0, 2)}</Chip>)}
              <span className="mx-2 text-[11px] font-semibold text-[#a1a1aa]">Acordou</span>
              {WAKES.map((b) => <Chip key={b} on={t.wakeTime === b} onClick={() => patch({ wakeTime: b })}>{b.slice(0, 2)}</Chip>)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.smile size={16} color="#ca8a04" />} bg="#fefce8" title="Humor" />
              <div className="flex gap-2">
                {MOODS.map((m, i) => {
                  const on = t.mood === i + 1
                  return (
                    <button key={m.label} onClick={() => patch({ mood: i + 1 })} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex aspect-square w-full max-w-[46px] items-center justify-center rounded-xl border-[1.5px]" style={{ background: on ? m.bg : '#fafafa', borderColor: on ? m.color : '#f0f0f1' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on ? m.color : '#d4d4d8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          {m.flat ? <line x1="8" y1="15" x2="16" y2="15" /> : <path d={m.path} />}
                          <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                      {on && <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.label}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.warn size={16} color="#ef4444" />} bg="#fef2f2" title={`Estresse · ${t.stress}/10`} />
              <div className="flex gap-1.5">
                {STRESS.map((c, i) => (
                  <button key={i} onClick={() => patch({ stress: i + 1 })} className="h-7 flex-1 rounded-[5px]" style={{ background: i < t.stress ? c : '#f0f0f1' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.bolt size={16} color="#f97316" />} bg="#fff7ed" title={`Energia · ${t.energy}/5`} />
              <div className="flex justify-center gap-3.5 py-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => patch({ energy: n })}>
                    <I.bolt size={28} color={n <= t.energy ? '#f97316' : '#d4d4d8'} fill={n <= t.energy ? '#f97316' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.drop size={16} color="#0ea5e9" />} bg="#f0f9ff" title={`Água · ${t.water}/8`} />
              <div className="flex items-center gap-2.5">
                <button onClick={() => patch({ water: Math.max(0, t.water - 1) })} className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-[#e4e4e7] bg-[#fafafa] text-lg font-bold text-[#71717a]">−</button>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 8 }, (_, i) => (
                    <button key={i} onClick={() => patch({ water: i + 1 })} className="h-7 flex-1 rounded-[5px]" style={{ background: i < t.water ? '#0ea5e9' : '#f0f0f1' }} />
                  ))}
                </div>
                <button onClick={() => patch({ water: Math.min(8, t.water + 1) })} className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#0ea5e9] text-lg font-bold text-white">+</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.folder size={16} color="#22c55e" />} bg="#f0fdf4" title="Última refeição" />
              <div className="flex flex-wrap gap-1.5">
                {MEALS.map((m) => <Chip key={m} on={t.meal === m} onClick={() => patch({ meal: m })} green>{m}</Chip>)}
              </div>
            </div>
            <div className="card px-[22px] py-5">
              <RowHead icon={<I.chat size={16} color="#71717a" />} bg="#f5f5f4" title="Observações" />
              <input value={t.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Como foi o dia hoje..." className="w-full rounded-[9px] border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-[13px] outline-none" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[1.2px] text-[#a1a1aa]">Resumo de hoje</div>
          <div className="card py-2">
            <Sum icon={<I.moon size={15} color="#4f46e5" />} label="Sono" value={dur} color="#4f46e5" />
            <Sum icon={<I.smile size={15} color="#ca8a04" />} label="Humor" value={MOODS[t.mood - 1]?.label ?? '—'} />
            <Sum icon={<I.warn size={15} color="#ef4444" />} label="Estresse" value={`${t.stress}/10`} />
            <Sum icon={<I.bolt size={15} color="#f97316" />} label="Energia" value={`${t.energy}/5`} />
            <Sum icon={<I.drop size={15} color="#0ea5e9" />} label="Água" value={`${t.water}/8`} last />
          </div>
        </div>
      </div>
    </div>
  )
}

function RowHead({ icon, bg, title, extra, extraColor }: { icon: ReactNode; bg: string; title: string; extra?: string; extraColor?: string }) {
  return (
    <div className="mb-[18px] flex items-center gap-2.5">
      <div className="flex size-[30px] items-center justify-center rounded-lg" style={{ background: bg }}>{icon}</div>
      <span className="text-xs font-bold uppercase tracking-wide text-[#71717a]">{title}</span>
      {extra && <span className="ml-auto font-mono text-[13px] font-bold" style={{ color: extraColor }}>{extra}</span>}
    </div>
  )
}
function Chip({ on, onClick, children, green }: { on: boolean; onClick: () => void; children: string; green?: boolean }) {
  const c = green ? '#22c55e' : '#4f46e5'
  return <button onClick={onClick} className="h-8 min-w-[38px] rounded-lg border px-3 font-mono text-xs font-bold" style={{ background: on ? c : '#fafafa', borderColor: on ? c : '#e4e4e7', color: on ? '#fff' : '#71717a' }}>{children}</button>
}
function Sum({ icon, label, value, color, last }: { icon: ReactNode; label: string; value: string; color?: string; last?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        {icon}
        <span className="flex-1 text-[13px] font-semibold text-[#52525b]">{label}</span>
        <span className="font-mono text-[13px] font-extrabold" style={{ color: color ?? '#18181b' }}>{value}</span>
      </div>
      {!last && <div className="mx-4 h-px bg-[#f0f0f1]" />}
    </>
  )
}
