const express = require('express')
const http = require('http')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const path = require('path')
const connectDB = require('./config/db')
const config = require('./config')
const routes = require('./routes')
const { initSocket } = require('./socket')

const app = express()
app.set('trust proxy', 1)
const server = http.createServer(app)

// 数据库
connectDB()

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
})
app.use('/api/', limiter)

// 路由
app.use('/api', routes)

// WebSocket
initSocket(server)

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 500, message: '服务器内部错误' })
})

server.listen(config.port, () => {
  console.log(`服务运行在 http://localhost:${config.port}`)
})