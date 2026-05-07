import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsRes, groupsRes, studentsRes] = await Promise.all([
          client.get('/tests'),
          client.get('/teacher/groups'),
          client.get('/teacher/students'),
        ])

        const tests    = testsRes.data    || []
        const groups   = groupsRes.data   || []
        const students = studentsRes.data || []

        setStats({
          total_tests:     tests.length,
          published_tests: tests.filter(t => t.status === 'published').length,
          draft_tests:     tests.filter(t => t.status === 'draft').length,
          total_groups:    groups.length,
          total_students:  students.length,
        })
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <div>
            <h1>Welcome back, {user?.first_name}!</h1>
            <p className="text-muted">Here's an overview of your teaching activity.</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg"></div></div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats?.total_tests ?? 0}</div>
                <div className="stat-label">Total Tests</div>
                {stats && (
                  <div className="text-muted mt-2">
                    <span className="badge badge-published">{stats.published_tests ?? 0} published</span>
                    {' '}
                    <span className="badge badge-draft">{stats.draft_tests ?? 0} draft</span>
                  </div>
                )}
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats?.total_groups ?? 0}</div>
                <div className="stat-label">Groups</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats?.total_students ?? 0}</div>
                <div className="stat-label">Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: pendingReviews.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {pendingReviews.length}
                </div>
                <div className="stat-label">Pending Reviews</div>
              </div>
            </div>

            {pendingReviews.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Submissions Needing Review</h2>
                <div>
                  {pendingReviews.slice(0, 5).map(attempt => (
                    <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{attempt.student_name || `Student #${attempt.student_id}`}</div>
                        <div className="text-muted">{attempt.test_title || `Test #${attempt.test_id}`}</div>
                      </div>
                      <Link to={`/teacher/attempts/${attempt.id}`} className="btn btn-primary btn-sm">
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Access</h2>
            <div className="nav-cards">
              <Link to="/teacher/tests" className="nav-card">
                <div className="nav-card-icon">📝</div>
                <div className="nav-card-label">Tests</div>
                <div className="text-muted text-sm mt-2">Create and manage tests</div>
              </Link>
              <Link to="/teacher/groups" className="nav-card">
                <div className="nav-card-icon">👥</div>
                <div className="nav-card-label">Groups</div>
                <div className="text-muted text-sm mt-2">Manage student groups</div>
              </Link>
              <Link to="/teacher/students" className="nav-card">
                <div className="nav-card-icon">🎓</div>
                <div className="nav-card-label">Students</div>
                <div className="text-muted text-sm mt-2">View and manage students</div>
              </Link>
              <Link to="/teacher/tests/new" className="nav-card">
                <div className="nav-card-icon">➕</div>
                <div className="nav-card-label">New Test</div>
                <div className="text-muted text-sm mt-2">Create a new test</div>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
