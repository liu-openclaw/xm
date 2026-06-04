const router = require('express').Router()
const ctrl = require('../controllers/orderController')
const auth = require('../middlewares/auth')

router.post('/', auth, ctrl.create)
router.get('/', auth, ctrl.getList)
router.get('/:id', auth, ctrl.getDetail)
router.put('/:id/cancel', auth, ctrl.cancel)

module.exports = router