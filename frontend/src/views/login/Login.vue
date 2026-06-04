<template>
  <div class="auth-page">
    <div class="brand-zone">
      <div class="brand-icon">🔄</div>
      <h1 class="brand-title">闲趣二手</h1>
      <p class="brand-sub">发现好物，让闲置流转起来</p>
    </div>

    <div class="form-card">
      <van-form @submit="onSubmit">
        <van-cell-group inset class="field-group">
          <van-field
            v-model="form.username"
            name="username"
            placeholder="请输入用户名"
            left-icon="user-o"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            placeholder="请输入密码"
            left-icon="lock"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>
        <div class="verify-wrap">
          <SliderVerify @verified="sliderVerified = true" />
        </div>
        <div class="btn-wrap">
          <van-button block native-type="submit" :loading="loading" :disabled="!sliderVerified" class="submit-btn">
            登 录
          </van-button>
        </div>
      </van-form>
    </div>

    <div class="switch-link">
      还没有账号？<span class="link" @click="$router.push('/register')">立即注册</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'
import SliderVerify from '@/components/SliderVerify.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
const sliderVerified = ref(false)
const form = reactive({ username: '', password: '' })

async function onSubmit() {
  loading.value = true
  try {
    await userStore.login(form.username, form.password)
    showToast('登录成功')
    router.replace((route.query.redirect as string) || '/home')
  } catch (err: any) {
    showToast(err?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff8f5 0%, #f5f6fa 40%);
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}
.brand-zone { text-align: center; }
.brand-icon {
  font-size: 48px;
  margin-bottom: 12px;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.brand-title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
}
.brand-sub { font-size: 14px; color: #999; margin: 0; }
.form-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  padding: 24px 16px 14px;
}
.field-group { margin: 0; }
.field-group :deep(.van-cell) {
  padding: 15px 16px;
  font-size: 15px;
  border-radius: 10px;
  margin-bottom: 4px;
}
.field-group :deep(.van-field__left-icon) { color: #bfbfbf; font-size: 18px; margin-right: 12px; }
.field-group :deep(.van-field__control::placeholder) { color: #c0c0c0; }
.verify-wrap { padding: 10px 0 0; }
.btn-wrap { padding: 18px 0 10px; }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.submit-btn {
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  letter-spacing: 6px;
  background: linear-gradient(135deg, #ff6b35, #ff5e62);
  border: none;
  color: #fff;
  box-shadow: 0 4px 14px rgba(255,107,53,0.35);
  transition: all 0.25s;
}
.submit-btn:not(:disabled):active { transform: scale(0.97); opacity: 0.9; }
.switch-link { font-size: 14px; color: #999; }
.link { color: #ff6b35; font-weight: 600; cursor: pointer; }
</style>
