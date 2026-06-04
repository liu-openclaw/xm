<template>
  <div class="tabbar">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tabbar-item"
      :class="{ active: activeTab === tab.name }"
      @click="onTabClick(tab)"
    >
      <van-badge :content="tab.badge" :show-zero="false" v-if="tab.badge && tab.badge > 0">
        <van-icon :name="tab.icon" size="22" />
      </van-badge>
      <van-icon :name="tab.icon" size="22" v-else />
      <span class="tab-label">{{ tab.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()

const tabs = [
  { name: 'home', label: '首页', icon: 'home-o', path: '/home' },
  { name: 'publish', label: '发布', icon: 'add-o', path: '/publish' },
  {
    name: 'chat',
    label: '消息',
    icon: 'chat-o',
    path: '/chat',
    badge: chatStore.totalUnread
  },
  { name: 'mine', label: '我的', icon: 'user-o', path: '/mine' }
]

const activeTab = computed(() => {
  const path = route.path
  // /chat/:id 也属于消息 tab
  if (path.startsWith('/chat')) return 'chat'
  if (path.startsWith('/goods')) return 'home'
  const tab = tabs.find(t => t.path === path)
  return tab ? tab.name : 'home'
})

function onTabClick(tab: (typeof tabs)[number]) {
  if (activeTab.value === tab.name && route.path === tab.path) return
  router.push(tab.path)
}
</script>

<style scoped>
.tabbar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 50px;
  background: #fff;
  border-top: 1px solid #eee;
  padding-bottom: env(safe-area-inset-bottom, 0);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
}
.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #999;
  font-size: 10px;
  cursor: pointer;
  flex: 1;
  padding: 4px 0;
}
.tabbar-item.active {
  color: #ff6b35;
}
.tab-label {
  font-size: 10px;
}
</style>