import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function BooksAndPalette() {
  return (
    <svg viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block' }}>
      {/* Ground shadow */}
      <ellipse cx="120" cy="252" rx="100" ry="7" fill="rgba(0,0,0,0.08)" />

      {/* ── BOOK STACK ── */}
      {/* Book 5 — bottom, purple */}
      <rect x="30" y="196" width="140" height="22" rx="4" fill="#7d3c98" />
      <rect x="30" y="196" width="12" height="22" rx="3" fill="#6c3483" />
      <rect x="46" y="200" width="110" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
      <rect x="46" y="214" width="110" height="2" rx="1" fill="rgba(255,255,255,0.1)" />

      {/* Book 4 — teal */}
      <rect x="25" y="174" width="150" height="22" rx="4" fill="#148f77" />
      <rect x="25" y="174" width="12" height="22" rx="3" fill="#0e6655" />
      <rect x="41" y="178" width="120" height="2" rx="1" fill="rgba(255,255,255,0.15)" />

      {/* Book 3 — red */}
      <rect x="32" y="152" width="136" height="22" rx="4" fill="#c0392b" />
      <rect x="32" y="152" width="12" height="22" rx="3" fill="#a93226" />
      <rect x="48" y="156" width="106" height="2" rx="1" fill="rgba(255,255,255,0.15)" />

      {/* Book 2 — navy blue */}
      <rect x="28" y="130" width="144" height="22" rx="4" fill="#1a5276" />
      <rect x="28" y="130" width="12" height="22" rx="3" fill="#154360" />
      <rect x="44" y="134" width="114" height="2" rx="1" fill="rgba(255,255,255,0.15)" />

      {/* Book 1 — top, golden */}
      <rect x="35" y="108" width="130" height="22" rx="4" fill="#d4ac0d" />
      <rect x="35" y="108" width="12" height="22" rx="3" fill="#b7950b" />
      <rect x="51" y="112" width="100" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
      <rect x="51" y="124" width="100" height="2" rx="1" fill="rgba(255,255,255,0.1)" />

      {/* ── PALETTE ── */}
      {/* Drop shadow */}
      <path d="M 92 52 Q 78 58 76 70 Q 74 84 84 93 Q 94 102 108 100 Q 126 98 134 86 Q 142 72 136 60 Q 128 48 114 46 Q 100 44 92 52 Z"
        fill="rgba(0,0,0,0.12)" transform="translate(3,3)" />
      {/* Palette body */}
      <path d="M 92 52 Q 78 58 76 70 Q 74 84 84 93 Q 94 102 108 100 Q 126 98 134 86 Q 142 72 136 60 Q 128 48 114 46 Q 100 44 92 52 Z"
        fill="#f5e6c8" stroke="#c8a050" strokeWidth="2" />
      {/* Thumb hole */}
      <ellipse cx="90" cy="84" rx="9" ry="8" fill="white" stroke="#c8a050" strokeWidth="1.5" />

      {/* Paint blobs */}
      <circle cx="96" cy="56" r="8" fill="#e74c3c" stroke="#c0392b" strokeWidth="1" />   {/* red */}
      <circle cx="113" cy="51" r="8" fill="#27ae60" stroke="#1e8449" strokeWidth="1" />  {/* green */}
      <circle cx="129" cy="60" r="8" fill="#7B3F00" stroke="#5D2E00" strokeWidth="1" />  {/* brown */}
      <circle cx="134" cy="78" r="8" fill="#ff69b4" stroke="#e0508a" strokeWidth="1" />  {/* pink */}
      <circle cx="127" cy="93" r="8" fill="#f0f0f0" stroke="#bbb" strokeWidth="1.5" />   {/* white */}
      <circle cx="108" cy="98" r="8" fill="#ff8c00" stroke="#e07b00" strokeWidth="1" />  {/* orange */}

      {/* Paint blob shine dots */}
      <circle cx="93" cy="53" r="2.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="110" cy="48" r="2.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="126" cy="57" r="2.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="131" cy="75" r="2.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="124" cy="90" r="2.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="105" cy="95" r="2.5" fill="rgba(255,255,255,0.6)" />

      {/* ── PAINTBRUSH (resting on palette) ── */}
      <g transform="rotate(38, 68, 90)">
        {/* Handle — wood */}
        <rect x="56" y="55" width="7" height="52" rx="3" fill="#a07830" />
        {/* Wood grain */}
        <line x1="59" y1="62" x2="59" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        {/* Ferrule — silver */}
        <rect x="56" y="55" width="7" height="10" rx="2" fill="#c0c0c0" />
        <rect x="56" y="59" width="7" height="2" fill="#a0a0a0" />
        {/* Bristles */}
        <path d="M 56 53 L 63 53 L 65 36 Q 59.5 32 54 36 Z" fill="#c0392b" />
        <path d="M 58 36 L 60 28" stroke="#a93226" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 61 37 L 62 29" stroke="#e74c3c" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'teacher') navigate('/teacher')
      else navigate('/student')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: 860, display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Illustration + branding */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <BooksAndPalette />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, margin: 0 }}>
              Caroline's Test System
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
              School Testing Platform
            </p>
          </div>
        </div>

        {/* Login form */}
        <div style={{ flex: '1 1 300px', maxWidth: 400, width: '100%' }}>
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Sign In</h2>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
