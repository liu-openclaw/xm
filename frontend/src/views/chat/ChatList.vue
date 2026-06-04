<template>
  <div class="chat-list-page safe-top">
    <van-nav-bar title="消息" fixed placeholder />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div v-if="conversations.length === 0 && !refreshing" class="empty-wrap">
        <div class="empty-content">
          <div class="empty-icon">💬</div>
          <p class="empty-text">暂无消息</p>
          <p class="empty-sub">去逛逛商品，找卖家聊聊吧</p>
        </div>
      </div>

      <div class="conv-list" v-else>
        <template v-for="conv in conversations" :key="conv._id">
          <!-- AI 助手条目 -->
          <div
            v-if="conv._id === 'ai-assistant'"
            class="conv-card ai-card"
            @click="goChat(conv._id)"
          >
            <div class="conv-avatar ai-avatar">🤖</div>
            <div class="conv-body">
              <div class="conv-top">
                <span class="conv-name">AI 智能助手</span>
              </div>
              <span class="conv-msg">{{ conv.lastMessage?.content }}</span>
            </div>
          </div>

          <!-- 普通会话 -->
          <van-swipe-cell v-else :right-width="70">
            <div class="conv-card" @click="goChat(conv._id)">
              <div class="conv-avatar">
                <van-image round width="48" height="48" :src="conv.lastMessage?.sender?.avatar || ''" />
                <span class="badge-dot" v-if="conv.unreadCount"></span>
              </div>
              <div class="conv-body">
                <div class="conv-top">
                  <span class="conv-name">{{ conv.lastMessage?.sender?.nickname || '用户' }}</span>
                </div>
                <span class="conv-msg">{{ conv.lastMessage?.content }}</span>
              </div>
              <div class="conv-meta" v-if="conv.unreadCount">
                <span class="unread-badge">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span>
              </div>
            </div>
            <template #right>
              <div class="delete-btn" @click.stop="onDeleteConv(conv._id, conv.lastMessage?.sender?.nickname || '用户')">
                删除
              </div>
            </template>
          </van-swipe-cell>
        </template>
      </div>
    </van-pull-refresh>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useWebSocket } from '@/composables/useWebSocket'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()
const refreshing = ref(false)

const conversations = computed(() => chatStore.conversations)

const { connected, connect } = useWebSocket()

function goChat(conversationId: string) {
  if (conversationId === 'ai-assistant') {
    router.push('/chat/ai-assistant?ai=true')
  } else {
    router.push(`/chat/${conversationId}`)
  }
}

async function onDeleteConv(convId: string, nickname: string) {
  try {
    await showDialog({
      title: '确认删除',
      message: `确定删除与「${nickname}」的会话吗？删除后将无法恢复。`,
      confirmButtonColor: '#ee0a24'
    })
    await chatStore.deleteConversation(convId)
  } catch {
    // 用户取消
  }
}

async function onRefresh() {
  await chatStore.fetchConversations()
  refreshing.value = false
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      await chatStore.fetchConversations()
    } catch {
      // 静默
    }
  }
  ensureAiEntry()
  if (!connected.value && userStore.isLoggedIn) connect()
})

function ensureAiEntry() {
  const aiConv = {
    _id: 'ai-assistant',
    lastMessage: {
      sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: '' },
      content: '随时为您解答平台疑问'
    },
    unreadCount: 0
  } as any
  const existing = chatStore.conversations.find(c => c._id === 'ai-assistant')
  if (!existing) {
    chatStore.conversations.unshift(aiConv)
  }
}
</script>

<style scoped>
.chat-list-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 50px;
}

/* ===== 空状态 ===== */
.empty-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 160px);
}
.empty-content {
  text-align: center;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 6px;
}
.empty-sub {
  font-size: 13px;
  color: #bbb;
}

/* ===== 会话列表 ===== */
.conv-list {
  padding: 8px 14px;
}

/* ===== 会话卡片 ===== */
.conv-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  margin-bottom: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}
.conv-card:active {
  transform: scale(0.985);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

/* ===== AI 卡片 ===== */
.ai-card {
  background: linear-gradient(135deg, #f0f5ff, #e8f4ff);
  border: 1px solid #d6e4ff;
}
.ai-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

/* ===== 头像 ===== */
.conv-avatar {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
}
.badge-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #ee0a24;
  border-radius: 50%;
  border: 2px solid #fff;
}

/* ===== 正文 ===== */
.conv-body {
  flex: 1;
  min-width: 0;
}
.conv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.conv-name {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
}
.conv-msg {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* ===== 右侧元数据 ===== */
.conv-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.unread-badge {
  background: #ee0a24;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  padding: 0 5px;
}

/* ===== 删除按钮 ===== */
.delete-btn {
  width: 70px;
  height: 100%;
  background: #ee0a24;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  border-radius: 14px;
  margin-left: 6px;
}
</style>