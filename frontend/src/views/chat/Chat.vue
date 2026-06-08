<template>
  <div class="chat-page safe-top">
    <van-nav-bar
      :title="chatTitle"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <div v-if="!isAiMode" class="ai-help-btn" @click="onAiHelp">
          <span class="ai-help-icon">🤖</span>
          <span class="ai-help-text">AI 客服</span>
        </div>
      </template>
    </van-nav-bar>

    <!-- 消息列表 -->
    <div ref="msgContainer" class="msg-container">
      <div
        v-for="msg in messages"
        :key="msg._id"
        class="msg-item"
        :class="{
          'msg-right': msg.sender?._id === userId && !msg.isSystem,
          'msg-ai': msg.isAi,
          'msg-system': msg.isSystem
        }"
      >
        <van-image
          v-if="msg.sender?._id !== userId && msg.sender?._id !== 'ai-assistant' && !msg.isSystem"
          round
          width="32"
          height="32"
          :src="msg.sender?.avatar || ''"
          class="msg-avatar"
        />
        <div v-if="msg.sender?._id === 'ai-assistant'" class="ai-avatar">AI</div>
        <div v-if="msg.isSystem" class="system-card">{{ msg.content }}</div>
        <div
          v-if="!msg.isSystem"
          class="msg-bubble"
          :class="{
            'my-bubble': msg.sender?._id === userId,
            'ai-bubble': msg.isAi
          }"
        >
          {{ msg.content }}
        </div>
      </div>
    </div>

    <!-- 快捷问题 -->
    <div v-if="isAiMode" class="quick-questions">
      <span
        v-for="q in visibleQuestions"
        :key="q"
        class="quick-tag"
        @click="sendAiQuery(q)"
      >{{ q }}</span>
      <span
        v-if="quickQuestions.length > 2"
        class="quick-tag quick-toggle"
        @click="showAllQuestions = !showAllQuestions"
      >{{ showAllQuestions ? '收起' : '更多问题' }}</span>
    </div>

    <!-- 输入栏 -->
    <div class="chat-input safe-bottom">
      <div v-if="isAiMode" class="ai-tip">AI 智能助手，随时为您解答平台疑问</div>
      <div v-else class="ai-tip">点击右上角 🤖 AI 客服，让 AI 帮你分析对话</div>
      <div class="input-row">
        <input
          v-model="inputText"
          type="text"
          :placeholder="inputPlaceholder"
          class="msg-input"
          @keyup.enter="send"
        />
        <van-button size="small" type="primary" @click="send">发送</van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useWebSocket } from '@/composables/useWebSocket'
import { aiApi } from '@/api/ai'
import { showToast } from 'vant'

const route = useRoute()
const chatStore = useChatStore()
const userStore = useUserStore()
const { connect, joinConversation, sendMessage, connected } = useWebSocket()

const inputText = ref('')
const sessionId = ref('')  // AI 多轮对话 session
const msgContainer = ref<HTMLElement | null>(null)
const conversationId = computed(() => route.params.conversationId as string)
const messages = computed(() => chatStore.messages)
const userId = computed(() => userStore.user?.id)

const isAiMode = computed(() => route.query.ai === 'true')
const chatTitle = computed(() => isAiMode.value ? 'AI 智能助手' : '聊天')
const inputPlaceholder = computed(() =>
  isAiMode.value ? '输入您的问题...' : '输入消息...'
)

const quickQuestions = [
  '如何发布商品？',
  '商品审核不通过怎么办？',
  '如何申请退款？',
  '退款多久到账？',
  '运费由谁承担？',
  '如何联系卖家？',
  '账号被封怎么办？',
  '买家一直不确认收货？'
]

const showAllQuestions = ref(false)
const visibleQuestions = computed(() =>
  showAllQuestions.value ? quickQuestions : quickQuestions.slice(0, 2)
)

