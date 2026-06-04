const jwt = require('jsonwebtoken')
const config = require('../config')

// 生成双 Token
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpire
  })
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire
  })
  return { accessToken, refreshToken }
}

// 校验 Access Token
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret)
}

// 校验 Refresh Token
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret)
}

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken }