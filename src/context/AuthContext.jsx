import React, { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      client.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.clear(); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password })
    const { token } = res.data
    localStorage.setItem('token', token)
    // Fetch full profile so force_password_change is always present
    const meRes = await client.get('/auth/me')
    setUser(meRes.data)
    return meRes.data
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  // Call after password change to clear the flag locally
  const clearForcePasswordChange = () => {
    setUser(u => u ? { ...u, force_password_change: 0 } : u)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, clearForcePasswordChange }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
