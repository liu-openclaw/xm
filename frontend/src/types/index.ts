// 商品
export interface GoodsItem {
  _id: string
  title: string
  description: string
  price: number
  originalPrice: number
  category: string
  images: string[]
  condition: string
  status: string
  seller: { _id: string; nickname: string; avatar: string }
  viewCount: number
  likeCount: number
  createdAt: string
}

// 用户
export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
  phone: string
}

// 订单
export interface OrderItem {
  _id: string
  orderNo: string
  buyer: UserInfo
  seller: UserInfo
  goods: GoodsItem
  amount: number
  status: string
  alipayTradeNo: string
  address: { name: string; phone: string; detail: string }
  createdAt: string
}

// 消息
export interface MessageItem {
  _id: string
  conversationId: string
  sender: { _id: string; nickname: string; avatar: string }
  receiver: string
  content: string
  type: 'text' | 'image'
  read: boolean
  createdAt: string
  isAi?: boolean
  isSystem?: boolean
}

// 会话
export interface ConversationItem {
  _id: string
  lastMessage: MessageItem
  unreadCount: number
}

// API 响应
export interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}