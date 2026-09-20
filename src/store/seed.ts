import { addDays, todayISO, weekday } from '../lib/dates'
import type { Building, Habit, LifeState, Project, Task, Tracking } from './types'

const TODAY = todayISO()

function habitLogs(rate: number, skipWeekends = false, days = 34) {
  const logs: Record<string, boolean> = {}
  for (let i = days; i >= 1; i--) {
    const iso = addDays(TODAY, -i)
    const dow = weekday(iso)
    if (skipWeekends && (dow === 0 || dow === 6)) continue
    logs[iso] = Math.random() < rate
  }
  return logs
}

function quantLogs(rate: number, goal: number, days = 34) {
  const logs: Record<string, number> = {}
  for (let i = days; i >= 1; i--) {
    const iso = addDays(TODAY, -i)
    if (Math.random() < rate) logs[iso] = Math.max(4, Math.round(goal * (0.6 + Math.random() * 0.5)))
  }
  return logs
}

const projects: Project[] = [
  { id: 'p-saas', name: 'SaaS Shopify', status: 'andamento', color: '#4f46e5', icon: 'bolt' },
  { id: 'p-port', name: 'Portfólio Dev', status: 'planejamento', color: '#16a34a', icon: 'folder' },
  { id: 'p-com', name: 'Comercial', status: 'andamento', color: '#f59e0b', icon: 'folder' },
  { id: 'p-pes', name: 'Pessoal', status: 'andamento', color: '#818cf8', icon: 'folder' },
]

const habits: Habit[] = [
  { id: 'h-oracao', name: 'Oração', category: 'fe', frequency: 'daily', xp: 15, color: '#f59e0b', iconBg: '#fef3c7', logs: { ...habitLogs(0.94), [TODAY]: true } },
  { id: 'h-biblia', name: 'Bíblia', category: 'fe', frequency: 'daily', xp: 15, color: '#f59e0b', iconBg: '#fef3c7', logs: habitLogs(0.78) },
  { id: 'h-jj', name: 'Jiu Jitsu', category: 'saude', frequency: [1, 3, 5], xp: 40, color: '#16a34a', iconBg: '#f0fdf4', logs: { ...habitLogs(0.86, true), ...(weekday(TODAY) === 1 || weekday(TODAY) === 3 || weekday(TODAY) === 5 ? { [TODAY]: true } : {}) } },
  { id: 'h-agua', name: 'Água', category: 'saude', frequency: 'daily', xp: 10, color: '#0ea5e9', iconBg: '#f0f9ff', quantitative: { goal: 8, unit: 'copos' }, logs: { ...quantLogs(0.88, 8), [TODAY]: 6 } },
  { id: 'h-acad', name: 'Academia', category: 'saude', frequency: 'weekdays', xp: 30, color: '#ef4444', iconBg: '#fef2f2', logs: habitLogs(0.55, true) },
  { id: 'h-leitura', name: 'Leitura', category: 'estudos', frequency: 'daily', xp: 20, color: '#3b82f6', iconBg: '#eff6ff', logs: { ...habitLogs(0.72), [TODAY]: true } },
  { id: 'h-vit', name: 'Vitaminas', category: 'saude', frequency: 'daily', xp: 5, color: '#8b5cf6', iconBg: '#f5f3ff', logs: { ...habitLogs(0.96), [TODAY]: true } },
]