async function send() {
  if (!inputText.value.trim()) return

  // AI 模式下全部走 RAG
  if (isAiMode.value) {
    await sendAiQuery(inputText.value.trim())
    return
  }

  // 普通聊天模式
  if (!connected.value) {
    showToast('连接已断开，正在重连...')
    connect()
    return
  }

  const content = inputText.value.trim()
  const ids = conversationId.value.split('_')
  const receiverId = ids[0] === userId.value ? ids[1] : ids[0]

  inputText.value = ''

  try {
    const ack: any = await sendMessage({ receiverId, content })
    const msgId = ack?.messageId || Date.now().toString()
    chatStore.addMessage({
      _id: msgId,
      conversationId: conversationId.value,
      sender: { _id: userId.value, nickname: userStore.user?.nickname || '', avatar: userStore.user?.avatar || '' },
      receiver: receiverId,
      content,
      type: 'text',
      read: false,
      createdAt: new Date().toISOString()
    } as any)
    scrollBottom()
  } catch {
    inputText.value = content
    showToast('发送失败，请重试')
  }
}

async function sendAiQuery(question: string) {
  if (!question) {
    showToast('请输入要咨询的问题')
    return
  }

  // 添加用户消息
  chatStore.addMessage({
    _id: Date.now().toString(),
    conversationId: 'ai-assistant',
    sender: { _id: userId.value, nickname: userStore.user?.nickname || '', avatar: userStore.user?.avatar || '' },
    receiver: '',
    content: question,
    type: 'text',
    read: true,
    createdAt: new Date().toISOString()
  } as any)

  inputText.value = ''
  scrollBottom()

  // AI 占位消息
  const aiMsgId = (Date.now() + 1).toString()
  chatStore.addMessage({
    _id: aiMsgId,
    conversationId: 'ai-assistant',
    sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: '' },
    receiver: '',
    content: '正在思考...',
    type: 'text',
    read: true,
    isAi: true,
    createdAt: new Date().toISOString()
  } as any)
  scrollBottom()

  // 流式接收 AI 回复
  let fullContent = ''

  try {
    const response = await aiApi.ragQueryStream(question, sessionId.value)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta' && data.content) {
              fullContent += data.content
              updateMessageContent(aiMsgId, fullContent)
              await nextTick()
            } else if (data.type === 'error') {
              updateMessageContent(aiMsgId, data.message || 'AI 服务出错')
            }
          } catch {
            // 跳过解析失败的 data 行
          }
        }
      }
    }

    // 如果整个流结束后没有任何内容
    if (!fullContent) {
      updateMessageContent(aiMsgId, '抱歉，暂时无法回答这个问题。')
    }

    scrollBottom()
  } catch (e: any) {
    console.error('AI 流式查询失败:', e)
    updateMessageContent(aiMsgId, 'AI 助手暂不可用，请稍后重试')
    scrollBottom()
  }
}

function updateMessageContent(msgId: string, content: string) {
  const msgs = chatStore.messages
  const idx = msgs.findIndex(m => m._id === msgId)
  if (idx !== -1) {
    msgs.splice(idx, 1, { ...msgs[idx], content })
  }
}

