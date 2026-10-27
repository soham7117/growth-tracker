import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import Dashboard from './pages/Dashboard'

// Route-level code splitting keeps the heavy chart library out of the initial bundle.
interface AppRoute {
  path: string
  label: string
  icon: string
  element: ComponentType | LazyExoticComponent<ComponentType>
}

/** Single source of truth: drives the router, the sidebar and the mobile bar. */
export const ROUTES: AppRoute[] = [
  { path: '/', label: 'Dashboard', icon: '🏠', element: Dashboard },
  { path: '/roadmap', label: 'Roadmap', icon: '🐍', element: lazy(() => import('./pages/RoadmapPage')) },
  { path: '/timer', label: 'Timer', icon: '⏱️', element: lazy(() => import('./pages/TimerPage')) },
  { path: '/log', label: 'Journal', icon: '📓', element: lazy(() => import('./pages/LogPage')) },
  { path: '/skills', label: 'Skills', icon: '🧠', element: lazy(() => import('./pages/SkillsPage')) },
  { path: '/goals', label: 'Goals', icon: '🎯', element: lazy(() => import('./pages/GoalsPage')) },
  { path: '/practice', label: 'Practice', icon: '💻', element: lazy(() => import('./pages/PracticePage')) },
  { path: '/review', label: 'Review', icon: '🃏', element: lazy(() => import('./pages/ReviewPage')) },
  { path: '/insights', label: 'Insights', icon: '📊', element: lazy(() => import('./pages/InsightsPage')) },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆', element: lazy(() => import('./pages/LeaderboardPage')) },
  { path: '/settings', label: 'Settings', icon: '⚙️', element: lazy(() => import('./pages/SettingsPage')) },
]
