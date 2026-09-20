import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AchievementsPage } from './pages/Achievements'
import { AuthPage } from './pages/Auth'
import { CalendarPage } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { HabitsPage } from './pages/Habits'
import { HermesPage } from './pages/Hermes'
import { ProjectsPage } from './pages/Projects'
import { StatsPage } from './pages/Stats'
import { TasksPage } from './pages/Tasks'
import { TrackingPage } from './pages/Tracking'
import { VillagePage } from './pages/Village'
import { Onboarding } from './pages/Onboarding'
import { useLifeOS } from './store/useStore'

export function App() {
  const store = useLifeOS()
  useEffect(() => { void store.bootstrap() }, [])

  if (!store.ready) {
    return <div className="flex h-full items-center justify-center text-sm text-[#a1a1aa]">Carregando LifeOS...</div>
  }
  if (!store.email) return <AuthPage />
  if (!store.onboardingDone) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="tarefas" element={<TasksPage />} />
        <Route path="habitos" element={<HabitsPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="estatisticas" element={<StatsPage />} />
        <Route path="projetos" element={<ProjectsPage />} />
        <Route path="vila" element={<VillagePage />} />
        <Route path="conquistas" element={<AchievementsPage />} />
        <Route path="hermes" element={<HermesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
