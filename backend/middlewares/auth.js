const { verifyAccessToken } = require('../utils/jwt')
const User = require('../models/User')

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = verifyAccessToken(token)
    // 实时互踢：检查 token 中的版本号是否与用户当前版本一致
    const user = await User.findById(decoded.userId).select('tokenVersion')
    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ code: 401, message: '账号已在其他设备登录，请重新登录', kicked: true })
    }
    req.userId = decoded.userId
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: 'Token 已过期', expired: true })
    }
    return res.status(401).json({ code: 401, message: 'Token 无效' })
  }
}