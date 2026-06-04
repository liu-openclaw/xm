const router = require('express').Router()
const ctrl = require('../controllers/goodsController')
const auth = require('../middlewares/auth')

router.get('/mine', auth, ctrl.getMyGoods)
router.get('/', ctrl.getList)
router.get('/:id', ctrl.getDetail)
router.post('/', auth, ctrl.create)
router.delete('/:id', auth, ctrl.remove)

module.exports = router