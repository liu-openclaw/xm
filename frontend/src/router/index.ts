import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken } from '@/utils/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/login/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'),
    meta: { title: '闲趣二手' }
  },
  {
    path: '/goods/detail/:id',
    name: 'GoodsDetail',
    component: () => import('@/views/goods/GoodsDetail.vue'),
    meta: { title: '商品详情' }
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('@/views/publish/Publish.vue'),
    meta: { title: '发布商品', auth: true }
  },
  {
    path: '/chat',
    name: 'ChatList',
    component: () => import('@/views/chat/ChatList.vue'),
    meta: { title: '消息', auth: true }
  },
  {
    path: '/chat/:conversationId',
    name: 'Chat',
    component: () => import('@/views/chat/Chat.vue'),
    meta: { title: '聊天', auth: true }
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/order/OrderList.vue'),
    meta: { title: '订单', auth: true }
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('@/views/mine/Mine.vue'),
    meta: { title: '我的' }
  },
  {
    path: '/my-goods',
    name: 'MyGoods',
    component: () => import('@/views/mine/MyGoods.vue'),
    meta: { title: '我发布的商品', auth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  // 需要登录的页面
  if (to.meta.auth && !getAccessToken()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router