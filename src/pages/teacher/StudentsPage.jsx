import React, { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'

// ── Student row with "…" popover ─────────────────────────────────────────────

function StudentRow({ student, groups, onUpdated, isOwned }) {
  const [open, setOpen] = useState(false)
  const [studentGroups, setStudentGroups] = useState(null) // null = not loaded yet
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [addGroupId, setAddGroupId] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [removingGroupId, setRemovingGroupId] = useState(null)
  const [rowError, setRowError] = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: student.first_name || '', last_name: student.last_name || '', username: student.username || '', email: student.email || '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Password modal
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ new_password: '', force_change: true })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const popoverRef = useRef(null)

  // Close popover on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadGroups = async () => {
    if (studentGroups !== null) return
    setLoadingGroups(true)
    try {
      const res = await client.get(`/teacher/students/${student.id}/groups`)
      setStudentGroups(res.data)
    } catch {
      setStudentGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) loadGroups()
  }

  const handleAddGroup = async () => {
    if (!addGroupId) return
    setAddingGroup(true)
    setRowError('')
    const prev = studentGroups
    setStudentGroups(sg => [...(sg || []), groups.find(g => g.id === Number(addGroupId))])
    try {
      await client.post(`/teacher/groups/${addGroupId}/students`, { student_id: student.id })
      setAddGroupId('')
      const res = await client.get(`/teacher/students/${student.id}/groups`)
      setStudentGroups(res.data)
    } catch (err) {
      setStudentGroups(prev)
      setRowError(err.response?.data?.error || 'Failed to add to group')
    } finally {
      setAddingGroup(false)
    }
  }

  const handleRemoveGroup = async (groupId) => {
    setRemovingGroupId(groupId)
    setRowError('')
    const prev = studentGroups
    setStudentGroups(sg => (sg || []).filter(g => g.id !== groupId))
    try {
      await client.delete(`/teacher/groups/${groupId}/students/${student.id}`)
    } catch (err) {
      setStudentGroups(prev)
      setRowError(err.response?.data?.error || 'Failed to remove from group')
    } finally {
      setRemovingGroupId(null)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      await client.put(`/teacher/students/${student.id}`, editForm)
      setEditOpen(false)
      onUpdated()
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update student')
    } finally {
      setEditSaving(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    if (pwForm.new_password.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true)
    setPwError('')
    try {
      await client.put(`/teacher/students/${student.id}/password`, {
        new_password: pwForm.new_password,
        force_password_change: pwForm.force_change,
      })
      setPwOpen(false)
      setPwForm({ new_password: '', force_change: true })
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setPwSaving(false)
    }
  }

  const availableGroups = groups.filter(g => !(studentGroups || []).some(sg => sg.id === g.id))

  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap', position: 'relative' }}>

        {/* Name + username */}
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{student.username}</div>
        </div>

        {/* Email */}
        <div style={{ flex: '1 1 140px', fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.email || <span style={{ fontStyle: 'italic' }}>no email</span>}
        </div>

        {/* Force-change badge */}
        {student.force_password_change ? (
          <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>
            Must change pw
          </span>
        ) : null}

        {/* "…" button */}
        <div ref={popoverRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={handleOpen}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Student actions"
          >
            ⋯
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 42, zIndex: 300,
              background: 'white', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.13)', minWidth: 280, maxWidth: 340, padding: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                {name}
              </div>

              {rowError && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8, background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>{rowError}</div>}

              {/* Groups section */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Groups</div>
              {loadingGroups ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading…
                </div>
              ) : (studentGroups || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Not in any groups yet.</p>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  {(studentGroups || []).map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: 14 }}>👥 {g.name}</span>
                      <button
                        onClick={() => handleRemoveGroup(g.id)}
                        disabled={removingGroupId === g.id}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                        title="Remove from group"
                      >
                        {removingGroupId === g.id ? '…' : '×'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add to group */}
              {availableGroups.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <select
                    value={addGroupId}
                    onChange={e => setAddGroupId(e.target.value)}
                    style={{ flex: 1, fontSize: 13, padding: '6px 8px' }}
                  >
                    <option value="">Add to group…</option>
                    {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddGroup}
                    disabled={!addGroupId || addingGroup}
                    style={{ flexShrink: 0 }}
                  >
                    {addingGroup ? '…' : 'Add'}
                  </button>
                </div>
              )}

              {/* Owned-student actions */}
              {isOwned && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '6px 0 12px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => { setOpen(false); setEditForm({ first_name: student.first_name || '', last_name: student.last_name || '', username: student.username || '', email: student.email || '' }); setEditError(''); setEditOpen(true) }}
                    >
                      ✏️ Edit Student Account
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => { setOpen(false); setPwForm({ new_password: '', force_change: true }); setPwError(''); setPwOpen(true) }}
                    >
                      🔑 Reset Password
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit — ${name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="edit-student-form" type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editError && <div className="alert alert-error">{editError}</div>}
        <form id="edit-student-form" onSubmit={handleEdit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name</label>
              <input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Username</label>
            <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        title={`Reset Password — ${name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPwOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="reset-pw-form" type="submit" disabled={pwSaving}>
              {pwSaving ? 'Saving…' : 'Reset Password'}
            </button>
          </>
        }
      >
        {pwError && <div className="alert alert-error">{pwError}</div>}
        <form id="reset-pw-form" onSubmit={handlePasswordReset}>
          <div className="field">
            <label>New Password</label>
            <input
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              required
              autoFocus
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
            <input
              type="checkbox"
              checked={pwForm.force_change}
              onChange={e => setPwForm(f => ({ ...f, force_change: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14 }}>
              Force student to change password on next login
            </span>
          </label>
        </form>
      </Modal>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_STUDENT = { first_name: '', last_name: '', username: '', email: '', password: '', force_change: false }

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_STUDENT)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get('/teacher/students')
      setStudents(res.data)
    } catch { setError('Failed to load students') }
    finally { setLoading(false) }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await client.get('/teacher/groups')
      setGroups(res.data)
    } catch {}
  }, [])

  useEffect(() => { fetchStudents(); fetchGroups() }, [fetchStudents, fetchGroups])

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return (
      s.username?.toLowerCase().includes(q) ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q)
    )
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await client.post('/teacher/students', {
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
        password: form.password,
      })
      setAddOpen(false)
      setForm(EMPTY_STUDENT)
      fetchStudents()
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.message || 'Failed to create student')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <h1>Students</h1>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_STUDENT); setFormError(''); setAddOpen(true) }}>
            + Add Student
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <input
          type="search"
          placeholder="Search students by name or username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            {search ? <p>No students match your search.</p> : (
              <>
                <p>No students yet.</p>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setForm(EMPTY_STUDENT); setFormError(''); setAddOpen(true) }}>
                  + Add Student
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'visible' }}>
            {/* Header row */}
            <div style={{ display: 'flex', padding: '8px 16px', background: '#f1f5f9', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', gap: 12 }}>
              <span style={{ flex: '1 1 160px' }}>Name</span>
              <span style={{ flex: '1 1 140px' }}>Email</span>
              <span style={{ width: 36 }}></span>
            </div>
            {filtered.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                groups={groups}
                onUpdated={fetchStudents}
                isOwned={user?.role === 'admin' || student.created_by === user?.id}
              />
            ))}
          </div>
        )}

        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          Click <strong>⋯</strong> on any student to manage their groups, edit their account, or reset their password.
        </p>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Student"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="add-student-form" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Student'}
            </button>
          </>
        }
      >
        {formError && <div className="alert alert-error">{formError}</div>}
        <form id="add-student-form" onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required autoFocus />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoComplete="new-password" />
          </div>
        </form>
      </Modal>
    </>
  )
}
