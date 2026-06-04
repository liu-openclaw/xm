<template>
  <router-view />
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useWebSocket } from '@/composables/useWebSocket'
import { watch, onMounted } from 'vue'

const userStore = useUserStore()
const { connect, disconnect } = useWebSocket()

onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
    }
  }
})

// 登录后自动建立 WebSocket 连接，登出时断开
watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      connect()
    } else {
      disconnect()
    }
  },
  { immediate: true }
)
</script>