import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import client from '../../api/client'

export default function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [groupStudents, setGroupStudents] = useState({})

  // Add Group Modal
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupError, setGroupError] = useState('')

  // Rename Modal
  const [renameGroup, setRenameGroup] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  // Add Student Modal
  const [addStudentGroupId, setAddStudentGroupId] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [addStudentSaving, setAddStudentSaving] = useState(false)
  const [addStudentError, setAddStudentError] = useState('')

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get('/teacher/groups')
      setGroups(res.data)
    } catch {
      setError('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const res = await client.get('/teacher/students')
      setStudents(res.data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchGroups()
    fetchStudents()
  }, [fetchGroups, fetchStudents])

  const fetchGroupStudents = async (groupId) => {
    try {
      const res = await client.get(`/teacher/groups/${groupId}/students`)
      setGroupStudents(prev => ({ ...prev, [groupId]: res.data }))
    } catch {
      setGroupStudents(prev => ({ ...prev, [groupId]: [] }))
    }
  }

  const toggleExpand = (groupId) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
    } else {
      setExpandedGroup(groupId)
      fetchGroupStudents(groupId)
    }
  }

  const handleAddGroup = async (e) => {
    e.preventDefault()
    setGroupError('')
    setGroupSaving(true)
    try {
      await client.post('/teacher/groups', { name: groupName })
      setGroupName('')
      setAddGroupOpen(false)
      fetchGroups()
    } catch (err) {
      setGroupError(err.response?.data?.message || 'Failed to create group')
    } finally {
      setGroupSaving(false)
    }
  }

  const handleRename = async (e) => {
    e.preventDefault()
    setRenameSaving(true)
    try {
      await client.put(`/teacher/groups/${renameGroup.id}`, { name: renameName })
      setRenameGroup(null)
      fetchGroups()
    } catch {
      // ignore
    } finally {
      setRenameSaving(false)
    }
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete group "${group.name}"?`)) return
    try {
      await client.delete(`/teacher/groups/${group.id}`)
      fetchGroups()
      if (expandedGroup === group.id) setExpandedGroup(null)
    } catch {
      setError('Failed to delete group')
    }
  }

  const handleAddStudentToGroup = async (e) => {
    e.preventDefault()
    if (!selectedStudentId) return
    setAddStudentSaving(true)
    setAddStudentError('')
    try {
      await client.post(`/teacher/groups/${addStudentGroupId}/students`, { student_id: parseInt(selectedStudentId) })
      fetchGroupStudents(addStudentGroupId)
      setAddStudentGroupId(null)
      setSelectedStudentId('')
    } catch (err) {
      setAddStudentError(err.response?.data?.message || 'Failed to add student')
    } finally {
      setAddStudentSaving(false)
    }
  }

  const handleRemoveStudent = async (groupId, studentId) => {
    if (!window.confirm('Remove student from group?')) return
    try {
      await client.delete(`/teacher/groups/${groupId}/students/${studentId}`)
      fetchGroupStudents(groupId)
    } catch {
      setError('Failed to remove student')
    }
  }

  const studentsInGroup = (groupId) => groupStudents[groupId] || []
  const studentsNotInGroup = (groupId) => {
    const inGroup = studentsInGroup(groupId).map(s => s.id)
    return students.filter(s => !inGroup.includes(s.id))
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <h1>Groups</h1>
          <button className="btn btn-primary" onClick={() => { setGroupName(''); setGroupError(''); setAddGroupOpen(true) }}>
            + New Group
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg"></div></div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet. Create your first group to get started.</p>
            <button className="btn btn-primary" onClick={() => { setGroupName(''); setGroupError(''); setAddGroupOpen(true) }}>
              + New Group
            </button>
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => toggleExpand(group.id)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{expandedGroup === group.id ? '▼' : '▶'}</span>
                      {group.name}
                    </div>
                    <div className="text-muted text-sm mt-1">
                      {group.student_count ?? 0} students
                      {group.created_at && ` · Created ${new Date(group.created_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setRenameGroup(group); setRenameName(group.name) }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedGroup === group.id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Students</span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setAddStudentGroupId(group.id); setSelectedStudentId(''); setAddStudentError('') }}
                      >
                        + Add Student
                      </button>
                    </div>

                    {studentsInGroup(group.id).length === 0 ? (
                      <p className="text-muted text-sm">No students in this group yet.</p>
                    ) : (
                      <div>
                        {studentsInGroup(group.id).map(student => (
                          <div
                            key={student.id}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}
                          >
                            <div>
                              <span style={{ fontWeight: 500 }}>{student.first_name} {student.last_name}</span>
                              <span className="text-muted text-sm" style={{ marginLeft: 8 }}>@{student.username}</span>
                            </div>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveStudent(group.id, student.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      <Modal
        isOpen={addGroupOpen}
        onClose={() => setAddGroupOpen(false)}
        title="New Group"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddGroupOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="add-group-form" type="submit" disabled={groupSaving}>
              {groupSaving ? 'Creating...' : 'Create Group'}
            </button>
          </>
        }
      >
        {groupError && <div className="alert alert-error">{groupError}</div>}
        <form id="add-group-form" onSubmit={handleAddGroup}>
          <div className="field">
            <label>Group Name</label>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Class 10A"
            />
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameGroup}
        onClose={() => setRenameGroup(null)}
        title="Rename Group"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setRenameGroup(null)}>Cancel</button>
            <button className="btn btn-primary" form="rename-group-form" type="submit" disabled={renameSaving}>
              {renameSaving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="rename-group-form" onSubmit={handleRename}>
          <div className="field">
            <label>Group Name</label>
            <input
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              required
              autoFocus
            />
          </div>
        </form>
      </Modal>

      {/* Add Student to Group Modal */}
      <Modal
        isOpen={!!addStudentGroupId}
        onClose={() => setAddStudentGroupId(null)}
        title="Add Student to Group"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddStudentGroupId(null)}>Cancel</button>
            <button className="btn btn-primary" form="add-student-form" type="submit" disabled={addStudentSaving}>
              {addStudentSaving ? 'Adding...' : 'Add Student'}
            </button>
          </>
        }
      >
        {addStudentError && <div className="alert alert-error">{addStudentError}</div>}
        <form id="add-student-form" onSubmit={handleAddStudentToGroup}>
          <div className="field">
            <label>Select Student</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              required
            >
              <option value="">-- Choose a student --</option>
              {studentsNotInGroup(addStudentGroupId).map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} (@{s.username})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </>
  )
}
