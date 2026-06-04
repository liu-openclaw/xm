import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import { getAccessToken } from '@/utils/auth'
import { useChatStore } from '@/stores/chat'
import type { MessageItem } from '@/types'

// 全局单例：所有 useWebSocket() 调用共享同一个 socket 和 connected 状态
let socket: Socket | null = null
const connected = ref(false)  // 改为模块级 ref，所有组件共享

export function useWebSocket() {
  /**
   * 建立 WebSocket 连接（幂等：已连接则直接返回，不重建）
   */
  function connect() {
    const token = getAccessToken()
    if (!token) return

    // 如果已有连接且处于连接状态，直接复用，不销毁重建
    if (socket?.connected) {
      connected.value = true
      return
    }

    // 如果 socket 存在但未连接（disconnected），先清理再重建
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }

    socket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10
    })

    socket.on('connect', () => {
      connected.value = true
      console.log('WebSocket 已连接')
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    // 接收新消息（在对话房间内）
    socket.on('newMessage', (msg: MessageItem) => {
      const chatStore = useChatStore()
      chatStore.addMessage(msg)
    })

    // 接收消息通知（不在对话房间时也能收到）
    socket.on('newMessageNotify', (msg: MessageItem) => {
      const chatStore = useChatStore()
      chatStore.addMessage(msg)
    })
  }

  function joinConversation(conversationId: string) {
    socket?.emit('joinConversation', conversationId)
  }

  function sendMessage(data: {
    receiverId: string
    content: string
    type?: string
    goodsTitle?: string
  }) {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('WebSocket 未连接'))
        return
      }
      socket.emit('sendMessage', data, (ack: any) => {
        if (ack?.success) resolve(ack)
        else reject(new Error(ack?.message || '发送失败'))
      })
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  return { connected, connect, disconnect, joinConversation, sendMessage }
}