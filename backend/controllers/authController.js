const authService = require('../services/authService')

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body)
    res.json({ code: 0, data: result, message: '注册成功' })
  } catch (err) {
    res.status(400).json({ code: 400, message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body)
    res.json({ code: 0, data: result, message: '登录成功' })
  } catch (err) {
    res.status(400).json({ code: 400, message: err.message })
  }
}

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new Error('缺少 refreshToken')
    const tokens = await authService.refresh(refreshToken)
    res.json({ code: 0, data: tokens })
  } catch (err) {
    res.status(401).json({ code: 401, message: err.message })
  }
}

exports.logout = async (req, res) => {
  try {
    await authService.logout(req.userId)
    res.json({ code: 0, message: '已退出登录' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.getProfile = async (req, res) => {
  const User = require('../models/User')
  const user = await User.findById(req.userId).select('-password -refreshToken')
  res.json({ code: 0, data: user })
}