async function onAiHelp() {
  try {
    const { showConfirmDialog } = await import('vant')
    await showConfirmDialog({
      title: 'AI 客服介入',
      message: '是否请求 AI 客服分析当前对话？',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch {
    // 用户取消
    return
  }

  // 取最近 20 条普通消息作为上下文
  const recentMsgs = chatStore.messages
    .filter(m => !m.isAi && !m.isSystem)
    .slice(-20)
    .map(m => ({
      sender: m.sender?.nickname || '用户',
      content: m.content,
      time: m.createdAt
    }))

  if (recentMsgs.length === 0) {
    showToast('暂无聊天记录可供分析')
    return
  }

  // 添加系统消息占位
  const sysMsgId = (Date.now() + 1).toString()
  chatStore.addMessage({
    _id: sysMsgId,
    conversationId: conversationId.value,
    sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: '' },
    receiver: '',
    content: 'AI 客服正在分析对话...',
    type: 'text',
    read: true,
    isSystem: true,
    createdAt: new Date().toISOString()
  } as any)
  scrollBottom()

  try {
    const res = await aiApi.aiAdvise(recentMsgs)
    const msgs = chatStore.messages
    const idx = msgs.findIndex(m => m._id === sysMsgId)
    if (idx !== -1) {
      msgs[idx] = { ...msgs[idx], content: res.data.answer || 'AI 客服暂时无法生成建议。' }
    }
    scrollBottom()
  } catch {
    const msgs = chatStore.messages
    const idx = msgs.findIndex(m => m._id === sysMsgId)
    if (idx !== -1) {
      msgs[idx] = { ...msgs[idx], content: 'AI 客服暂不可用，请稍后重试' }
    }
    scrollBottom()
  }
}

function scrollBottom() {
  nextTick(() => {
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    }
  })
}

async function initNormalMode() {
  await chatStore.fetchMessages(conversationId.value)
  connect()
  await new Promise<void>((resolve) => {
    if (connected.value) { resolve(); return }
    const timer = setInterval(() => {
      if (connected.value) { clearInterval(timer); resolve() }
    }, 100)
    setTimeout(() => { clearInterval(timer); resolve() }, 5000)
  })
  joinConversation(conversationId.value)
  chatStore.markRead(conversationId.value)
  scrollBottom()
}

onMounted(async () => {
  if (isAiMode.value) {
    // 生成唯一 session ID，用于多轮对话记忆
    sessionId.value = 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    // AI 模式：不加载历史消息，不连 WebSocket
    chatStore.currentConversationId = 'ai-assistant'
    // 清空并插入欢迎消息
    chatStore.messages.splice(0, chatStore.messages.length)
    chatStore.addMessage({
      _id: 'ai-welcome',
      conversationId: 'ai-assistant',
      sender: { _id: 'ai-assistant', nickname: 'AI 智能助手', avatar: '' },
      receiver: '',
      content: '您好，我是闲趣二手平台的智能助手，很高兴为您服务！您可以点击下方快捷问题，或者直接输入您想了解的问题。',
      type: 'text',
      read: true,
      isAi: true,
      createdAt: new Date().toISOString()
    } as any)
    scrollBottom()
    return
  }

  await initNormalMode()
})
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
}
.msg-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}
.msg-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}
.msg-right {
  flex-direction: row-reverse;
}
.msg-avatar {
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.msg-bubble {
  max-width: 72%;
  padding: 12px 16px;
  border-radius: 16px;
  background: #fff;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  position: relative;
}
.my-bubble {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.ai-bubble {
  background: #fff;
  color: #333;
  border: 1px solid #e8ecf1;
  border-bottom-left-radius: 6px;
}
.ai-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(22,119,255,0.3);
}
.msg-ai {
  justify-content: flex-start !important;
}
.msg-system {
  justify-content: center !important;
}
.system-card {
  background: #f0f7ff;
  border: 1px solid #bae0ff;
  border-radius: 12px;
  padding: 12px 18px;
  font-size: 13px;
  line-height: 1.7;
  color: #1d4ed8;
  max-width: 88%;
  white-space: pre-wrap;
}
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}
.quick-tag {
  display: inline-block;
  padding: 8px 16px;
  font-size: 13px;
  color: #1677ff;
  background: #f0f5ff;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  max-width: calc(50% - 12px);
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.quick-tag:active {
  background: #d6e4ff;
  border-color: #91caff;
}
.quick-toggle {
  color: #ff6b35;
  background: #fff7f3;
  font-weight: 500;
  border-color: #ffe0d3;
}
.quick-toggle:active {
  background: #ffe8dd;
}
.chat-input {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -1px 8px rgba(0,0,0,0.03);
}
.ai-tip {
  font-size: 11px;
  color: #aaa;
  padding: 0 0 8px 0;
  text-align: center;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.msg-input {
  flex: 1;
  height: 40px;
  border: 1.5px solid #e8e8e8;
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  outline: none;
  background: #f9fafb;
  transition: border-color 0.2s;
}
.msg-input:focus {
  border-color: #ff6b35;
  background: #fff;
}
.ai-help-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  cursor: pointer;
  user-select: none;
  box-shadow: 0 2px 6px rgba(22,119,255,0.3);
  transition: opacity 0.2s;
}
.ai-help-btn:active { opacity: 0.85; }
.ai-help-icon { font-size: 16px; }
.ai-help-text { font-size: 12px; color: #fff; font-weight: 500; }
</style>
