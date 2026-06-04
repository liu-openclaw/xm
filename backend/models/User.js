const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  nickname: { type: String, default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  refreshToken: { type: String, default: '' },  // 存储当前有效的 refreshToken，用于单点登录互踢
  createdAt: { type: Date, default: Date.now }
})

// 密码加密（仅当 password 字段有值且被修改时）
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// 校验密码
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)