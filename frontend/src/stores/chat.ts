import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '@/api/chat'
import type { ConversationItem, MessageItem } from '@/types'
import { useUserStore } from '@/stores/user'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<ConversationItem[]>([])
  const currentConversationId = ref('')
  const messages = ref<MessageItem[]>([])

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  )

  async function fetchConversations() {
    const res = await chatApi.getConversations()
    conversations.value = res.data
  }

  async function fetchMessages(conversationId: string) {
    currentConversationId.value = conversationId
    const res = await chatApi.getMessages(conversationId)
    messages.value = res.data.list
  }

  function addMessage(msg: MessageItem) {
    // 获取当前用户 ID（用于判断消息是否是"别人发给我的"）
    const userStore = useUserStore()
    const myUserId = userStore.user?.id || ''

    // --- 1. 处理当前聊天窗口 ---
    if (msg.conversationId === currentConversationId.value) {
      const exists = messages.value.some(m => m._id === msg._id)
      if (!exists) {
        messages.value.push(msg)
      }
    }

    // --- 2. 更新会话列表 ---
    const convIdx = conversations.value.findIndex(c => c._id === msg.conversationId)

    if (convIdx !== -1) {
      // 会话已存在：更新最后一条消息和未读数
      const conv = conversations.value[convIdx]
      conversations.value[convIdx] = {
        ...conv,
        lastMessage: msg,
        unreadCount:
          conv.unreadCount +
          // 只有「别人发来的」且「不在当前聊天窗口」才增加未读数
          (msg.sender?._id !== myUserId &&
           msg.conversationId !== currentConversationId.value
            ? 1
            : 0)
      }
    } else {
      // 新会话：通过 WebSocket 首次收到消息，插入到列表最前面
      conversations.value.unshift({
        _id: msg.conversationId,
        lastMessage: msg,
        unreadCount:
          msg.sender?._id !== myUserId &&
          msg.conversationId !== currentConversationId.value
            ? 1
            : 0
      })
    }
  }

  async function markRead(conversationId: string) {
    await chatApi.markRead(conversationId)
    const conv = conversations.value.find(c => c._id === conversationId)
    if (conv) conv.unreadCount = 0
  }

  async function deleteConversation(conversationId: string) {
    // 本地移除
    conversations.value = conversations.value.filter(c => c._id !== conversationId)
    // 同步后端（ai-assistant 是虚拟会话，无需调后端）
    if (conversationId !== 'ai-assistant') {
      try {
        await chatApi.deleteConversation(conversationId)
      } catch {
        // 后端删除失败时静默忽略，前端已移除
      }
    }
  }

  return {
    conversations, currentConversationId, messages, totalUnread,
    fetchConversations, fetchMessages, addMessage, markRead, deleteConversation
  }
})