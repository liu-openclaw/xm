<template>
  <div class="goods-detail safe-top">
    <van-nav-bar title="商品详情" left-arrow @click-left="$router.back()" />

    <div class="detail-scroll" v-if="goods">
      <!-- 图片轮播 -->
      <van-swipe :autoplay="3000" indicator-color="#ff6b35" class="detail-swipe">
        <van-swipe-item v-for="(img, i) in goods.images" :key="i">
          <van-image :src="img" width="100%" height="300" fit="cover" />
        </van-swipe-item>
      </van-swipe>

      <!-- 商品信息 -->
      <div class="detail-info">
        <div class="detail-price">
          <span class="price">¥{{ goods.price }}</span>
          <span class="original" v-if="goods.originalPrice">¥{{ goods.originalPrice }}</span>
          <van-tag type="danger" size="medium">{{ goods.condition }}</van-tag>
        </div>
        <div class="detail-title">{{ goods.title }}</div>
        <div class="detail-meta">
          <span>浏览 {{ goods.viewCount }}</span>
          <span>· {{ goods.category }}</span>
          <span>· {{ goods.createdAt?.slice(0, 10) }}</span>
        </div>
      </div>

      <!-- 卖家信息 -->
      <van-cell-group title="卖家信息" class="detail-section">
        <van-cell :title="goods.seller?.nickname" label="">
          <template #icon>
            <van-image round width="36" height="36" :src="goods.seller?.avatar || ''" />
          </template>
          <template #right-icon>
            <van-button size="small" type="primary" round @click="goChat">联系卖家</van-button>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 商品描述 -->
      <div class="detail-section detail-desc">
        <h4>商品描述</h4>
        <p>{{ goods.description || '卖家很懒，没有留下描述~' }}</p>
      </div>

      <!-- 底部操作栏 -->
      <div class="detail-footer safe-bottom">
        <van-button plain icon="star-o" @click="collect">收藏</van-button>
        <van-button type="danger" round block @click="buyNow">立即购买</van-button>
      </div>
    </div>

    <van-skeleton title avatar :row="4" v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { goodsApi } from '@/api/goods'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/stores/user'
import { getAccessToken } from '@/utils/auth'
import { showToast, showDialog } from 'vant'
import type { GoodsItem } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const goods = ref<GoodsItem | null>(null)

async function fetchDetail() {
  const id = route.params.id as string
  goods.value = (await goodsApi.getDetail(id)).data
}

function goChat() {
  if (!goods.value) return

  // 未登录：跳转登录页，登录后回到当前商品详情页
  if (!getAccessToken()) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  // 已登录但用户信息尚未加载：先拉取再跳转
  if (!userStore.user) {
    userStore.fetchProfile().then(() => {
      const ids = [userStore.user!.id, goods.value!.seller._id].sort()
      router.push(`/chat/${ids[0]}_${ids[1]}`)
    }).catch(() => showToast('获取用户信息失败'))
    return
  }

  const ids = [userStore.user.id, goods.value.seller._id].sort()
  router.push(`/chat/${ids[0]}_${ids[1]}`)
}

function collect() {
  showToast('已收藏')
}

async function buyNow() {
  if (!goods.value) return
  try {
    await showDialog({
      title: '确认购买',
      message: `确认购买「${goods.value.title}」¥${goods.value.price}？`,
      confirmButtonText: '确认',
      confirmButtonColor: '#ff6b35'
    })
    const order = await orderApi.create({
      goodsId: goods.value._id,
      address: { name: '', phone: '', detail: '请完善收货地址' }
    })
    showToast('下单成功，请前往支付')
    router.push('/orders')
  } catch {
    // 用户取消
  }
}

onMounted(fetchDetail)
</script>

<style scoped>
.goods-detail {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 70px;
}
.detail-scroll {
  overflow-y: auto;
}
.detail-swipe {
  background: #fff;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}
.detail-info {
  background: #fff;
  padding: 18px 16px;
  margin: 0 12px 10px;
  border-radius: 14px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.detail-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.detail-price .price {
  font-size: 28px;
  color: #ff6b35;
  font-weight: 700;
}
.detail-price .original {
  font-size: 14px;
  color: #bbb;
  text-decoration: line-through;
}
.detail-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 10px;
}
.detail-meta {
  font-size: 12px;
  color: #aaa;
  display: flex;
  gap: 6px;
}
.detail-section {
  background: #fff;
  margin: 0 12px 10px;
  border-radius: 14px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.detail-section :deep(.van-cell-group__title) {
  padding: 14px 16px 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.detail-desc {
  padding: 16px;
}
.detail-desc h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}
.detail-desc p {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
}
.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 10px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.05);
  z-index: 100;
}
.detail-footer .van-button--danger {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  border: none;
  border-radius: 22px;
  height: 44px;
  font-size: 16px;
  letter-spacing: 1px;
}
.detail-footer .van-button--plain {
  border-radius: 22px;
  height: 44px;
  border-color: #e0e0e0;
}
</style>