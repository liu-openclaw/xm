const { verifyAccessToken } = require('../utils/jwt')

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = verifyAccessToken(token)
    req.userId = decoded.userId
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: 'Token 已过期', expired: true })
    }
    return res.status(401).json({ code: 401, message: 'Token 无效' })
  }
}