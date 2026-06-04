<template>
  <div class="home-page">
    <div class="top-bar safe-top">
      <div class="top-title">闲趣二手</div>
      <div class="top-actions">
        <van-icon name="chat-o" size="22" @click="$router.push('/chat/list')" />
      </div>
    </div>

    <div class="search-row">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="搜索好物"
        background="transparent"
        @search="onSearch"
      />
    </div>

    <div class="category-bar">
      <span
        v-for="cat in categories"
        :key="cat"
        class="cat-chip"
        :class="{ active: activeCategory === cat }"
        @click="switchCategory(cat)"
      >{{ cat }}</span>
    </div>

    <div ref="containerRef" class="goods-container" @scroll="onScroll">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div class="waterfall">
          <div class="waterfall-col">
            <div
              v-for="item in leftList"
              :key="item._id"
              class="goods-card"
              @click="goDetail(item._id)"
            >
              <van-image
                :src="item.images?.[0] || ''"
                width="100%"
                :height="imgHeight(item._id)"
                fit="cover"
                lazy-load
                class="goods-img"
              />
              <div class="goods-body">
                <div class="goods-title">{{ item.title }}</div>
                <div class="goods-footer">
                  <span class="goods-price">¥{{ item.price }}</span>
                  <span class="goods-seller">{{ item.seller?.nickname }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="waterfall-col">
            <div
              v-for="item in rightList"
              :key="item._id"
              class="goods-card"
              @click="goDetail(item._id)"
            >
              <van-image
                :src="item.images?.[0] || ''"
                width="100%"
                :height="imgHeight(item._id)"
                fit="cover"
                lazy-load
                class="goods-img"
              />
              <div class="goods-body">
                <div class="goods-title">{{ item.title }}</div>
                <div class="goods-footer">
                  <span class="goods-price">¥{{ item.price }}</span>
                  <span class="goods-seller">{{ item.seller?.nickname }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </van-pull-refresh>
      <van-empty v-if="!loading && goodsList.length === 0" description="暂无商品" />
      <div v-if="loading" class="status-tip"><van-loading size="20" /> 加载中...</div>
      <div v-if="!hasMore && goodsList.length > 0" class="status-tip">— 已经到底了 —</div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { goodsApi } from '@/api/goods'
import { showToast } from 'vant'
import type { GoodsItem } from '@/types'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const keyword = ref('')
const activeCategory = ref('全部')
const goodsList = ref<GoodsItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const hasMore = ref(true)
const containerRef = ref<HTMLElement | null>(null)

const categories = ['全部', '数码', '家居', '服饰', '图书', '美妆', '运动', '其他']

const leftList = computed(() => goodsList.value.filter((_, i) => i % 2 === 0))
const rightList = computed(() => goodsList.value.filter((_, i) => i % 2 === 1))

function imgHeight(id: string): number {
  const h = [160, 210, 140, 180, 230, 150]
  return h[id ? id.charCodeAt(id.length - 1) % h.length : 0]
}

function onScroll(e: Event) {
  const t = e.target as HTMLElement
  if (t.scrollHeight - t.scrollTop - t.clientHeight < 120) loadMore()
}

async function loadGoods() {
  if (loading.value) return
  loading.value = true
  try {
    const res = await goodsApi.getList({
      page: page.value,
      pageSize: 20,
      category: activeCategory.value === '全部' ? '' : activeCategory.value,
      keyword: keyword.value
    })
    if (page.value === 1) goodsList.value = res.data.list
    else goodsList.value.push(...res.data.list)
    hasMore.value = res.data.list.length >= 20
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadGoods()
}

async function onRefresh() {
  page.value = 1
  goodsList.value = []
  hasMore.value = true
  await loadGoods()
  refreshing.value = false
}

function switchCategory(cat: string) {
  if (activeCategory.value === cat) return
  activeCategory.value = cat
  page.value = 1
  goodsList.value = []
  hasMore.value = true
  loadGoods()
}

function onSearch() {
  page.value = 1
  goodsList.value = []
  hasMore.value = true
  loadGoods()
}

function goDetail(id: string) {
  router.push(`/goods/detail/${id}`)
}

onMounted(() => loadGoods())
</script>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px 0;
  height: 48px;
  background: #fff;
}
.top-title {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.top-actions {
  display: flex;
  gap: 16px;
  color: #999;
  cursor: pointer;
}
.search-row {
  background: #fff;
  padding: 0 8px 6px;
}
.search-row :deep(.van-search) { padding: 4px 0; }
.search-row :deep(.van-search__content) {
  background: #f5f6fa;
  border-radius: 20px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.04);
}
.category-bar {
  display: flex;
  gap: 8px;
  padding: 4px 14px 12px;
  background: #fff;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}
.category-bar::-webkit-scrollbar { display: none; }
.cat-chip {
  flex-shrink: 0;
  padding: 6px 16px;
  font-size: 13px;
  color: #666;
  border-radius: 18px;
  background: #f0f1f5;
  transition: all 0.25s;
  cursor: pointer;
}
.cat-chip.active {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 3px 8px rgba(255,107,53,0.3);
}
.goods-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
}
.waterfall {
  display: flex;
  gap: 10px;
  padding-top: 10px;
}
.waterfall-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.goods-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform 0.18s;
  cursor: pointer;
}
.goods-card:active { transform: scale(0.965); }
.goods-img { display: block; background: #f2f3f5; }
.goods-body { padding: 10px 12px 12px; }
.goods-title {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.goods-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.goods-price { color: #ff6b35; font-size: 17px; font-weight: 700; }
.goods-seller { font-size: 11px; color: #bbb; }
.status-tip {
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: #bbb;
}
</style>
