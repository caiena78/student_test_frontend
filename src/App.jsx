import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/Login'
import AdminPage from './pages/admin/AdminPage'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import GroupsPage from './pages/teacher/GroupsPage'
import StudentsPage from './pages/teacher/StudentsPage'
import TestsListPage from './pages/teacher/TestsListPage'
import TestEditorPage from './pages/teacher/TestEditorPage'
import AssignTestPage from './pages/teacher/AssignTestPage'
import TestResultsPage from './pages/teacher/TestResultsPage'
import AttemptReviewPage from './pages/teacher/AttemptReviewPage'
import PrintJobsPage from './pages/teacher/PrintJobsPage'
import StudentDashboard from './pages/student/StudentDashboard'
import TakeTestPage from './pages/student/TakeTestPage'
import AttemptResultPage from './pages/student/AttemptResultPage'
import ChangePasswordPage from './pages/student/ChangePasswordPage'
import RoleRedirect from './components/RoleRedirect'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute roles={['admin','teacher','student']}><RoleRedirect /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } />

          {/* Teacher */}
          <Route path="/teacher" element={
            <ProtectedRoute roles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/teacher/groups" element={
            <ProtectedRoute roles={['teacher']}>
              <GroupsPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/students" element={
            <ProtectedRoute roles={['teacher']}>
              <StudentsPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/tests" element={
            <ProtectedRoute roles={['teacher']}>
              <TestsListPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/tests/new" element={
            <ProtectedRoute roles={['teacher']}>
              <TestEditorPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/tests/:id/edit" element={
            <ProtectedRoute roles={['teacher']}>
              <TestEditorPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/tests/:id/assign" element={
            <ProtectedRoute roles={['teacher']}>
              <AssignTestPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/tests/:id/results" element={
            <ProtectedRoute roles={['teacher']}>
              <TestResultsPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/attempts/:id" element={
            <ProtectedRoute roles={['teacher']}>
              <AttemptReviewPage />
            </ProtectedRoute>
          } />
          <Route path="/teacher/print-jobs" element={
            <ProtectedRoute roles={['teacher']}>
              <PrintJobsPage />
            </ProtectedRoute>
          } />

          {/* Student */}
          <Route path="/student" element={
            <ProtectedRoute roles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/attempt/:id" element={
            <ProtectedRoute roles={['student']}>
              <TakeTestPage />
            </ProtectedRoute>
          } />
          <Route path="/student/result/:id" element={
            <ProtectedRoute roles={['student']}>
              <AttemptResultPage />
            </ProtectedRoute>
          } />

          {/* Change password — accessible to any authenticated user with force_password_change */}
          <Route path="/change-password" element={
            <ProtectedRoute roles={['student','teacher','admin']}>
              <ChangePasswordPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
