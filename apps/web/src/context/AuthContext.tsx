import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from '../types'
import { api } from '../services/api'

const normalizeUser = (rawUser: User): User => ({
  ...rawUser,
  // Roles come from the authenticated server response. Normalize casing for UI checks,
  // and fail closed for any unexpected value rather than granting admin access.
  role: String(rawUser.role).toLowerCase() === 'admin' ? 'admin' : 'customer'
})

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkAuth = async () => {
    try {
      const res = await api.getMe()
      if (res?.success && res.user) {
        setUser(normalizeUser(res.user))
      } else {
        setUser(null)
      }
    } catch (err) {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.login({ email, password })
    const authenticatedUser = normalizeUser(res.user)
    setUser(authenticatedUser)
    return authenticatedUser
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password })
    setUser(normalizeUser(res.user))
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (_) {}
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
