<template>
  <div class="mine-page safe-top">
    <!-- 用户头部 -->
    <div class="mine-header">
      <div class="header-bg"></div>
      <template v-if="userStore.isLoggedIn && userStore.user">
        <van-image round width="64" height="64" :src="userStore.user.avatar || ''" class="avatar" />
        <div class="user-info">
          <h3>{{ userStore.user.nickname }}</h3>
          <p>@{{ userStore.user.username }}</p>
        </div>
        <div class="header-edit" @click="$router.push('/publish')">
          <van-icon name="plus" size="18" />
        </div>
      </template>
      <template v-else>
        <van-image round width="64" height="64" src="" class="avatar" />
        <div class="user-info" @click="$router.push('/login')">
          <h3>点击登录</h3>
          <p>登录后可发布商品和聊天</p>
        </div>
      </template>
    </div>

    <!-- 数据概览 -->
    <div class="stats-row" v-if="userStore.isLoggedIn">
      <div class="stat-item" @click="$router.push('/orders')">
        <span class="stat-num">{{ stats.orders }}</span>
        <span class="stat-label">我的订单</span>
      </div>
      <div class="stat-item" @click="$router.push('/my-goods')">
        <span class="stat-num">{{ stats.goods }}</span>
        <span class="stat-label">已发布</span>
      </div>
      <div class="stat-item" @click="$router.push('/chat')">
        <span class="stat-num">{{ chatStore.totalUnread || 0 }}</span>
        <span class="stat-label">未读消息</span>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-card">
      <div class="menu-title">常用功能</div>
      <div class="menu-grid">
        <div class="menu-item" @click="$router.push('/orders')">
          <div class="menu-icon orders"><van-icon name="orders-o" size="22" /></div>
          <span>我的订单</span>
        </div>
        <div class="menu-item" @click="$router.push('/my-goods')">
          <div class="menu-icon goods"><van-icon name="shop-o" size="22" /></div>
          <span>我的商品</span>
        </div>
        <div class="menu-item" @click="$router.push('/publish')">
          <div class="menu-icon publish"><van-icon name="add-o" size="22" /></div>
          <span>发布商品</span>
        </div>
        <div class="menu-item" @click="$router.push('/chat')">
          <div class="menu-icon chat"><van-icon name="chat-o" size="22" /></div>
          <span>我的消息</span>
        </div>
      </div>
    </div>

    <div class="menu-card">
      <div class="menu-title">其他</div>
      <div class="menu-list">
        <div class="menu-row" @click="noop">
          <van-icon name="location-o" size="18" color="#666" />
          <span>收货地址</span>
          <van-icon name="arrow" size="14" color="#ccc" />
        </div>
        <div class="menu-row" @click="noop">
          <van-icon name="info-o" size="18" color="#666" />
          <span>关于我们</span>
          <van-icon name="arrow" size="14" color="#ccc" />
        </div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="logout-wrap" v-if="userStore.isLoggedIn">
      <van-button block round type="default" class="logout-btn" @click="onLogout">退出登录</van-button>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { showDialog, showToast } from 'vant'
import { orderApi } from '@/api/order'
import { goodsApi } from '@/api/goods'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const stats = ref({ orders: 0, goods: 0 })

async function fetchStats() {
  try {
    const [orderRes, goodsRes] = await Promise.all([
      orderApi.getList({ role: 'buyer' }),
      goodsApi.getMyGoods({ page: 1, pageSize: 1 })
    ])
    stats.value.orders = (orderRes as any).data?.total || 0
    stats.value.goods = (goodsRes as any).data?.total || 0
  } catch { /* 静默 */ }
}

function noop() {
  showToast('功能开发中')
}

async function onLogout() {
  try {
    await showDialog({ title: '提示', message: '确定退出登录吗？' })
    userStore.logout()
    router.push('/home')
  } catch {}
}

onMounted(() => { if (userStore.isLoggedIn) fetchStats() })
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 50px;
}

/* ===== 头部 ===== */
.mine-header {
  position: relative;
  padding: 32px 20px 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  overflow: hidden;
}
.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #ff6b35 0%, #ff5e62 40%, #ff8c5a 100%);
  border-radius: 0 0 24px 24px;
}
.header-bg::after {
  content: '';
  position: absolute;
  right: -40px;
  top: -30px;
  width: 160px;
  height: 160px;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}
.avatar {
  position: relative;
  z-index: 1;
  border: 3px solid rgba(255,255,255,0.5);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.user-info {
  position: relative;
  z-index: 1;
  flex: 1;
}
.user-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}
.user-info p {
  font-size: 13px;
  opacity: 0.75;
}
.header-edit {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.header-edit:active {
  background: rgba(255,255,255,0.4);
}

/* ===== 数据概览 ===== */
.stats-row {
  display: flex;
  margin: -16px 14px 14px;
  background: #fff;
  border-radius: 14px;
  padding: 18px 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  position: relative;
  z-index: 2;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s;
}
.stat-item:active {
  transform: scale(0.96);
}
.stat-item:not(:last-child) {
  border-right: 1px solid #f0f0f0;
}
.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #333;
}
.stat-label {
  font-size: 12px;
  color: #999;
}

/* ===== 菜单卡片 ===== */
.menu-card {
  background: #fff;
  border-radius: 14px;
  margin: 0 14px 12px;
  padding: 16px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.menu-title {
  font-size: 13px;
  color: #999;
  margin-bottom: 14px;
  font-weight: 500;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:active {
  background: #f5f6fa;
}
.menu-item span {
  font-size: 12px;
  color: #333;
}
.menu-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-icon.orders  { background: #e8f4ff; color: #1677ff; }
.menu-icon.goods   { background: #fff0e6; color: #ff6b35; }
.menu-icon.publish { background: #e6fffb; color: #13c2c2; }
.menu-icon.chat    { background: #f6f0ff; color: #722ed1; }

/* ===== 列表菜单 ===== */
.menu-list {
  display: flex;
  flex-direction: column;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 4px;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 8px;
}
.menu-row:not(:last-child) {
  border-bottom: 1px solid #f8f8f8;
}
.menu-row:active {
  background: #fafafa;
}
.menu-row span {
  flex: 1;
  font-size: 14px;
  color: #333;
}

/* ===== 退出 ===== */
.logout-wrap {
  padding: 24px 28px;
}
.logout-btn {
  height: 46px;
  border: 1px solid #e8e8e8;
  color: #999;
  font-size: 15px;
  border-radius: 23px;
  transition: all 0.2s;
}
.logout-btn:active {
  border-color: #ff6b35;
  color: #ff6b35;
}
</style>