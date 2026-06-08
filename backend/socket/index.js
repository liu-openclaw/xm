const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const config = require('../config')
const Message = require('../models/Message')
const User = require('../models/User')

let _io

function initSocket(server) {
  _io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  })

  // 认证中间件
  _io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('未登录'))
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret)
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Token 无效'))
    }
  })

  _io.on('connection', (socket) => {
    const userId = socket.userId
    socket.join(`user_${userId}`)
    console.log(`用户 ${userId} 已连接 WebSocket`)

    // 加入指定会话房间
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conv_${conversationId}`)
    })

    // 发送消息
    socket.on('sendMessage', async (data, ack) => {
      try {
        const { receiverId, content, type = 'text', goodsTitle = '' } = data

        // 防止自消息：收件人不能等于发件人
        if (receiverId === userId) {
          if (ack) ack({ success: false, message: '不能给自己发消息' })
          return
        }

        // 生成唯一会话ID（两个用户的ID排序拼接）
        const ids = [userId, receiverId].sort()
        const conversationId = ids[0] + '_' + ids[1]

        const message = await Message.create({
          conversationId,
          sender: userId,
          receiver: receiverId,
          content,
          type
        })

        const sender = await User.findById(userId).select('nickname avatar')
        const payload = {
          _id: message._id,
          conversationId,
          sender: { _id: userId, nickname: sender.nickname, avatar: sender.avatar },
          content,
          type,
          createdAt: message.createdAt
        }

        // 推送给会话房间内的所有人
        _io.to(`conv_${conversationId}`).emit('newMessage', payload)

        // 推送给接收方通知（用于更新会话列表）
        _io.to(`user_${receiverId}`).emit('newMessageNotify', {
          ...payload,
          goodsTitle
        })

        if (ack) ack({ success: true, messageId: message._id.toString() })
      } catch (err) {
        if (ack) ack({ success: false, message: err.message })
      }
    })

    socket.on('disconnect', () => {
      console.log(`用户 ${userId} 断开连接`)
    })
  })

  return _io
}

module.exports = { initSocket, get io() { return _io } }