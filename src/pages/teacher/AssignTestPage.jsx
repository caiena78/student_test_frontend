import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

export default function AssignTestPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [test, setTest] = useState(null)
  const [groups, setGroups] = useState([])
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedGroups, setSelectedGroups] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [testRes, groupsRes, studentsRes, assignRes] = await Promise.all([
        client.get(`/tests/${id}`),
        client.get('/teacher/groups'),
        client.get('/teacher/students'),
        client.get(`/tests/${id}/assignments`).catch(() => ({ data: [] }))
      ])
      setTest(testRes.data)
      setGroups(groupsRes.data)
      setStudents(studentsRes.data)
      setAssignments(assignRes.data)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleGroup = (gid) => {
    setSelectedGroups(prev =>
      prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]
    )
  }

  const toggleStudent = (sid) => {
    setSelectedStudents(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (selectedGroups.length === 0 && selectedStudents.length === 0) {
      setError('Please select at least one group or student')
      return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      // Backend accepts one group_id at a time — loop for multiple groups
      for (const gid of selectedGroups) {
        await client.post(`/tests/${id}/assign`, { group_id: gid, due_date: dueDate || null })
      }
      if (selectedStudents.length > 0) {
        await client.post(`/tests/${id}/assign`, { student_ids: selectedStudents, due_date: dueDate || null })
      }
      setSuccess('Test assigned successfully!')
      setSelectedGroups([])
      setSelectedStudents([])
      setDueDate('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign test')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (assignment) => {
    if (!window.confirm('Remove this assignment?')) return
    try {
      await client.delete(`/tests/assignments/${assignment.id}`)
      fetchData()
    } catch {
      setError('Failed to remove assignment')
    }
  }

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase()
    return (
      s.username?.toLowerCase().includes(q) ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q)
    )
  })

  if (loading) return (
    <>
      <Navbar />
      <div className="loading-center"><div className="spinner spinner-lg"></div></div>
    </>
  )

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <div>
            <h1>Assign Test</h1>
            {test && <p className="text-muted">{test.title}</p>}
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/teacher/tests')}>
            Back to Tests
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleAssign}>
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Assign to Groups</h2>
            {groups.length === 0 ? (
              <p className="text-muted">No groups found. Create groups first.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {groups.map(g => (
                  <label
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      border: `1px solid ${selectedGroups.includes(g.id) ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      background: selectedGroups.includes(g.id) ? '#eff6ff' : 'white',
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.student_count ?? 0} students</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Assign to Individual Students</h2>
            <div className="field">
              <input
                type="search"
                placeholder="Search students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
            </div>
            {filteredStudents.length === 0 ? (
              <p className="text-muted">No students found.</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {filteredStudents.map(s => (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedStudents.includes(s.id) ? '#eff6ff' : 'white',
                      transition: 'background 0.1s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 13 }}>@{s.username}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="field">
              <label>Due Date (optional)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Assigning...' : 'Assign Test'}
            </button>
          </div>
        </form>

        {/* Existing assignments */}
        {assignments.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Existing Assignments</h2>
            <div>
              {assignments.map(a => (
                <div
                  key={a.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {a.group_name ? `Group: ${a.group_name}` : a.student_name ? `Student: ${a.student_name}` : `Assignment #${a.id}`}
                    </div>
                    {a.due_date && (
                      <div className="text-muted text-sm">Due: {new Date(a.due_date).toLocaleString()}</div>
                    )}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveAssignment(a)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
