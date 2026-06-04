import request from '@/utils/request'
import type { ApiResponse, MessageItem, ConversationItem } from '@/types'

export const chatApi = {
  getConversations: () =>
    request.get<any, ApiResponse<ConversationItem[]>>('/chat/conversations'),

  getMessages: (conversationId: string, params?: { page?: number; pageSize?: number }) =>
    request.get<any, ApiResponse<{ total: number; list: MessageItem[] }>>(`/chat/messages/${conversationId}`, { params }),

  markRead: (conversationId: string) =>
    request.put(`/chat/messages/${conversationId}/read`),

  deleteConversation: (conversationId: string) =>
    request.delete(`/chat/conversations/${conversationId}`)
}

export const paymentApi = {
  create: (data: { orderNo: string; amount: number; subject: string }) =>
    request.post('/payment/create', data)
}