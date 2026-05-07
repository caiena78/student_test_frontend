import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(score, max) {
  if (score == null || !max) return null
  return Math.round((score / max) * 100)
}

function GradeBar({ score, max }) {
  const p = pct(score, max)
  if (p == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626'
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{score}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/ {max}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color, marginLeft: 4 }}>{p}%</span>
      </div>
      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    submitted:   { label: 'Submitted',   bg: '#dbeafe', color: '#1e40af' },
    graded:      { label: 'Graded',      bg: '#d1fae5', color: '#065f46' },
    in_progress: { label: 'In Progress', bg: '#fef9c3', color: '#854d0e' },
    not_started: { label: 'Not Started', bg: '#f1f5f9', color: '#64748b' },
  }
  const s = map[status] || { label: status, bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function CountPill({ value, color, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 }}>
      <span style={{ fontWeight: 800, fontSize: 18, color }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{label}</span>
    </div>
  )
}

function StudentOverview({ testId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [reassigning, setReassigning] = useState(null) // student_id being reassigned

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/tests/${testId}/overview`)
      setRows(res.data)
    } catch {
      setError('Failed to load overview')
    } finally {
      setLoading(false)
    }
  }, [testId])

  const handleReassign = async (studentId) => {
    setReassigning(studentId)
    try {
      await client.post(`/tests/reassign/${testId}/student/${studentId}`)
      // Refresh so the status updates
      await fetch()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add attempt')
    } finally {
      setReassigning(null)
    }
  }

  useEffect(() => { fetch() }, [fetch])

  const statusOrder = { not_started: 0, in_progress: 1, submitted: 2, graded: 3 }

  const filtered = rows
    .filter(r => {
      const name = `${r.first_name || ''} ${r.last_name || ''} ${r.username}`.toLowerCase()
      return name.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      if (sort === 'name') return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
      if (sort === 'status') return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
      if (sort === 'correct') return (b.correct_count ?? 0) - (a.correct_count ?? 0)
      if (sort === 'score') return (pct(b.score, b.max_score) ?? -1) - (pct(a.score, a.max_score) ?? -1)
      return 0
    })

  // Summary counts
  const notStarted  = rows.filter(r => r.status === 'not_started').length
  const inProgress  = rows.filter(r => r.status === 'in_progress').length
  const completed   = rows.filter(r => r.status === 'submitted' || r.status === 'graded').length

  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>
  if (error)   return <div className="alert alert-error">{error}</div>
  if (!rows.length) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
      No students assigned to this test yet.
    </div>
  )

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Assigned', value: rows.length, color: 'var(--primary)' },
          { label: 'Not Started',    value: notStarted,  color: '#64748b' },
          { label: 'In Progress',    value: inProgress,  color: '#b45309' },
          { label: 'Completed',      value: completed,   color: '#16a34a' },
        ].map(c => (
          <div key={c.label} className="card" style={{ flex: '1 1 110px', padding: '12px 14px', textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search students…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', maxWidth: 300 }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Sort:</span>
          {[['name','Name'],['status','Status'],['correct','Correct'],['score','Score']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setSort(val)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: sort === val ? 'var(--primary)' : 'white',
                color: sort === val ? 'white' : 'var(--text)',
                fontSize: 12, cursor: 'pointer', fontWeight: sort === val ? 600 : 400,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetch}>↻</button>
      </div>

      {/* Student rows */}
      <div>
        {filtered.map(r => {
          const name = (r.first_name || r.last_name)
            ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
            : r.username
          const done = r.status === 'submitted' || r.status === 'graded'
          const p = pct(r.score, r.max_score)
          const gradeColor = p == null ? 'var(--text-muted)' : p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626'

          return (
            <div key={r.student_id} className="card" style={{ marginBottom: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

                {/* Name + meta */}
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {done && r.submitted_at
                      ? `Submitted ${new Date(r.submitted_at).toLocaleString()}`
                      : r.status === 'in_progress' && r.started_at
                      ? `Started ${new Date(r.started_at).toLocaleString()}`
                      : 'Has not started'}
                  </div>
                </div>

                {/* Status */}
                <div style={{ flexShrink: 0 }}>
                  <StatusBadge status={r.status} />
                </div>

                {/* Answer counts */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: '0 0 auto' }}>
                  <CountPill value={r.correct_count}     color="#16a34a" label="Correct" />
                  <CountPill value={r.incorrect_count}   color="#dc2626" label="Incorrect" />
                  <CountPill value={r.not_answered_count} color="#94a3b8" label="Skipped" />
                </div>

                {/* Score */}
                <div style={{ flex: '0 0 auto', minWidth: 90 }}>
                  {done && r.score != null ? (
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: gradeColor }}>
                        {r.score} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)' }}>/ {r.max_score}</span>
                      </div>
                      {p != null && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: gradeColor }}>{p}%</div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                  {done && r.attempt_id && (
                    <Link to={`/teacher/attempts/${r.attempt_id}`} className="btn btn-ghost btn-sm">
                      Review
                    </Link>
                  )}
                  {/* Reassign: allow another attempt */}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    onClick={() => handleReassign(r.student_id)}
                    disabled={reassigning === r.student_id}
                    title="Grant one additional attempt"
                  >
                    {reassigning === r.student_id ? '…' : '+ Attempt'}
                  </button>
                </div>
              </div>

              {/* Mini bar chart of correct / incorrect / skipped */}
              {done && r.total_questions > 0 && (
                <div style={{ marginTop: 10, display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                  <div style={{ flex: r.correct_count, background: '#16a34a', transition: 'flex 0.4s' }} title={`${r.correct_count} correct`} />
                  <div style={{ flex: r.incorrect_count, background: '#dc2626', transition: 'flex 0.4s' }} title={`${r.incorrect_count} incorrect`} />
                  <div style={{ flex: r.not_answered_count, background: '#e2e8f0', transition: 'flex 0.4s' }} title={`${r.not_answered_count} skipped`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Attempts tab (existing results view) ─────────────────────────────────────

function AttemptsTab({ testId, test }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [expandData, setExpandData] = useState({})
  const [expandLoading, setExpandLoading] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/tests/${testId}/results`)
      setAttempts(res.data)
    } catch {
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => { fetch() }, [fetch])

  const toggleExpand = async (attempt) => {
    if (expandedId === attempt.id) { setExpandedId(null); return }
    setExpandedId(attempt.id)
    if (expandData[attempt.id]) return
    setExpandLoading(attempt.id)
    try {
      const res = await client.get(`/tests/attempts/${attempt.id}`)
      setExpandData(prev => ({ ...prev, [attempt.id]: res.data }))
    } catch { /* silent */ } finally {
      setExpandLoading(null)
    }
  }

  const filtered = attempts.filter(a => statusFilter === 'all' || a.status === statusFilter)
  const submitted = attempts.filter(a => a.status === 'submitted' || a.status === 'graded')
  const needsReview = attempts.filter(a => a.status === 'submitted' && Number(a.ungraded_count) > 0)
  const scores = submitted.map(a => pct(a.score, a.max_score)).filter(p => p != null)
  const avgPct = scores.length ? Math.round(scores.reduce((s, p) => s + p, 0) / scores.length) : null
  const studentName = a => (a.first_name || a.last_name) ? `${a.first_name || ''} ${a.last_name || ''}`.trim() : a.username || `#${a.student_id}`

  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',          value: attempts.length,     color: 'var(--primary)' },
          { label: 'Submitted',      value: submitted.length,    color: '#16a34a' },
          { label: 'Needs Review',   value: needsReview.length,  color: needsReview.length > 0 ? '#d97706' : 'var(--text-muted)' },
          { label: 'Class Avg',      value: avgPct != null ? `${avgPct}%` : '—', color: avgPct != null ? (avgPct >= 80 ? '#16a34a' : avgPct >= 60 ? '#d97706' : '#dc2626') : 'var(--text-muted)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '12px 14px', textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {[['all','All'],['submitted','Submitted'],['graded','Graded'],['in_progress','In Progress']].map(([val, lbl]) => (
          <button key={val} className={`tab${statusFilter === val ? ' active' : ''}`} onClick={() => setStatusFilter(val)}>
            {lbl}
            {val !== 'all' && (
              <span style={{ marginLeft: 5, background: '#e2e8f0', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {attempts.filter(a => a.status === val).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
          No attempts{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} yet.
        </div>
      ) : (
        filtered.map(attempt => {
          const name = studentName(attempt)
          const needsRev = attempt.status === 'submitted' && Number(attempt.ungraded_count) > 0
          const isOpen = expandedId === attempt.id
          const detail = expandData[attempt.id]

          return (
            <div key={attempt.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
                onClick={() => toggleExpand(attempt)}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {attempt.submitted_at ? `Submitted ${new Date(attempt.submitted_at).toLocaleString()}` : attempt.started_at ? `Started ${new Date(attempt.started_at).toLocaleString()}` : ''}
                  </div>
                </div>
                <div style={{ flex: '0 0 auto' }}><GradeBar score={attempt.score} max={attempt.max_score} /></div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                  <StatusBadge status={attempt.status} />
                  {needsRev && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>✎ Needs Review</span>}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                    <Link to={`/teacher/attempts/${attempt.id}`} className={`btn btn-sm ${needsRev ? 'btn-primary' : 'btn-ghost'}`}>
                      {needsRev ? 'Grade' : 'Review'}
                    </Link>
                  )}
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', background: '#f8fafc', padding: '16px 20px' }}>
                  {expandLoading === attempt.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Loading answers…</div>
                  ) : !detail ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load. <Link to={`/teacher/attempts/${attempt.id}`} style={{ color: 'var(--primary)' }}>Open full review →</Link></p>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>
                          Score: <span style={{ color: 'var(--primary)', fontSize: 18 }}>{attempt.score ?? 0}</span>
                          <span style={{ color: 'var(--text-muted)' }}> / {attempt.max_score ?? '?'}</span>
                          {pct(attempt.score, attempt.max_score) != null && (
                            <span style={{ marginLeft: 8, fontWeight: 800, color: pct(attempt.score, attempt.max_score) >= 80 ? '#16a34a' : pct(attempt.score, attempt.max_score) >= 60 ? '#d97706' : '#dc2626' }}>
                              ({pct(attempt.score, attempt.max_score)}%)
                            </span>
                          )}
                        </div>
                        <Link to={`/teacher/attempts/${attempt.id}`} className="btn btn-primary btn-sm">Open Full Review →</Link>
                      </div>
                      {(detail.questions || []).map((q, idx) => {
                        const ans = q.answer
                        const ansData = ans?.answer_data ? (typeof ans.answer_data === 'string' ? JSON.parse(ans.answer_data) : ans.answer_data) : null
                        const qScore = ans?.manual_score != null ? Number(ans.manual_score) : (ans?.auto_score != null ? Number(ans.auto_score) : null)
                        return (
                          <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 13, minWidth: 28, paddingTop: 1 }}>Q{idx + 1}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>{q.prompt}</p>
                              {q.type === 'multiple_choice' && (
                                <div style={{ fontSize: 13 }}>{(ansData?.selected_ids || []).map(sid => { const opt = (q.options || []).find(o => o.id === Number(sid)); return opt ? <span key={sid} style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '1px 7px', marginRight: 4, fontSize: 12 }}>{opt.text}</span> : null })}
                                {!ansData?.selected_ids?.length && <em style={{ color: 'var(--text-muted)' }}>No answer</em>}</div>
                              )}
                              {q.type === 'true_false' && (() => {
                                const cfg = q.config ? (typeof q.config === 'string' ? JSON.parse(q.config) : q.config) : {}
                                const correct = Boolean(cfg.correct_answer)
                                const student = ansData?.answer !== undefined ? String(ansData.answer) === 'true' : null
                                const isRight = student !== null && student === correct
                                return (
                                  <div style={{ fontSize: 13 }}>
                                    <span style={{ fontWeight: 600, color: student === null ? 'var(--text-muted)' : isRight ? 'var(--success)' : 'var(--danger)' }}>
                                      {student === null ? 'No answer' : (student ? 'True' : 'False')}
                                    </span>
                                    {student !== null && !isRight && (
                                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                                        (correct: {correct ? 'True' : 'False'})
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}
                              {q.type === 'free_text' && <div style={{ fontSize: 13, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px' }}>{ansData?.text || <em style={{ color: 'var(--text-muted)' }}>No answer</em>}</div>}
                              {q.type === 'drag_drop' && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(ansData?.order || []).map((id, i) => { const item = (q.drag_drop_items || []).find(x => x.id === Number(id)); return item ? <span key={id} style={{ marginRight: 6 }}>{i + 1}. {item.item_text}</span> : null })}{!ansData?.order?.length && <em>No answer</em>}</div>}
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
                              {qScore != null ? <span style={{ fontWeight: 700, fontSize: 13, color: qScore >= q.points ? '#16a34a' : qScore > 0 ? '#d97706' : '#dc2626' }}>{qScore} / {q.points}</span> : <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>Ungraded</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TestResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    client.get(`/tests/${id}`)
      .then(r => setTest(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (<><Navbar /><div className="loading-center"><div className="spinner spinner-lg" /></div></>)

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="page-header">
          <div>
            <h1>Results</h1>
            {test && <p style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 15 }}>{test.title}</p>}
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/teacher/tests')}>← Back</button>
        </div>

        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>
            Student Overview
          </button>
          <button className={`tab${activeTab === 'attempts' ? ' active' : ''}`} onClick={() => setActiveTab('attempts')}>
            Attempt History
          </button>
        </div>

        {activeTab === 'overview' && <StudentOverview testId={id} />}
        {activeTab === 'attempts' && <AttemptsTab testId={id} test={test} />}
      </div>
    </>
  )
}
