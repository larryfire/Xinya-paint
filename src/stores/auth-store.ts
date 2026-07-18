import { create } from "zustand"
import type { JwtPayload } from "@/lib/jwt"

interface UserInfo {
  id: number
  username: string
  realName: string
  role: string
  teamId: number | null
  teamName?: string
  gender?: string | null
  age?: number | null
  craftType?: string | null
  level?: string | null
  phone?: string | null
  isActive?: boolean
  approvalStatus?: string
  createdAt?: string
}

const TOKEN_KEY = "xinya-auth-token"

interface AuthState {
  user: UserInfo | null
  isLoading: boolean
  token: string | null
  setUser: (user: UserInfo | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  getToken: () => string | null
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  token: typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  setUser: (user) => set({ user, isLoading: false }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    set({ token })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  getToken: () => get().token,
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null })
  },
}))
