const orderService = require('../services/orderService')

exports.create = async (req, res) => {
  try {
    const order = await orderService.create({
      buyerId: req.userId,
      goodsId: req.body.goodsId,
      address: req.body.address
    })
    res.json({ code: 0, data: order })
  } catch (err) {
    res.status(400).json({ code: 400, message: err.message })
  }
}

exports.getList = async (req, res) => {
  try {
    const { role, page, pageSize } = req.query
    const result = await orderService.getList({
      userId: req.userId,
      role: role || 'buyer',
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    })
    res.json({ code: 0, data: result })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.getDetail = async (req, res) => {
  try {
    const order = await orderService.getDetail(req.params.id)
    res.json({ code: 0, data: order })
  } catch (err) {
    res.status(404).json({ code: 404, message: err.message })
  }
}

exports.cancel = async (req, res) => {
  try {
    const order = await orderService.cancel(req.params.id, req.userId)
    res.json({ code: 0, data: order })
  } catch (err) {
    res.status(400).json({ code: 400, message: err.message })
  }
}