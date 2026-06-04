const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export function getAccessToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_KEY) || ''
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}