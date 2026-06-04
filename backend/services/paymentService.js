const AlipaySdk = require('alipay-sdk').default
const config = require('../config')
const orderService = require('./orderService')
const { io } = require('../socket')

const alipaySdk = new AlipaySdk({
  appId: config.alipay.appId,
  privateKey: config.alipay.privateKey,
  alipayPublicKey: config.alipay.publicKey,
  gateway: config.alipay.gateway
})

exports.createPayment = async (orderNo, amount, subject) => {
  const payUrl = alipaySdk.pageExec('alipay.trade.wap.pay', {
    method: 'GET',
    bizContent: {
      out_trade_no: orderNo,
      total_amount: amount.toFixed(2),
      subject,
      product_code: 'QUICK_WAP_WAY',
      quit_url: config.alipay.returnUrl
    },
    returnUrl: config.alipay.returnUrl,
    notifyUrl: config.alipay.notifyUrl
  })
  return { payUrl }
}

exports.handleNotify = async (notifyData) => {
  const ok = alipaySdk.checkNotifySign(notifyData)
  if (!ok) return false
  const { out_trade_no, trade_no, trade_status } = notifyData
  if (trade_status === 'TRADE_SUCCESS') {
    const order = await orderService.paySuccess(out_trade_no, trade_no)
    if (order) {
      io.to(`user_${order.buyer}`).emit('orderPaid', {
        orderNo: out_trade_no,
        message: '订单支付成功'
      })
    }
  }
  return true
}
