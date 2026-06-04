const router = require('express').Router()

router.use('/auth', require('./auth'))
router.use('/goods', require('./goods'))
router.use('/orders', require('./order'))
router.use('/chat', require('./chat'))
router.use('/payment', require('./payment'))
router.use('/ai', require('./ai'))

module.exports = router