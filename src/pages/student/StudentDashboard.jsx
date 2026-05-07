import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(null) // test id being started

  useEffect(() => {
    client.get('/student/tests')
      .then(res => setTests(res.data))
      .catch(() => setError('Failed to load assignments'))
      .finally(() => setLoading(false))
  }, [])

  const handleAction = async (test) => {
    const status = test.latest_attempt_status

    if (status === 'in_progress' && test.latest_attempt_id) {
      navigate(`/student/attempt/${test.latest_attempt_id}`)
      return
    }

    if ((status === 'submitted' || status === 'graded') && test.latest_attempt_id) {
      navigate(`/student/result/${test.latest_attempt_id}`)
      return
    }

    // No attempt yet — start one
    setStarting(test.id)
    setError('')
    try {
      const res = await client.post(`/student/tests/${test.id}/start`)
      const attemptId = res.data.attempt?.id || res.data.id
      navigate(`/student/attempt/${attemptId}`)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to start test')
    } finally {
      setStarting(null)
    }
  }

  const getStatusInfo = (test) => {
    const status = test.latest_attempt_status
    if (!status) {
      return { label: 'Not Started', color: 'var(--text-muted)', bg: '#f1f5f9', action: 'Start Test', btnClass: 'btn-primary' }
    }
    if (status === 'in_progress') {
      return { label: 'In Progress', color: 'var(--primary)', bg: '#dbeafe', action: 'Continue', btnClass: 'btn-primary' }
    }
    if (status === 'submitted') {
      return { label: 'Submitted', color: '#1e40af', bg: '#dbeafe', action: 'View Result', btnClass: 'btn-ghost' }
    }
    if (status === 'graded') {
      return { label: 'Graded', color: 'var(--success)', bg: '#d1fae5', action: 'View Result', btnClass: 'btn-ghost' }
    }
    return { label: status, color: 'var(--text-muted)', bg: '#f1f5f9', action: 'View', btnClass: 'btn-ghost' }
  }

  const isOverdue = (test) => {
    if (!test.due_date) return false
    const status = test.latest_attempt_status
    if (status === 'submitted' || status === 'graded') return false
    return new Date(test.due_date) < new Date()
  }

  const attemptsLeft = (test) => {
    const used = Number(test.attempts_used) || 0
    const allowed = Number(test.attempts_allowed) || 1
    return allowed - used
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <div>
            <h1>My Tests</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>Welcome, {user?.first_name || user?.username}!</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg"></div></div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p>No tests assigned yet. Check back later!</p>
          </div>
        ) : (
          <div>
            {tests.map(test => {
              const statusInfo = getStatusInfo(test)
              const overdue = isOverdue(test)
              const left = attemptsLeft(test)
              const isStarting = starting === test.id
              const cantStart = left <= 0 && !test.latest_attempt_status

              return (
                <div key={test.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                          {test.title}
                        </h2>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: statusInfo.color, background: statusInfo.bg }}>
                          {statusInfo.label}
                        </span>
                        {overdue && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>⚠ Overdue</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                        {test.due_date && (
                          <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                            Due: {new Date(test.due_date).toLocaleString()}
                          </span>
                        )}
                        {test.time_limit_minutes > 0 && (
                          <span>⏱ {test.time_limit_minutes} min</span>
                        )}
                        {test.question_count > 0 && (
                          <span>📝 {test.question_count} question{test.question_count !== 1 ? 's' : ''}</span>
                        )}
                        {test.attempt_number > 0 && (
                          <span>Attempt {test.attempt_number}</span>
                        )}
                        {test.attempts_allowed > 1 && (
                          <span>{left > 0 ? `${left} attempt${left !== 1 ? 's' : ''} left` : 'No attempts left'}</span>
                        )}
                      </div>

                      {/* Score display */}
                      {(test.latest_attempt_status === 'graded' || test.latest_attempt_status === 'submitted') &&
                        test.show_grade_on_completion &&
                        test.latest_attempt_score != null && (
                          <div style={{ marginTop: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary)' }}>
                              {test.latest_attempt_score}
                            </span>
                            {test.latest_attempt_max_score > 0 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                {' '}/ {test.latest_attempt_max_score}
                                {' '}({Math.round(test.latest_attempt_score / test.latest_attempt_max_score * 100)}%)
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <button
                      className={`btn ${statusInfo.btnClass}`}
                      style={{ flexShrink: 0 }}
                      onClick={() => handleAction(test)}
                      disabled={cantStart || isStarting}
                    >
                      {isStarting ? (
                        <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Starting…</>
                      ) : cantStart ? 'No Attempts Left' : statusInfo.action}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
