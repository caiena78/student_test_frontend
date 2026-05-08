import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
  ]

  const teacherLinks = [
    { to: '/teacher', label: 'Dashboard' },
    { to: '/teacher/groups', label: 'Groups' },
    { to: '/teacher/students', label: 'Students' },
    { to: '/teacher/tests', label: 'Tests' },
    { to: '/teacher/print-jobs', label: 'Printing' },
  ]

  const studentLinks = [
    { to: '/student', label: 'My Tests' },
  ]

  const links = user?.role === 'admin'
    ? adminLinks
    : user?.role === 'teacher'
    ? teacherLinks
    : user?.role === 'student'
    ? studentLinks
    : []

  const roleBadgeClass = user?.role === 'admin'
    ? 'badge badge-admin'
    : user?.role === 'teacher'
    ? 'badge badge-teacher'
    : 'badge badge-student'

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">Caroline's Test System</Link>

        <ul className="navbar-nav">
          {links.map(link => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/teacher' || link.to === '/student' || link.to === '/admin'}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar-right">
          {user && (
            <div className="navbar-user">
              <span style={{ fontWeight: 500 }}>{user.first_name}</span>
              <span className={roleBadgeClass}>{user.role}</span>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Logout
          </button>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMenuOpen(false)}
            end={link.to === '/teacher' || link.to === '/student' || link.to === '/admin'}
          >
            {link.label}
          </NavLink>
        ))}
        <button
          onClick={() => { setMenuOpen(false); handleLogout() }}
          style={{ padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 15, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', width: '100%' }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
