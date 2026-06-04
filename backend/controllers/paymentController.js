const paymentService = require('../services/paymentService')

exports.createPayment = async (req, res) => {
  try {
    const { orderNo, amount, subject } = req.body
    const payInfo = await paymentService.createPayment(orderNo, amount, subject)
    res.json({ code: 0, data: payInfo })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
}

exports.notify = async (req, res) => {
  try {
    const ok = await paymentService.handleNotify(req.body)
    if (ok) {
      res.send('success')
    } else {
      res.send('fail')
    }
  } catch {
    res.send('fail')
  }
}