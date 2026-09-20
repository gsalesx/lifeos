import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { AREA_META } from '../lib/logic'
import { useLifeOS } from '../store/useStore'
import type { AreaId, Priority } from '../store/types'
import { Field, inputClass, Modal } from './Modal'

export function AddAnything({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'tarefa' | 'habito' | 'evento' | 'projeto'>('tarefa')
  const store = useLifeOS()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [projectId, setProjectId] = useState(store.projects[0]?.id ?? '')
  const [area, setArea] = useState<AreaId>('trabalho')
  const [color, setColor] = useState('#4f46e5')

  function submit() {
    if (!title.trim()) return
    if (tab === 'tarefa') store.addTask({ title, date, time: time || undefined, priority, projectId, area })
    if (tab === 'habito') store.addHabit({ name: title, category: area, xp: 15, color, iconBg: '#f4f4f5' })
    if (tab === 'evento') store.addEvent({ title, date, time: time || '09:00' })
    if (tab === 'projeto') store.addProject({ name: title, color })
    onClose()
  }

  return (
    <Modal title="Adicionar" onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-[10px] bg-[#fafafa] p-1">
        {(['tarefa', 'habito', 'evento', 'projeto'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize ${tab === t ? 'bg-[#18181b] text-white' : 'text-[#71717a]'}`}>
            {t === 'habito' ? 'hábito' : t}
          </button>
        ))}
      </div>
      <Field label="Nome">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que você quer adicionar?" autoFocus />
      </Field>
      {(tab === 'tarefa' || tab === 'evento') && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Horário"><input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
      )}
      {tab === 'tarefa' && (
        <>
          <Field label="Projeto">
            <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {store.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Prioridade">
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </Field>
        </>
      )}
      {(tab === 'tarefa' || tab === 'habito') && (
        <Field label="Área">
          <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value as AreaId)}>
            {Object.entries(AREA_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
          </select>
        </Field>
      )}
      {(tab === 'habito' || tab === 'projeto') && (
        <Field label="Cor">
          <input type="color" className="h-10 w-full rounded-lg border border-[#e4e4e7]" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
      )}
      <button onClick={submit} className="mt-2 w-full rounded-[9px] bg-[#18181b] py-2.5 text-[13px] font-bold text-white">Salvar</button>
    </Modal>
  )
}
