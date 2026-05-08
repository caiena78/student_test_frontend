import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

// ── Print generation modal ────────────────────────────────────────────────────

function PrintModal({ test, onClose }) {
  const [n, setN] = useState('1')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const num = parseInt(n, 10)
    if (!Number.isInteger(num) || num < 1 || num > 50) {
      setError('Enter a number between 1 and 50')
      return
    }
    setError('')
    setLoading(true)
    try {
      await client.post(`/tests/${test.id}/print-jobs`, { numberOfVersions: num })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 12, padding: '28px 28px 24px',
        width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {success ? (
          <div>
            <div style={{ fontSize: 22, marginBottom: 8 }}>&#10003; Versions generated</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Your printable versions for <strong>{test.title}</strong> are ready.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                to="/teacher/print-jobs"
                className="btn btn-primary"
                style={{ flex: 1, textAlign: 'center' }}
                onClick={onClose}
              >
                Go to Printing →
              </Link>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Generate for Printing</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              {test.title}
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Number of versions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(1 – 50)</span>
            </label>
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="50"
              value={n}
              onChange={e => setN(e.target.value)}
              style={{ width: '100%', marginBottom: 14 }}
              disabled={loading}
            />

            {error && <div className="alert alert-error" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TestsListPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printTarget, setPrintTarget] = useState(null) // test object | null

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
                    <button className="btn btn-ghost btn-sm" onClick={() => setPrintTarget(test)}>Print</button>
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

      {printTarget && (
        <PrintModal test={printTarget} onClose={() => setPrintTarget(null)} />
      )}
    </>
  )
}
