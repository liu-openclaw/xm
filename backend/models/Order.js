const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goods: { type: mongoose.Schema.Types.ObjectId, ref: 'Goods', required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['待付款', '已付款', '已发货', '已完成', '已取消'],
    default: '待付款'
  },
  address: {
    name: String,
    phone: String,
    detail: String
  },
  alipayTradeNo: { type: String, default: '' },
  paidAt: Date,
  shippedAt: Date,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Order', orderSchema)