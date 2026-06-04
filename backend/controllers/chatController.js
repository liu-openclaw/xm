const chatService = require('../services/chatService')

exports.getConversations = async (req, res) => {
  try {
    const conversations = await chatService.getConversations(req.userId)
    res.json({ code: 0, data: conversations })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.getMessages = async (req, res) => {
  try {
    const { page, pageSize } = req.query
    const result = await chatService.getMessages(req.params.conversationId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 50
    })
    res.json({ code: 0, data: result })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.markRead = async (req, res) => {
  try {
    await chatService.markRead(req.params.conversationId, req.userId)
    res.json({ code: 0, message: 'ok' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.deleteConversation = async (req, res) => {
  try {
    const deletedCount = await chatService.deleteConversation(req.params.id, req.userId)
    res.json({ code: 0, data: { deletedCount }, message: 'ok' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}