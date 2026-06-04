const goodsService = require('../services/goodsService')

exports.getList = async (req, res) => {
  try {
    const { page, pageSize, category, keyword, sort } = req.query
    const result = await goodsService.getList({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      category,
      keyword,
      sort
    })
    res.json({ code: 0, data: result })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.getMyGoods = async (req, res) => {
  try {
    const { page, pageSize } = req.query
    const result = await goodsService.getMyGoods(req.userId, {
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
    const goods = await goodsService.getDetail(req.params.id)
    res.json({ code: 0, data: goods })
  } catch (err) {
    res.status(404).json({ code: 404, message: err.message })
  }
}

exports.create = async (req, res) => {
  try {
    const goods = await goodsService.create({ ...req.body, seller: req.userId })
    res.json({ code: 0, data: goods, message: '发布成功' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await goodsService.remove(req.params.id, req.userId)
    res.json({ code: 0, message: '已下架' })
  } catch (err) {
    res.status(400).json({ code: 400, message: err.message })
  }
}