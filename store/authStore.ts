// store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email?: string
  walletAddress?: string
  name?: string
  avatar?: string
  authType: 'email' | 'wallet'
  nickname?: string
  isAdmin?: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (user: User, token: string) => {
        set({
          user,
          isAuthenticated: true,
          token,
        })
      },
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
        })
      },
      updateUser: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)

