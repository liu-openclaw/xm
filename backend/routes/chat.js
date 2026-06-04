const router = require('express').Router()
const ctrl = require('../controllers/chatController')
const auth = require('../middlewares/auth')

router.get('/conversations', auth, ctrl.getConversations)
router.get('/messages/:conversationId', auth, ctrl.getMessages)
router.put('/messages/:conversationId/read', auth, ctrl.markRead)
router.delete('/conversations/:id', auth, ctrl.deleteConversation)

module.exports = router