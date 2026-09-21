import { todayISO } from './dates'
import type { AreaId, Frequency, Priority } from '../store/types'
import { daysFromFrequency } from './logic'

export type HabitSuggestion = {
  id: string
  name: string
  hint: string
  category: AreaId
  frequency: Frequency
  xp: number
  color: string
  iconBg: string
  time?: string
  quantitative?: { goal: number; unit: string }
}

export type TaskSuggestion = {
  id: string
  title: string
  hint: string
  area: AreaId
  priority: Priority
  time?: string
}

export type EventSuggestion = {
  id: string
  title: string
  hint: string
  time: string
  location?: string
  recurrence?: 'weekly'
  weekdays?: number[]
}

export type ProjectSuggestion = {
  id: string
  name: string
  hint: string
  color: string
}

export const HABIT_SUGGESTIONS: HabitSuggestion[] = [
  { id: 'oracao', name: 'Oração', hint: '5 minutos de silêncio e fé', category: 'fe', frequency: 'daily', time: '07:00', xp: 15, color: '#f59e0b', iconBg: '#fef3c7' },
  { id: 'biblia', name: 'Bíblia', hint: 'Um capítulo por dia', category: 'fe', frequency: 'daily', time: '07:15', xp: 15, color: '#f59e0b', iconBg: '#fef3c7' },
  { id: 'agua', name: 'Água', hint: '8 copos · 2 litros', category: 'saude', frequency: 'daily', xp: 10, color: '#0ea5e9', iconBg: '#f0f9ff', quantitative: { goal: 8, unit: 'copos' } },
  { id: 'jiujitsu', name: 'Jiu Jitsu', hint: 'Seg, qua e sex', category: 'saude', frequency: [1, 3, 5], time: '08:00', xp: 40, color: '#16a34a', iconBg: '#f0fdf4' },
  { id: 'academia', name: 'Academia', hint: 'Segunda a sexta', category: 'saude', frequency: 'weekdays', time: '18:30', xp: 30, color: '#ef4444', iconBg: '#fef2f2' },
  { id: 'caminhada', name: 'Caminhada', hint: '20 minutos ao ar livre', category: 'saude', frequency: 'daily', time: '07:30', xp: 15, color: '#16a34a', iconBg: '#f0fdf4' },
  { id: 'leitura', name: 'Leitura', hint: '10 páginas ou 15 minutos', category: 'estudos', frequency: 'daily', time: '21:00', xp: 20, color: '#3b82f6', iconBg: '#eff6ff' },
  { id: 'vitaminas', name: 'Vitaminas', hint: 'Rotina rápida de manhã', category: 'saude', frequency: 'daily', time: '08:00', xp: 5, color: '#8b5cf6', iconBg: '#f5f3ff' },
  { id: 'foco', name: 'Deep work', hint: 'Um bloco sem distração', category: 'trabalho', frequency: 'weekdays', time: '09:00', xp: 20, color: '#4f46e5', iconBg: '#eef2ff' },
  { id: 'financas', name: 'Olhar o dinheiro', hint: '2 minutos no extrato', category: 'financas', frequency: 'daily', xp: 10, color: '#ec4899', iconBg: '#fdf2f8' },
]

export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  { id: 'prioridades', title: 'Definir 3 prioridades de hoje', hint: 'Começa o dia no comando', area: 'trabalho', priority: 'alta', time: '09:00' },
  { id: 'semana', title: 'Revisar a semana', hint: 'O que ficou para trás', area: 'trabalho', priority: 'media' },
  { id: 'estudo', title: 'Estudar 30 minutos', hint: 'Um bloco curto e real', area: 'estudos', priority: 'media', time: '20:00' },
  { id: 'dinheiro', title: 'Organizar as finanças da semana', hint: 'Contas, teto e sobra', area: 'financas', priority: 'media' },
  { id: 'alguem', title: 'Mandar mensagem para alguém importante', hint: 'Relacionamento também é rotina', area: 'fe', priority: 'baixa' },
]

export const EVENT_SUGGESTIONS: EventSuggestion[] = [
  { id: 'foco', title: 'Bloco de foco', hint: 'Protege 90 minutos', time: '09:00', recurrence: 'weekly', weekdays: [1, 2, 3, 4, 5], location: 'Casa / trabalho' },
  { id: 'treino', title: 'Treino', hint: 'Coloca o corpo na agenda', time: '18:30', recurrence: 'weekly', weekdays: [1, 3, 5] },
  { id: 'fe', title: 'Momento de fé', hint: 'Culto, oração ou grupo', time: '18:00', recurrence: 'weekly', weekdays: [0], location: 'Igreja' },
  { id: 'familia', title: 'Tempo em família', hint: 'Um compromisso que não desmarca', time: '20:00' },
]

export const PROJECT_SUGGESTIONS: ProjectSuggestion[] = [
  { id: 'pessoal', name: 'Pessoal', hint: 'Casa, saúde e vida', color: '#818cf8' },
  { id: 'trabalho', name: 'Trabalho', hint: 'Projetos e clientes', color: '#4f46e5' },
  { id: 'estudos', name: 'Estudos', hint: 'Cursos e leitura', color: '#f59e0b' },
  { id: 'fe', name: 'Fé', hint: 'Igreja e disciplinas', color: '#7c3aed' },
]

export function defaultHabitDraft(h: HabitSuggestion) {
  return { frequency: h.frequency, time: h.time || '', days: daysFromFrequency(h.frequency) }
}

export function defaultEventDraft(e: EventSuggestion) {
  return {
    recurrence: (e.recurrence === 'weekly' ? 'weekly' : 'once') as 'weekly' | 'once',
    weekdays: e.weekdays?.length ? e.weekdays : [new Date(`${todayISO()}T12:00:00`).getDay()],
    date: todayISO(),
    time: e.time,
    location: e.location || '',
  }
}

export function defaultTaskDraft(t: TaskSuggestion) {
  return { date: todayISO(), time: t.time || '', priority: t.priority }
}

export function defaultProjectDraft() {
  return { description: '' }
}
