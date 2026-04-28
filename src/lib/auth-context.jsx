import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMe } from './server'

const AuthContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch (err) {
      if (err.status !== 401) console.warn('auth refresh failed', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
