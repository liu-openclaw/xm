const Order = require('../models/Order')
const Goods = require('../models/Goods')

exports.create = async ({ buyerId, goodsId, address }) => {
  const goods = await Goods.findById(goodsId)
  if (!goods) throw new Error('商品不存在')
  if (goods.status !== '在售') throw new Error('商品已售出或下架')
  if (goods.seller.toString() === buyerId) throw new Error('不能购买自己的商品')

  const orderNo = 'SH' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase()
  const order = await Order.create({
    orderNo,
    buyer: buyerId,
    seller: goods.seller,
    goods: goodsId,
    amount: goods.price,
    address
  })
  return order
}

exports.getList = async ({ userId, role = 'buyer', page = 1, pageSize = 20 }) => {
  const filter = role === 'buyer' ? { buyer: userId } : { seller: userId }
  const total = await Order.countDocuments(filter)
  const list = await Order.find(filter)
    .populate('goods', 'title price images')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
  return { total, list, page, pageSize }
}

exports.getDetail = async (orderId) => {
  return Order.findById(orderId)
    .populate('goods', 'title price images description')
    .populate('buyer', 'nickname avatar')
    .populate('seller', 'nickname avatar')
}

exports.paySuccess = async (orderNo, alipayTradeNo) => {
  const order = await Order.findOneAndUpdate(
    { orderNo },
    { status: '已付款', alipayTradeNo, paidAt: new Date() },
    { new: true }
  )
  if (order) {
    await Goods.findByIdAndUpdate(order.goods, { status: '已售' })
  }
  return order
}

exports.cancel = async (orderId, userId) => {
  const order = await Order.findById(orderId)
  if (!order) throw new Error('订单不存在')
  // 仅买家或卖家可取消，且仅待付款状态可取消
  if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
    throw new Error('无权取消该订单')
  }
  if (order.status !== '待付款') {
    throw new Error('仅待付款订单可取消')
  }
  order.status = '已取消'
  await order.save()
  // 恢复商品状态为在售
  await Goods.findByIdAndUpdate(order.goods, { status: '在售' })
  return order
}