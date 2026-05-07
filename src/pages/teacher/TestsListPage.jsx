import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

export default function TestsListPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get('/tests')
      setTests(res.data)
    } catch {
      setError('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTests() }, [fetchTests])

  const handlePublish = async (test) => {
    try {
      await client.put(`/tests/${test.id}/publish`)
      fetchTests()
    } catch {
      setError('Failed to publish test')
    }
  }

  const handleUnpublish = async (test) => {
    try {
      await client.put(`/tests/${test.id}/unpublish`)
      fetchTests()
    } catch {
      setError('Failed to unpublish test')
    }
  }

  const handleDelete = async (test) => {
    if (!window.confirm(`Delete test "${test.title}"? This cannot be undone.`)) return
    try {
      await client.delete(`/tests/${test.id}`)
      fetchTests()
    } catch {
      setError('Failed to delete test')
    }
  }

  const statusBadge = (status) => {
    const cls = status === 'published' ? 'badge-published' : 'badge-draft'
    return <span className={`badge ${cls}`}>{status}</span>
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <h1>Tests</h1>
          <Link to="/teacher/tests/new" className="btn btn-primary">+ New Test</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg"></div></div>
        ) : tests.length === 0 ? (
          <div className="empty-state">
            <p>No tests yet. Create your first test to get started.</p>
            <Link to="/teacher/tests/new" className="btn btn-primary">+ New Test</Link>
          </div>
        ) : (
          <div>
            {tests.map(test => (
              <div key={test.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{test.title}</h2>
                      {statusBadge(test.status || 'draft')}
                    </div>
                    <div className="flex-row mt-2" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      <span>{test.question_count ?? 0} questions</span>
                      {test.time_limit && <span>· {test.time_limit} min</span>}
                      {test.created_at && <span>· Created {new Date(test.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex-row" style={{ flexShrink: 0, gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Link to={`/teacher/tests/${test.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                    <Link to={`/teacher/tests/${test.id}/assign`} className="btn btn-ghost btn-sm">Assign</Link>
                    <Link to={`/teacher/tests/${test.id}/results`} className="btn btn-ghost btn-sm">Results</Link>
                    {test.status === 'published' ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleUnpublish(test)}>Unpublish</button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handlePublish(test)}>Publish</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(test)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
