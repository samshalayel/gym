import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import MembersPage from '../pages/MembersPage'
import PlansPage from '../pages/PlansPage'
import SubscriptionsPage from '../pages/SubscriptionsPage'
import OffersPage from '../pages/OffersPage'
import EquipmentPage from '../pages/EquipmentPage'
import StaffPage from '../pages/StaffPage'
import MemberPortalPage from '../pages/MemberPortalPage'
import AttendancePage from '../pages/AttendancePage'
import MemberProgressPage from '../pages/MemberProgressPage'
import AttendanceReportPage from '../pages/AttendanceReportPage'
import ExpensesPage from '../pages/ExpensesPage'
import RevenueReportPage from '../pages/RevenueReportPage'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const role = localStorage.getItem('role') || 'admin'
  if (role === 'member') return <Navigate to="/member-portal" replace />
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
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        <Route path="/revenue" element={<ProtectedRoute><RevenueReportPage /></ProtectedRoute>} />
        <Route path="/member-portal" element={<MemberRoute><MemberPortalPage /></MemberRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
