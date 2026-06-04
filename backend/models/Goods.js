const mongoose = require('mongoose')

const goodsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  category: { type: String, default: '其他', enum: ['数码', '家居', '服饰', '图书', '美妆', '运动', '其他'] },
  images: [{ type: String }],
  condition: { type: String, enum: ['全新', '几乎全新', '轻微使用', '明显使用'], default: '轻微使用' },
  status: { type: String, enum: ['在售', '已售', '下架'], default: '在售' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

goodsSchema.index({ title: 'text', description: 'text' })
goodsSchema.index({ category: 1, status: 1 })
goodsSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Goods', goodsSchema)