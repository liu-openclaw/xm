import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 是否正在刷新 Token
let isRefreshing = false
// 等待刷新的请求队列
let pendingRequests: Array<(token: string) => void> = []

// 请求拦截器
request.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 — 双 Token 无感刷新
request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { config, response } = error
    // Token 过期，尝试刷新
    if (response?.status === 401 && response.data?.expired && !config._retry) {
      config._retry = true

      if (isRefreshing) {
        // 已有刷新请求在进行中，将后续请求挂起
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            config.headers.Authorization = `Bearer ${token}`
            resolve(request(config))
          })
        })
      }

      isRefreshing = true
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearTokens()
        router.push('/login')
        return Promise.reject(error)
      }

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data.data
        setTokens(accessToken, newRefresh)

        // 重试挂起的请求
        pendingRequests.forEach(cb => cb(accessToken))
        pendingRequests = []

        config.headers.Authorization = `Bearer ${accessToken}`
        return request(config)
      } catch {
        clearTokens()
        pendingRequests = []
        router.push('/login')
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default request