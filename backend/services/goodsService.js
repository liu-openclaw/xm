const Goods = require('../models/Goods')

exports.getList = async ({ page = 1, pageSize = 20, category, keyword, sort = 'newest' }) => {
  const filter = { status: '在售' }
  if (category && category !== '全部') filter.category = category
  if (keyword) filter.$text = { $search: keyword }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    hot: { viewCount: -1 }
  }

  const total = await Goods.countDocuments(filter)
  const list = await Goods.find(filter)
    .populate('seller', 'nickname avatar')
    .sort(sortMap[sort] || sortMap.newest)
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  return { total, list, page, pageSize }
}

exports.getMyGoods = async (userId, { page = 1, pageSize = 20 }) => {
  const filter = { seller: userId }

  const total = await Goods.countDocuments(filter)
  const list = await Goods.find(filter)
    .populate('seller', 'nickname avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  return { total, list, page, pageSize }
}

exports.getDetail = async (id) => {
  const goods = await Goods.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
    .populate('seller', 'nickname avatar')
  if (!goods) throw new Error('商品不存在')
  return goods
}

exports.create = async (data) => {
  return Goods.create(data)
}

exports.remove = async (id, userId) => {
  const goods = await Goods.findOneAndUpdate(
    { _id: id, seller: userId },
    { status: '下架' },
    { new: true }
  )
  if (!goods) throw new Error('无权限操作')
  return goods
}