const tasks: Task[] = [
  { id: 't-landing', title: 'Criar Landing Page', projectId: 'p-saas', area: 'trabalho', date: TODAY, time: '09:00', timeEnd: '11:30', priority: 'alta', done: false, archived: false, createdAt: addDays(TODAY, -3) },
  { id: 't-cliente', title: 'Reunião com cliente', projectId: 'p-com', area: 'trabalho', date: TODAY, time: '16:00', priority: 'alta', done: false, archived: false, createdAt: addDays(TODAY, -1) },
  { id: 't-ingles', title: 'Estudar inglês', projectId: 'p-pes', area: 'estudos', date: TODAY, time: '20:00', priority: 'baixa', done: false, archived: false, createdAt: TODAY },
  { id: 't-code', title: 'Revisar código do projeto', projectId: 'p-saas', area: 'trabalho', date: TODAY, time: '14:00', priority: 'media', done: true, archived: false, createdAt: addDays(TODAY, -2) },
  { id: 't-port', title: 'Atualizar portfólio', projectId: 'p-port', area: 'trabalho', date: TODAY, priority: 'baixa', done: true, archived: false, createdAt: addDays(TODAY, -4) },
  { id: 't-dominio', title: 'Configurar domínio', projectId: 'p-saas', area: 'trabalho', date: addDays(TODAY, -2), priority: 'alta', done: false, archived: false, createdAt: addDays(TODAY, -4) },
  { id: 't-metas', title: 'Revisar metas da semana', projectId: 'p-pes', area: 'trabalho', date: TODAY, priority: 'media', done: false, archived: false, createdAt: TODAY },
  { id: 't-ler', title: 'Ler 30 páginas', projectId: 'p-pes', area: 'estudos', date: TODAY, priority: 'media', done: true, archived: false, createdAt: TODAY },
  { id: 't-w1', title: 'Daily e revisão', projectId: 'p-saas', area: 'trabalho', date: addDays(TODAY, -1), priority: 'media', done: true, archived: false, createdAt: addDays(TODAY, -1) },
  { id: 't-w2', title: 'Ajustar checkout', projectId: 'p-saas', area: 'trabalho', date: addDays(TODAY, -2), priority: 'alta', done: true, archived: false, createdAt: addDays(TODAY, -3) },
  { id: 't-w3', title: 'Estudar vocabulário', projectId: 'p-pes', area: 'estudos', date: addDays(TODAY, -3), priority: 'baixa', done: true, archived: false, createdAt: addDays(TODAY, -3) },
  { id: 't-w4', title: 'Landing hero', projectId: 'p-saas', area: 'trabalho', date: addDays(TODAY, -4), priority: 'alta', done: true, archived: false, createdAt: addDays(TODAY, -5) },
  { id: 't-w5', title: 'Reunião comercial', projectId: 'p-com', area: 'trabalho', date: addDays(TODAY, -5), priority: 'alta', done: true, archived: false, createdAt: addDays(TODAY, -6) },
  { id: 't-w6', title: 'Treino extra', projectId: 'p-pes', area: 'saude', date: addDays(TODAY, -6), priority: 'media', done: true, archived: false, createdAt: addDays(TODAY, -6) },
]

function trackingHistory() {
  const map: Record<string, Tracking> = {}
  const beds = ['22:00', '22:30', '23:00', '23:30']
  const wakes = ['06:00', '06:30', '07:00', '07:30']
  for (let i = 14; i >= 1; i--) {
    const date = addDays(TODAY, -i)
    map[date] = {
      date,
      bedTime: beds[i % beds.length],
      wakeTime: wakes[i % wakes.length],
      mood: 3 + ((i * 3) % 3),
      stress: 2 + (i % 5),
      energy: 3 + (i % 3),
      water: 5 + (i % 4),
      meal: '19h',
    }
  }
  map[TODAY] = {
    date: TODAY,
    bedTime: '22:30',
    wakeTime: '06:00',
    mood: 4,
    stress: 3,
    energy: 4,
    water: 6,
    meal: '18h',
    notes: '',
  }
  return map
}

const buildings: Building[] = [
  { id: 'b-igreja', name: 'Igreja', area: 'fe', level: 2, progress: 40, color: '#7c3aed' },
  { id: 'b-acad', name: 'Academia', area: 'saude', level: 3, progress: 60, color: '#ef4444' },
  { id: 'b-biblio', name: 'Biblioteca', area: 'estudos', level: 1, progress: 20, color: '#f59e0b' },
  { id: 'b-oficina', name: 'Oficina', area: 'trabalho', level: 2, progress: 40, color: '#4f46e5' },
  { id: 'b-casa', name: 'Casa', area: 'financas', level: 4, progress: 80, color: '#16a34a' },
]

export function createSeed(): LifeState {
  return {
    userName: 'Lucas',
    xp: 3240,
    nextLevelXp: 5000,
    level: 12,
    tasks,
    habits,
    events: [
      { id: 'e-daily', title: 'Daily standup', date: TODAY, time: '10:00', location: 'Google Meet', done: true },
      { id: 'e-saas', title: 'Reunião SaaS Shopify', date: TODAY, time: '14:00', location: 'Google Meet' },
      { id: 'e-cliente', title: 'Reunião com cliente', date: TODAY, time: '16:00', location: 'Google Meet' },
    ],
    projects,
    tracking: trackingHistory(),
    buildings,
    focusTaskId: 't-landing',
    focusUntil: null,
  }
}
