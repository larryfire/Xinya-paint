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
}

interface AuthState {
  user: UserInfo | null
  isLoading: boolean
  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    set({ user: null })
  },
}))
