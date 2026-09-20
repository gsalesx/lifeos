import { create } from 'zustand'
import { todayISO } from '../lib/dates'
import { api } from './api'
import type { AreaId, EventItem, Habit, LifeState, Priority, Project, Task, Tracking } from './types'

const empty: LifeState = {
  userName: '',
  xp: 0,
  nextLevelXp: 500,
  level: 1,
  tasks: [],
  habits: [],
  events: [],
  projects: [],
  tracking: {},
  buildings: [],
  focusTaskId: null,
  focusUntil: null,
  onboardingDone: true,
}

type Store = LifeState & {
  ready: boolean
  email: string
  error: string | null
  apply: (state: LifeState & { email?: string }) => void
  bootstrap: () => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  register: (input: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  applyOnboarding: (payload: {
    habits: Array<{ name: string; category: AreaId; frequency?: import('./types').Frequency; xp: number; color: string; iconBg: string; quantitative?: { goal: number; unit: string } }>
    tasks: Array<{ title: string; date?: string; time?: string; priority?: Priority; area?: AreaId }>
    events: Array<{ title: string; date: string; time: string; location?: string }>
    projects: Array<{ name: string; color: string }>
  }) => Promise<void>
  completeOnboarding: () => Promise<void>
  reopenOnboarding: () => Promise<void>
  setName: (name: string) => void
  toggleTask: (id: string) => void
  addTask: (input: { title: string; date?: string; time?: string; projectId?: string; priority?: Priority; area?: AreaId }) => void
  archiveTask: (id: string) => void
  rescheduleTask: (id: string, date: string) => void
  toggleHabit: (id: string, date?: string) => void
  setHabitValue: (id: string, value: number, date?: string) => void
  addHabit: (input: { name: string; category: AreaId; xp: number; color: string; iconBg: string; frequency?: import('./types').Frequency; quantitative?: { goal: number; unit: string } }) => void
  saveTracking: (partial: Partial<Tracking> & { date: string }) => void
  addEvent: (input: { title: string; date: string; time: string; location?: string }) => void
  addProject: (input: { name: string; color: string }) => void
  startFocus: (taskId: string) => void
  stopFocus: () => void
  resetDemo: () => void
}

export const useLifeOS = create<Store>((set, get) => ({
  ...empty,
  ready: false,
  email: '',
  error: null,
  apply: (state) => set({ ...state, email: state.email || get().email, ready: true, error: null }),
  bootstrap: async () => {
    try {
      const data = await api('/api/auth/me')
      get().apply(data.state as LifeState & { email?: string })
      return true
    } catch {
      set({ ready: true })
      return false
    }
  },
  login: async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    get().apply(data.state as LifeState & { email?: string })
  },
  register: async (input) => {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
    get().apply(data.state as LifeState & { email?: string })
  },
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ ...empty, ready: true, email: '', onboardingDone: true })
  },
  applyOnboarding: async (payload) => {
    const data = await api('/api/onboarding/apply', { method: 'POST', body: JSON.stringify(payload) })
    get().apply(data.state as LifeState & { email?: string })
  },
  completeOnboarding: async () => {
    const data = await api('/api/onboarding/complete', { method: 'POST' })
    get().apply(data.state as LifeState & { email?: string })
  },
  reopenOnboarding: async () => {
    const data = await api('/api/onboarding/reset', { method: 'POST' })
    get().apply(data.state as LifeState & { email?: string })
  },
  setName: (name) => {
    set({ userName: name })
    void api('/api/profile', { method: 'PATCH', body: JSON.stringify({ name }) }).then((d) => get().apply(d.state))
  },
  toggleTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })
    void api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done: !task.done }) }).then((d) => get().apply(d.state))
  },
  addTask: (input) => {
    void api('/api/tasks', { method: 'POST', body: JSON.stringify(input) }).then((d) => get().apply(d.state))
  },
  archiveTask: (id) => {
    set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, archived: true } : t)) })
    void api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) }).then((d) => get().apply(d.state))
  },
  rescheduleTask: (id, date) => {
    set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, date } : t)) })
    void api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ date }) }).then((d) => get().apply(d.state))
  },
  toggleHabit: (id, date = todayISO()) => {
    void api(`/api/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date }) }).then((d) => get().apply(d.state))
  },
  setHabitValue: (id, value, date = todayISO()) => {
    void api(`/api/habits/${id}/value`, { method: 'POST', body: JSON.stringify({ value, date }) }).then((d) => get().apply(d.state))
  },
  addHabit: (input) => {
    void api('/api/habits', { method: 'POST', body: JSON.stringify(input) }).then((d) => get().apply(d.state))
  },
  saveTracking: (partial) => {
    const prev = get().tracking[partial.date] ?? {
      date: partial.date, bedTime: '23:00', wakeTime: '07:00', mood: 3, stress: 3, energy: 3, water: 0,
    }
    const next = { ...prev, ...partial }
    set({ tracking: { ...get().tracking, [partial.date]: next } })
    void api('/api/tracking', { method: 'PUT', body: JSON.stringify(next) }).then((d) => get().apply(d.state))
  },
  addEvent: (input) => {
    void api('/api/events', { method: 'POST', body: JSON.stringify(input) }).then((d) => get().apply(d.state))
  },
  addProject: (input) => {
    void api('/api/projects', { method: 'POST', body: JSON.stringify(input) }).then((d) => get().apply(d.state))
  },
  startFocus: (taskId) => {
    set({ focusTaskId: taskId, focusUntil: Date.now() + 25 * 60 * 1000 })
    void api('/api/focus', { method: 'POST', body: JSON.stringify({ taskId }) }).then((d) => get().apply(d.state))
  },
  stopFocus: () => {
    set({ focusUntil: null })
    void api('/api/focus/stop', { method: 'POST' }).then((d) => get().apply(d.state))
  },
  resetDemo: () => {},
}))

export type { EventItem, Habit, Project, Task, Tracking }
