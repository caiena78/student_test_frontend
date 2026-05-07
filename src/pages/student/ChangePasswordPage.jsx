import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'

export default function ChangePasswordPage() {
  const { user, clearForcePasswordChange, logout } = useAuth()
  const navigate = useNavigate()
  const forced = !!user?.force_password_change

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      await client.post('/auth/change-password', {
        current_password: forced ? undefined : currentPassword,
        new_password: newPassword,
      })
      clearForcePasswordChange()
      navigate('/student')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔑</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>Caroline's Test System</h1>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {forced ? 'Set a New Password' : 'Change Password'}
          </h2>

          {forced && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              Your teacher has required you to set a new password before continuing.
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!forced && (
              <div className="field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus={forced}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</>
              ) : 'Set New Password'}
            </button>
          </form>

          {!forced && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          )}

          {forced && (
            <button
              style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', width: '100%' }}
              onClick={() => { logout(); navigate('/login') }}
            >
              Sign out instead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
