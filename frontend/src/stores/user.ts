import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { setTokens, clearTokens, getAccessToken } from '@/utils/auth'
import type { UserInfo } from '@/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)

  // 初始化时检测 token 是否存在
  if (getAccessToken()) {
    isLoggedIn.value = true
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    setTokens(res.data.accessToken, res.data.refreshToken)
    user.value = res.data.user
    isLoggedIn.value = true
    return res.data
  }

  async function register(username: string, password: string, nickname: string) {
    const res = await authApi.register({ username, password, nickname })
    setTokens(res.data.accessToken, res.data.refreshToken)
    user.value = res.data.user
    isLoggedIn.value = true
    return res.data
  }

  async function fetchProfile() {
    const res = await authApi.getProfile()
    user.value = res.data
    isLoggedIn.value = true
  }

  function logout() {
    authApi.logout().catch(() => {})
    clearTokens()
    user.value = null
    isLoggedIn.value = false
  }

  return { user, isLoggedIn, login, register, logout, fetchProfile }
}, {
  persist: {
    key: 'user-store',
    pick: ['user', 'isLoggedIn']
  }
})