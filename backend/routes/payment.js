const router = require('express').Router()
const ctrl = require('../controllers/paymentController')
const auth = require('../middlewares/auth')

router.post('/create', auth, ctrl.createPayment)
router.post('/notify', ctrl.notify)

module.exports = router