import request from '@/utils/request'
import type { ApiResponse, UserInfo } from '@/types'

interface LoginResult {
  user: UserInfo
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post<any, ApiResponse<LoginResult>>('/auth/login', data),

  register: (data: { username: string; password: string; nickname: string }) =>
    request.post<any, ApiResponse<LoginResult>>('/auth/register', data),

  refresh: (refreshToken: string) =>
    request.post<any, ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),

  logout: () => request.post('/auth/logout'),

  getProfile: () => request.get<any, ApiResponse<UserInfo>>('/auth/profile')
}