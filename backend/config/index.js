require('dotenv').config()

module.exports = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpire: process.env.ACCESS_TOKEN_EXPIRE || '15m',
    refreshExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d'
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID,
    gateway: process.env.ALIPAY_GATEWAY,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL,
    returnUrl: process.env.ALIPAY_RETURN_URL || 'http://localhost:5173/orders'
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
  }
}