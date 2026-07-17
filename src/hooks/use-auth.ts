"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"

export function useAuth(redirectIfUnauth = true) {
  const { user, isLoading, setUser, setLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setUser(data.data)
            return
          }
        }
        setUser(null)
        if (redirectIfUnauth) {
          router.push("/login")
        }
      } catch {
        setUser(null)
        if (redirectIfUnauth) {
          router.push("/login")
        }
      }
    }
    if (!user) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, isLoading }
}
