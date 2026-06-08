const User = require('../models/User')
const { generateTokens, verifyRefreshToken } = require('../utils/jwt')
const { sendSms } = require('../utils/sms')
const { generateCode, saveCode, verify, canResend, consume } = require('../utils/verifyCode')
const crypto = require('crypto')

// 注册
exports.register = async ({ username, password, nickname }) => {
  const exist = await User.findOne({ username })
  if (exist) throw new Error('用户名已存在')
  const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nickname || username)}`
  const user = await User.create({ username, password, nickname, avatar })
  const tokens = generateTokens({ userId: user._id, tokenVersion: user.tokenVersion })
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
  user.tokenVersion += 1
  const tokens = generateTokens({ userId: user._id, tokenVersion: user.tokenVersion })
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
  if (user.refreshToken !== oldRefreshToken || decoded.tokenVersion !== user.tokenVersion) {
    throw new Error('账号已在其他设备登录，请重新登录')
  }
  const tokens = generateTokens({ userId: user._id, tokenVersion: user.tokenVersion })
  user.refreshToken = tokens.refreshToken
  await user.save()
  return tokens
}

// 登出
exports.logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: '' })
}

// 发送验证码
exports.sendCode = async (phone) => {
  if (!canResend(phone)) {
    throw new Error('发送过于频繁，请60秒后再试')
  }
  const code = generateCode()
  saveCode(phone, code)

  try {
    await sendSms(phone, { code })
    console.log(`[SMS] 验证码已发送到 ${phone}: ${code}`)
  } catch (err) {
    // 发送失败时清除已保存的验证码
    consume(phone)
    throw new Error('短信发送失败: ' + err.message)
  }
}

// 手机号验证码登录（未注册自动注册）
exports.phoneLogin = async (phone, code) => {
  if (!verify(phone, code)) {
    throw new Error('验证码错误或已过期')
  }
  consume(phone)

  let user = await User.findOne({ phone })
  const isNewUser = !user

  if (!user) {
    // 自动注册：用手机号作为用户名，生成随机密码
    const randomPassword = crypto.randomBytes(16).toString('hex')
    const nickname = '用户' + phone.slice(-4)
    const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nickname)}`
    user = await User.create({
      username: phone,
      password: randomPassword,
      nickname,
      phone,
      avatar
    })
  }

  user.tokenVersion += 1
  const tokens = generateTokens({ userId: user._id, tokenVersion: user.tokenVersion })
  user.refreshToken = tokens.refreshToken
  await user.save()

  return {
    user: { id: user._id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
    isNewUser,
    ...tokens
  }
}
