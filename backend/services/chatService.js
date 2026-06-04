const mongoose = require('mongoose')
const Message = require('../models/Message')
const User = require('../models/User')

// 获取用户的会话列表（聚合最后一条消息 + 未读数）
exports.getConversations = async (userId) => {
  // MongoDB 聚合管道不会自动转换类型，必须手动转为 ObjectId
  const userObjectId = new mongoose.Types.ObjectId(userId)

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userObjectId }, { receiver: userObjectId }]
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiver', userObjectId] }, { $eq: ['$read', false] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } }
  ])

  // 没有会话时也返回 AI 助手入口
  if (conversations.length === 0) {
    return [{
      _id: 'ai-assistant',
      lastMessage: {
        _id: 'ai-last',
        conversationId: 'ai-assistant',
        sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: 'ai-assistant' },
        receiver: userId,
        content: '随时为您解答平台疑问',
        type: 'text',
        read: true,
        createdAt: new Date().toISOString()
      },
      unreadCount: 0
    }]
  }

  // 填充发送者信息
  const senderIds = [...new Set(conversations.map(c => c.lastMessage.sender.toString()))]
  const users = await User.find({ _id: { $in: senderIds } }).select('nickname avatar')
  const userMap = {}
  users.forEach(u => { userMap[u._id.toString()] = u })

  const result = conversations.map(c => ({
    _id: c._id,
    lastMessage: {
      ...c.lastMessage,
      sender: userMap[c.lastMessage.sender.toString()] || { nickname: '用户' }
    },
    unreadCount: c.unreadCount
  }))

  // 始终在顶部注入 AI 智能助手虚拟会话
  result.unshift({
    _id: 'ai-assistant',
    lastMessage: {
      _id: 'ai-last',
      conversationId: 'ai-assistant',
      sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: 'ai-assistant' },
      receiver: userId,
      content: '随时为您解答平台疑问',
      type: 'text',
      read: true,
      createdAt: new Date().toISOString()
    },
    unreadCount: 0
  })

  return result
}

// 获取会话消息列表
exports.getMessages = async (conversationId, { page = 1, pageSize = 50 }) => {
  const total = await Message.countDocuments({ conversationId })
  const list = await Message.find({ conversationId })
    .populate('sender', 'nickname avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  return { total, list: list.reverse(), page, pageSize }
}

// 标记会话消息为已读
exports.markRead = async (conversationId, userId) => {
  await Message.updateMany(
    { conversationId, receiver: userId, read: false },
    { read: true }
  )
}

// 删除会话（删除该会话下所有消息）
exports.deleteConversation = async (conversationId, userId) => {
  // 只删除当前用户参与的消息（sender 或 receiver 为 userId）
  const userObjectId = new mongoose.Types.ObjectId(userId)
  const result = await Message.deleteMany({
    conversationId,
    $or: [{ sender: userObjectId }, { receiver: userObjectId }]
  })
  return result.deletedCount
}