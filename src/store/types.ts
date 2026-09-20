export type Priority = 'alta' | 'media' | 'baixa'
export type ProjectStatus = 'planejamento' | 'andamento' | 'pausado' | 'concluido'
export type Frequency = 'daily' | 'weekdays' | number[]

export type AreaId = 'fe' | 'saude' | 'trabalho' | 'estudos' | 'financas'

export type Task = {
  id: string
  title: string
  projectId?: string
  area?: AreaId
  date?: string
  time?: string
  timeEnd?: string
  priority: Priority
  done: boolean
  archived: boolean
  createdAt: string
}

export type Habit = {
  id: string
  name: string
  category: AreaId
  frequency: Frequency
  xp: number
  color: string
  iconBg: string
  quantitative?: { goal: number; unit: string }
  logs: Record<string, number | boolean>
}

export type EventItem = {
  id: string
  title: string
  date: string
  time: string
  location?: string
  done?: boolean
}

export type Project = {
  id: string
  name: string
  status: ProjectStatus
  color: string
  icon: string
}

export type Tracking = {
  date: string
  bedTime: string
  wakeTime: string
  mood: number
  stress: number
  energy: number
  water: number
  meal?: string
  notes?: string
}

export type Building = {
  id: string
  name: string
  area: AreaId
  level: number
  progress: number
  color: string
}

export type Achievement = {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export type LifeState = {
  userName: string
  xp: number
  nextLevelXp: number
  level: number
  tasks: Task[]
  habits: Habit[]
  events: EventItem[]
  projects: Project[]
  tracking: Record<string, Tracking>
  buildings: Building[]
  focusTaskId: string | null
  focusUntil: number | null
}
