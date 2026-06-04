<template>
  <div class="my-goods-page safe-top">
    <van-nav-bar title="我发布的商品" left-arrow @click-left="$router.back()" />

    <!-- 商品列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div
          v-for="item in list"
          :key="item._id"
          class="goods-card"
          @click="$router.push(`/goods/detail/${item._id}`)"
        >
          <van-image
            :src="item.images[0] || ''"
            width="100"
            height="100"
            fit="cover"
            class="goods-img"
          />
          <div class="goods-info">
            <h4 class="goods-title">{{ item.title }}</h4>
            <p class="goods-desc">{{ item.description }}</p>
            <div class="goods-bottom">
              <span class="goods-price">&yen;{{ item.price }}</span>
              <span class="goods-status" :class="statusClass(item.status)">
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <!-- 空状态 -->
    <van-empty v-if="!loading && list.length === 0" description="还没有发布商品" />

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { goodsApi } from '@/api/goods'
import type { GoodsItem } from '@/types'
import TabBar from '@/components/TabBar.vue'

const list = ref<GoodsItem[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
let page = 1

function statusClass(status: string) {
  return {
    'status-on': status === '在售',
    'status-sold': status === '已售',
    'status-off': status === '下架'
  }
}

async function onLoad() {
  loading.value = true
  try {
    const res = await goodsApi.getMyGoods({ page, pageSize: 20 })
    list.value.push(...res.data.list)
    finished.value = list.value.length >= res.data.total
    page++
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page = 1
  finished.value = false
  try {
    const res = await goodsApi.getMyGoods({ page, pageSize: 20 })
    list.value = res.data.list
    finished.value = list.value.length >= res.data.total
    page++
  } catch {
    // ignore
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.my-goods-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 50px;
}
.goods-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  margin: 8px 12px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.15s;
}
.goods-card:active { transform: scale(0.98); }
.goods-img {
  flex-shrink: 0;
  border-radius: 10px;
}
.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}
.goods-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-desc {
  font-size: 12px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 4px 0;
}
.goods-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goods-price {
  color: #ff6b35;
  font-size: 17px;
  font-weight: 700;
}
.goods-status {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.status-on {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-sold {
  background: #fff3e0;
  color: #e65100;
}
.status-off {
  background: #f5f5f5;
  color: #999;
}
</style>