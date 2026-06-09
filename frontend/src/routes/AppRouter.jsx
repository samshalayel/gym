import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'

// Lazy-load every heavy page so the login screen ships only its own small chunk.
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const MembersPage = lazy(() => import('../pages/MembersPage'))
const PlansPage = lazy(() => import('../pages/PlansPage'))
const SubscriptionsPage = lazy(() => import('../pages/SubscriptionsPage'))
const OffersPage = lazy(() => import('../pages/OffersPage'))
const EquipmentPage = lazy(() => import('../pages/EquipmentPage'))
const StaffPage = lazy(() => import('../pages/StaffPage'))
const MemberPortalPage = lazy(() => import('../pages/MemberPortalPage'))
const AttendancePage = lazy(() => import('../pages/AttendancePage'))
const MemberProgressPage = lazy(() => import('../pages/MemberProgressPage'))
const AttendanceReportPage = lazy(() => import('../pages/AttendanceReportPage'))
const ExpensesPage = lazy(() => import('../pages/ExpensesPage'))
const RevenueReportPage = lazy(() => import('../pages/RevenueReportPage'))
const SchedulePage = lazy(() => import('../pages/SchedulePage'))

const PageFallback = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(0,245,212,0.15)', borderTop: '3px solid #00f5d4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
)

const cashierAllowed = ['/', '/members', '/equipment', '/attendance', '/attendance-report', '/subscriptions', '/schedule']

function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const role = localStorage.getItem('role') || 'admin'
  if (role === 'member') return <Navigate to="/member-portal" replace />
  if (role === 'cashier' && !cashierAllowed.includes(location.pathname)) {
    return <Navigate to="/" replace />
  }
  if (new URLSearchParams(location.search).get('embed') === '1') return children
  return <MainLayout>{children}</MainLayout>
}

function MemberRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const role = localStorage.getItem('role') || 'admin'
  if (role !== 'member') return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const token = localStorage.getItem('token')
  if (token) {
    const role = localStorage.getItem('role') || 'admin'
    if (role === 'member') return <Navigate to="/member-portal" replace />
    return <Navigate to="/" replace />
  }
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
        <Route path="/members/:memberId/progress" element={<ProtectedRoute><MemberProgressPage /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
        <Route path="/attendance-report" element={<ProtectedRoute><AttendanceReportPage /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        <Route path="/revenue" element={<ProtectedRoute><RevenueReportPage /></ProtectedRoute>} />
        <Route path="/member-portal" element={<MemberRoute><MemberPortalPage /></MemberRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
