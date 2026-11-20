import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from '../types'
import { api } from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginAsDemo: (role: 'customer' | 'admin') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkAuth = async () => {
    try {
      const res = await api.getMe()
      if (res?.success && res.user) {
        setUser(res.user)
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

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password })
    setUser(res.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password })
    setUser(res.user)
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (_) {}
    setUser(null)
  }

  const loginAsDemo = async (role: 'customer' | 'admin') => {
    if (role === 'admin') {
      await login('admin@flashstock.dev', 'admin123')
    } else {
      await login('customer@flashstock.dev', 'customer123')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        loginAsDemo
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
