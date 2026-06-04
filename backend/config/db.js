const mongoose = require('mongoose')
const config = require('./index')

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri)
    console.log('MongoDB 连接成功')
  } catch (err) {
    console.error('MongoDB 连接失败:', err.message)
    process.exit(1)
  }
}

module.exports = connectDB