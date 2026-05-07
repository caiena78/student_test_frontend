import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import client from '../../api/client'

const EMPTY_FORM = {
  first_name: '', last_name: '', username: '', email: '',
  password: '', role: 'student', is_active: true
}

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get('/admin/users')
      setUsers(res.data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filteredUsers = users.filter(u => {
    if (activeTab === 'teachers') return u.role === 'teacher'
    if (activeTab === 'students') return u.role === 'student'
    return true
  })

  const openAdd = () => {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'student',
      is_active: user.is_active !== undefined ? user.is_active : true
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = { ...form }
      if (editUser && !payload.password) delete payload.password
      if (editUser) {
        await client.put(`/admin/users/${editUser.id}`, payload)
      } else {
        await client.post('/admin/users', payload)
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await client.put(`/admin/users/${user.id}`, { ...user, is_active: !user.is_active })
      fetchUsers()
    } catch {
      setError('Failed to update user status')
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
    try {
      await client.delete(`/admin/users/${user.id}`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user')
    }
  }

  const roleBadge = (role) => {
    const cls = role === 'admin' ? 'badge-admin' : role === 'teacher' ? 'badge-teacher' : 'badge-student'
    return <span className={`badge ${cls}`}>{role}</span>
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="page-header">
          <h1>User Management</h1>
          <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          {[['all','All Users'],['teachers','Teachers'],['students','Students']].map(([tab,label]) => (
            <button key={tab} className={`tab${activeTab===tab?' active':''}`} onClick={() => setActiveTab(tab)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg"></div></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th className="hide-mobile">Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No users found</td></tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(u)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.id}</td>
                    <td style={{ fontWeight: 500 }}>{u.first_name} {u.last_name}</td>
                    <td>{u.username}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{u.email || '-'}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex-row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(u)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? 'Edit User' : 'Add User'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="user-form" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
            </button>
          </>
        }
      >
        {formError && <div className="alert alert-error">{formError}</div>}
        <form id="user-form" onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name</label>
              <input value={form.first_name} onChange={e => handleFormChange('first_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={form.last_name} onChange={e => handleFormChange('last_name', e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={e => handleFormChange('username', e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} />
          </div>
          <div className="field">
            <label>{editUser ? 'Password (leave blank to keep)' : 'Password'}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => handleFormChange('password', e.target.value)}
              required={!editUser}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => handleFormChange('role', e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => handleFormChange('is_active', e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Active
            </label>
          </div>
        </form>
      </Modal>
    </>
  )
}
