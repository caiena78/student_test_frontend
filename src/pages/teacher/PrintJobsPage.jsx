import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

// ── modes config ──────────────────────────────────────────────────────────────
const MODES = [
  { mode: 'test',         printLabel: 'Print Test',           wordLabel: 'Test (Word)' },
  { mode: 'key',          printLabel: 'Print Test + Answers', wordLabel: 'Test + Answers (Word)' },
  { mode: 'answers_only', printLabel: 'Print Answers Only',   wordLabel: 'Answers Only (Word)' },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', bg: '#d1fae5', color: '#065f46' },
    pending:   { label: 'Pending',   bg: '#fef9c3', color: '#854d0e' },
    failed:    { label: 'Failed',    bg: '#fee2e2', color: '#991b1b' },
  }
  const s = map[status] || { label: status, bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

async function openPrint(jobId, versionId, mode, onError) {
  try {
    const res = await client.get(
      `/print-jobs/${jobId}/versions/${versionId}/print`,
      { params: { mode, format: 'print' }, responseType: 'text' }
    )
    const blob = new Blob([res.data], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const tab  = window.open(url, '_blank')
    if (tab) {
      tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    }
  } catch {
    onError('Failed to open print preview')
  }
}

async function downloadDocx(jobId, versionId, mode, versionName, onError) {
  try {
    const res = await client.get(
      `/print-jobs/${jobId}/versions/${versionId}/print`,
      { params: { mode, format: 'docx' }, responseType: 'arraybuffer' }
    )
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `${versionName}.docx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch {
    onError('Failed to download Word document')
  }
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({ job, onError, onDelete }) {
  const [expanded,        setExpanded]        = useState(false)
  const [versions,        setVersions]        = useState(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [busy,            setBusy]            = useState(null)    // "versionId-mode-format"
  const [deleting,        setDeleting]        = useState(false)   // job-level delete
  const [deletingVersion, setDeletingVersion] = useState(null)    // versionId being deleted

  const toggleExpand = async () => {
    if (!expanded && !versions) {
      setLoadingVersions(true)
      try {
        const res = await client.get(`/print-jobs/${job.id}`)
        setVersions(res.data.versions || [])
      } catch {
        onError('Failed to load versions')
      } finally {
        setLoadingVersions(false)
      }
    }
    setExpanded(o => !o)
  }

  const handleAction = async (versionId, versionName, mode, format) => {
    const key = `${versionId}-${mode}-${format}`
    setBusy(key)
    if (format === 'print') {
      await openPrint(job.id, versionId, mode, onError)
    } else {
      await downloadDocx(job.id, versionId, mode, versionName, onError)
    }
    setBusy(null)
  }

  const handleDeleteJob = (e) => {
    e.stopPropagation()
    if (!window.confirm(
      `Delete print job for "${job.test_title}"?\n\nThis will permanently delete this print job and all of its versions. This cannot be undone.`
    )) return
    setDeleting(true)
    client.delete(`/print-jobs/${job.id}`)
      .then(() => onDelete(job.id))
      .catch(err => {
        onError(err.response?.data?.error || 'Failed to delete print job')
        setDeleting(false)
      })
  }

  const handleDeleteVersion = async (e, versionId, versionName) => {
    e.stopPropagation()
    if (!window.confirm(
      `Delete version "${versionName}"?\n\nThis will permanently remove this version. This cannot be undone.`
    )) return
    setDeletingVersion(versionId)
    try {
      await client.delete(`/print-jobs/${job.id}/versions/${versionId}`)
      setVersions(prev => prev.filter(v => v.id !== versionId))
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to delete version')
    } finally {
      setDeletingVersion(null)
    }
  }

  const createdDate = new Date(job.created_at).toLocaleString()

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
      {/* Job header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={toggleExpand}
      >
        <span style={{
          color: 'var(--text-muted)', fontSize: 12, flexShrink: 0,
          transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none',
        }}>▶</span>

        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{job.test_title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {createdDate} &middot; {job.number_of_versions} version{job.number_of_versions !== 1 ? 's' : ''}
          </div>
        </div>

        <StatusBadge status={job.status} />

        {job.status === 'failed' && job.error_message && (
          <span style={{ fontSize: 12, color: '#991b1b', maxWidth: 260 }}>{job.error_message}</span>
        )}

        <button
          className="btn btn-danger btn-sm"
          style={{ flexShrink: 0, fontSize: 12 }}
          onClick={handleDeleteJob}
          disabled={deleting}
          title="Delete this print job and all its versions"
        >
          {deleting ? 'Deleting…' : 'Delete Job'}
        </button>
      </div>

      {/* Versions panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: '#f8fafc', padding: '12px 20px' }}>
          {loadingVersions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Loading versions…
            </div>
          ) : !versions || versions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No versions available.</p>
          ) : (
            <div>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(150px, 1fr) repeat(3, minmax(150px, auto)) auto',
                gap: '4px 16px',
                alignItems: 'center',
                paddingBottom: 6,
                marginBottom: 4,
              }}>
                {['Version', 'Test', 'Test + Answers', 'Answers Only', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Version rows */}
              {versions.map(v => (
                <div key={v.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(150px, 1fr) repeat(3, minmax(150px, auto)) auto',
                  gap: '4px 16px',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #e2e8f0',
                }}>
                  {/* Version name */}
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v.version_name}</div>

                  {/* Print + Word buttons per mode */}
                  {MODES.map(({ mode, printLabel, wordLabel }) => {
                    const printKey = `${v.id}-${mode}-print`
                    const docxKey  = `${v.id}-${mode}-docx`
                    return (
                      <div key={mode} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, whiteSpace: 'nowrap', textAlign: 'left' }}
                          onClick={() => handleAction(v.id, v.version_name, mode, 'print')}
                          disabled={busy === printKey || deletingVersion === v.id}
                          title={`${printLabel} for ${v.version_name}`}
                        >
                          {busy === printKey ? '…' : printLabel}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, whiteSpace: 'nowrap', textAlign: 'left', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                          onClick={() => handleAction(v.id, v.version_name, mode, 'docx')}
                          disabled={busy === docxKey || deletingVersion === v.id}
                          title={`Download ${wordLabel} for ${v.version_name}`}
                        >
                          {busy === docxKey ? '…' : `↓ ${wordLabel}`}
                        </button>
                      </div>
                    )
                  })}

                  {/* Per-version delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                      onClick={e => handleDeleteVersion(e, v.id, v.version_name)}
                      disabled={deletingVersion === v.id || !!busy}
                      title={`Delete version ${v.version_name}`}
                    >
                      {deletingVersion === v.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrintJobsPage() {
  const navigate = useNavigate()
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/print-jobs')
      setJobs(res.data)
    } catch {
      setError('Failed to load print jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleDeleteJob = (jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="page-header">
          <div>
            <h1>Printing</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 14 }}>
              Printable test versions generated from the Tests page
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchJobs}>↻ Refresh</button>
            <button className="btn btn-ghost" onClick={() => navigate('/teacher/tests')}>← Tests</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <p>No print jobs yet.</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
              Go to Tests and click <strong>"Print"</strong> on any test.
            </p>
          </div>
        ) : (
          <div>
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onError={setError}
                onDelete={handleDeleteJob}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
