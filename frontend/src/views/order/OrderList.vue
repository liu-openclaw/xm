<template>
  <div class="order-page safe-top">
    <van-nav-bar title="我的订单" left-arrow @click-left="$router.back()" />

    <van-tabs v-model:active="activeTab">
      <van-tab title="我买的" name="buyer" />
      <van-tab title="我卖的" name="seller" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="order-list" v-if="orders.length > 0">
        <div
          v-for="order in orders"
          :key="order._id"
          class="order-card"
        >
          <div class="order-header">
            <span>订单号：{{ order.orderNo }}</span>
            <van-tag
              :type="statusType(order.status)"
              size="small"
            >{{ order.status }}</van-tag>
          </div>
          <div class="order-body">
            <van-image
              :src="order.goods?.images?.[0] || ''"
              width="72"
              height="72"
              fit="cover"
              radius="6"
            />
            <div class="order-info">
              <div class="order-title ellipsis-2">{{ order.goods?.title }}</div>
              <div class="order-price">¥{{ order.amount }}</div>
            </div>
          </div>
          <div class="order-actions" v-if="order.status === '待付款'">
            <van-button size="small" plain type="danger" @click.stop="cancelOrder(order)">取消</van-button>
            <van-button v-if="activeTab === 'buyer'" size="small" type="primary" @click.stop="goPay(order)">去支付</van-button>
          </div>
        </div>
      </div>
      <van-empty v-else description="暂无订单" />
    </van-pull-refresh>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { orderApi } from '@/api/order'
import { paymentApi } from '@/api/chat'
import { showToast, showDialog } from 'vant'
import type { OrderItem } from '@/types'
import TabBar from '@/components/TabBar.vue'

const activeTab = ref('buyer')
const refreshing = ref(false)
const orders = ref<OrderItem[]>([])

function statusType(status: string) {
  const map: Record<string, string> = {
    '待付款': 'warning',
    '已付款': 'primary',
    '已发货': 'success',
    '已完成': '',
    '已取消': 'default'
  }
  return map[status] || ''
}

async function fetchOrders() {
  const res = await orderApi.getList({ role: activeTab.value })
  orders.value = res.data.list
}

watch(activeTab, () => fetchOrders())

function onRefresh() {
  fetchOrders().then(() => { refreshing.value = false })
}

async function goPay(order: OrderItem) {
  try {
    const res = await paymentApi.create({
      orderNo: order.orderNo,
      amount: order.amount,
      subject: order.goods?.title || '二手商品'
    })
    const payUrl = (res as any).data?.payUrl
    if (payUrl) {
      window.location.href = payUrl
    } else {
      showToast('获取支付链接失败')
    }
  } catch {
    showToast('支付请求失败')
  }
}

async function cancelOrder(order: OrderItem) {
  try {
    await showDialog({ title: '取消订单', message: '确定要取消该订单吗？' })
    await orderApi.cancel(order._id)
    showToast('已取消')
    fetchOrders()
  } catch { /* 用户取消或请求失败 */ }
}

onMounted(fetchOrders)
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 50px;
}
.order-list {
  padding: 10px;
}
.order-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f8f8f8;
}
.order-body {
  display: flex;
  gap: 12px;
}
.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.order-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.5;
}
.order-price {
  font-size: 18px;
  color: #ff6b35;
  font-weight: 700;
}
.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f8f8f8;
}
.order-actions .van-button--plain {
  border-radius: 18px;
  height: 34px;
}
.order-actions .van-button--primary {
  border-radius: 18px;
  height: 34px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  border: none;
}
</style>