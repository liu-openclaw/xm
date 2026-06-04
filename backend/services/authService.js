const User = require('../models/User')
const { generateTokens, verifyRefreshToken } = require('../utils/jwt')

// 注册
exports.register = async ({ username, password, nickname }) => {
  const exist = await User.findOne({ username })
  if (exist) throw new Error('用户名已存在')
  const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nickname || username)}`
  const user = await User.create({ username, password, nickname, avatar })
  const tokens = generateTokens({ userId: user._id })
  // 存储 refreshToken 用于单点登录互踢
  user.refreshToken = tokens.refreshToken
  await user.save()
  return {
    user: { id: user._id, username: user.username, nickname: user.nickname, avatar: user.avatar },
    ...tokens
  }
}

// 登录
exports.login = async ({ username, password }) => {
  const user = await User.findOne({ username })
  if (!user) throw new Error('用户名或密码错误')
  const valid = await user.comparePassword(password)
  if (!valid) throw new Error('用户名或密码错误')
  const tokens = generateTokens({ userId: user._id })
  // 更新 refreshToken，实现单点登录（旧设备 token 失效）
  user.refreshToken = tokens.refreshToken
  await user.save()
  return {
    user: { id: user._id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
    ...tokens
  }
}

// 刷新双 Token
exports.refresh = async (oldRefreshToken) => {
  let decoded
  try {
    decoded = verifyRefreshToken(oldRefreshToken)
  } catch {
    throw new Error('Refresh Token 无效或已过期')
  }
  const user = await User.findById(decoded.userId)
  if (!user) throw new Error('用户不存在')
  // 校验 refreshToken 是否一致（单点登录核心：旧设备 token 已失效）
  if (user.refreshToken !== oldRefreshToken) {
    throw new Error('账号已在其他设备登录，请重新登录')
  }
  const tokens = generateTokens({ userId: user._id })
  user.refreshToken = tokens.refreshToken
  await user.save()
  return tokens
}

// 登出
exports.logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: '' })
}
