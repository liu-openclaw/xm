import request from '@/utils/request'
import type { ApiResponse, GoodsItem } from '@/types'

interface GoodsListResult {
  total: number
  list: GoodsItem[]
  page: number
  pageSize: number
}

export const goodsApi = {
  getList: (params: {
    page?: number
    pageSize?: number
    category?: string
    keyword?: string
    sort?: string
  }) => request.get<any, ApiResponse<GoodsListResult>>('/goods', { params }),

  getMyGoods: (params?: { page?: number; pageSize?: number }) =>
    request.get<any, ApiResponse<GoodsListResult>>('/goods/mine', { params }),

  getDetail: (id: string) =>
    request.get<any, ApiResponse<GoodsItem>>(`/goods/${id}`),

  create: (data: FormData | Record<string, any>) =>
    request.post<any, ApiResponse<GoodsItem>>('/goods', data),

  remove: (id: string) =>
    request.delete(`/goods/${id}`)
}