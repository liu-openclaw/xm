const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ receiver: 1, read: 1 })

module.exports = mongoose.model('Message', messageSchema)