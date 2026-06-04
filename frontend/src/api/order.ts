import request from '@/utils/request'
import type { ApiResponse, OrderItem } from '@/types'

export const orderApi = {
  create: (data: { goodsId: string; address: any }) =>
    request.post<any, ApiResponse<OrderItem>>('/orders', data),

  getList: (params: { role: string }) =>
    request.get<any, ApiResponse<{ list: OrderItem[] }>>('/orders', { params }),

  cancel: (orderId: string) =>
    request.put<any, ApiResponse<OrderItem>>(`/orders/${orderId}/cancel`)
}
