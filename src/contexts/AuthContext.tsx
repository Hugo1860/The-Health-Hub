'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  createdAt: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoplay: boolean
    defaultPlaybackRate: number
    defaultVolume: number
  }
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 获取完整的用户信息
  const fetchUserProfile = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
      return
    }

    if (session?.user) {
      fetchUserProfile()
    } else {
      setUser(null)
    }
    
    setIsLoading(false)
  }, [session, status])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      
      if (result?.ok && !result?.error) {
        // 登录成功后重新获取用户信息
        setTimeout(() => {
          fetchUserProfile()
        }, 500) // 增加延迟确保session更新完成
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await signOut({ redirect: false })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return { success: false, error: data.error || '注册失败' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: '注册失败，请稍后重试' }
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        setUser(result.user)
        return { success: true }
      } else {
        return { success: false, error: result.error || '更新失败' }
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: '更新失败，请稍后重试' }
    }
  }

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}