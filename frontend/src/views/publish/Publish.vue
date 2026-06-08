<template>
  <div class="publish-page safe-top">
    <van-nav-bar title="发布商品" left-arrow @click-left="$router.replace('/home')" />

    <van-form class="publish-form">
      <!-- 基本信息 -->
      <van-cell-group inset class="form-group">
        <van-field
          v-model="form.title"
          name="title"
          label="商品名称"
          placeholder="请输入商品名称"
          :rules="[{ required: true, message: '请输入商品名称' }]"
        />
        <van-field
          v-model="form.price"
          name="price"
          label="售价"
          placeholder="请输入价格"
          type="number"
          :rules="[{ required: true, message: '请输入售价' }]"
        >
          <template #left-icon>¥</template>
        </van-field>
        <van-field
          v-model="form.description"
          name="description"
          label="描述"
          type="textarea"
          rows="3"
          autosize
          placeholder="描述一下你的宝贝吧"
          maxlength="500"
          show-word-limit
          :rules="[{ required: true, message: '请输入商品描述' }]"
        />
      </van-cell-group>

      <!-- 分类 -->
      <van-cell-group inset title="商品分类" class="form-group">
        <div class="option-grid">
          <div
            v-for="cat in categories"
            :key="cat"
            class="option-item"
            :class="{ active: form.category === cat }"
            @click="form.category = cat"
          >
            {{ cat }}
          </div>
        </div>
      </van-cell-group>

      <!-- 成色 -->
      <van-cell-group inset title="商品成色" class="form-group">
        <div class="option-grid">
          <div
            v-for="c in conditions"
            :key="c"
            class="option-item"
            :class="{ active: form.condition === c }"
            @click="form.condition = c"
          >
            {{ c }}
          </div>
        </div>
      </van-cell-group>

      <!-- 图片上传 -->
      <van-cell-group inset title="商品图片（至少1张，最多6张）" class="form-group">
        <div class="upload-section">
          <van-uploader
            v-model="fileList"
            :max-count="6"
            :after-read="afterRead"
            accept="image/*"
            result-type="dataUrl"
            :preview-size="80"
            upload-text="上传图片"
          />
          <div class="ai-fill-row">
            <van-button
              size="small"
              type="warning"
              :loading="aiLoading"
              :disabled="fileList.length === 0"
              @click="aiFill"
            >
              AI 智能填写
            </van-button>
            <span class="ai-hint" v-if="!aiLoading">上传图片后点击，AI 自动生成商品信息</span>
            <span class="ai-hint loading" v-else>AI 正在分析图片...</span>
          </div>
          <p class="upload-hint">支持 JPG、PNG 格式，每张不超过 5MB</p>
        </div>
      </van-cell-group>

      <!-- 提交 -->
      <div class="submit-wrap">
        <van-button
          block
          type="primary"
          :loading="loading"
          class="submit-btn"
          @click="onSubmit"
        >
          立即发布
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { goodsApi } from '@/api/goods'
import { aiApi } from '@/api/ai'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const loading = ref(false)
const aiLoading = ref(false)
const fileList = ref<any[]>([])

const categories = ['数码', '家居', '服饰', '图书', '美妆', '运动', '其他']
const conditions = ['全新', '几乎全新', '轻微使用', '明显使用']

const form = reactive({
  title: '',
  price: '',
  description: '',
  category: '其他',
  condition: '轻微使用',
  images: [] as string[]
})

function afterRead(file: any) {
  form.images.push(file.content || file.url)
  file.status = 'done'
}

async function aiFill() {
  if (fileList.value.length === 0) {
    showToast('请先上传商品图片')
    return
  }

  aiLoading.value = true
  try {
    // 取第一张图片，dataUrl 转 File
    const firstFile = fileList.value[0]
    let imageFile: File

    if (firstFile.file) {
      imageFile = firstFile.file
    } else if (firstFile.content) {
      // dataUrl -> Blob -> File
      const arr = firstFile.content.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
      const bstr = atob(arr[1])
      const n = bstr.length
      const u8arr = new Uint8Array(n)
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i)
      }
      imageFile = new File([u8arr], 'product.jpg', { type: mime })
    } else {
      showToast('无法读取图片数据')
      return
    }

    const res = await aiApi.describe(imageFile)

    // 安全提取 data，防止 undefined 导致白色空框
    const data = res?.data
    if (!data) {
      showToast('AI 返回数据异常，请重试')
      return
    }

    if (data.title) form.title = data.title
    if (data.description) form.description = data.description
    if (data.category && categories.includes(data.category)) {
      form.category = data.category
    }
    if (data.condition && conditions.includes(data.condition)) {
      form.condition = data.condition
    }

    showToast('AI 智能填写完成')
  } catch (err: any) {
    // 优先提取后端返回的具体错误信息
    let errMsg = 'AI 分析失败，请重试'
    if (err?.response?.data) {
      const body = err.response.data
      errMsg = body.message || body.detail || errMsg
    } else if (err?.message) {
      errMsg = err.message
    }
    showToast(errMsg)
  } finally {
    aiLoading.value = false
  }
}

async function onSubmit() {
  // 手动校验必填项
  if (!form.title.trim()) return showToast('请输入商品名称')
  if (!form.price || Number(form.price) <= 0) return showToast('请输入有效售价')
  if (!form.description.trim()) return showToast('请输入商品描述')
  if (form.images.length === 0) return showToast('请上传至少一张图片')

  loading.value = true
  try {
    // AI 自动审核（失败不阻塞发布）
    let auditPassed = true
    try {
      const auditRes = await aiApi.audit({
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition
      })
      if (auditRes.data && !auditRes.data.passed) {
        auditPassed = false
        showDialog({
          title: '审核未通过',
          message: auditRes.data.reason || '请修改后重试',
          confirmButtonText: '知道了'
        })
      }
    } catch {
      // 审核服务不可用，默认放行
    }
    if (!auditPassed) {
      loading.value = false
      return
    }

    await goodsApi.create({
      ...form,
      price: Number(form.price)
    })
    showToast('发布成功')
    router.push('/home')
  } catch (err: any) {
    showDialog({
      title: '发布失败',
      message: err?.message || '未知错误',
      confirmButtonText: '知道了'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 30px;
}
.publish-form {
  padding-top: 10px;
}
.form-group {
  margin: 0 12px 14px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.form-group :deep(.van-cell-group__title) {
  padding: 14px 16px 4px;
  font-size: 13px;
  font-weight: 600;
  color: #999;
}
.form-group :deep(.van-cell) {
  padding: 14px 16px;
  font-size: 15px;
}
.form-group :deep(.van-field__control::placeholder) { color: #c0c0c0; }
.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 16px 16px;
}
.option-item {
  flex: 0 0 calc(33.333% - 7px);
  text-align: center;
  padding: 11px 0;
  font-size: 14px;
  color: #555;
  background: #f7f8fa;
  border-radius: 10px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.25s;
  box-sizing: border-box;
}
.option-item.active {
  color: #ff6b35;
  background: #fff7f3;
  border-color: #ff6b35;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255,107,53,0.15);
}
.upload-section {
  padding: 12px 16px 16px;
}
.upload-section :deep(.van-uploader__preview) { margin-bottom: 8px; }
.upload-section :deep(.van-uploader__preview-image) { border-radius: 10px; }
.upload-section :deep(.van-uploader__upload) {
  width: 82px;
  height: 82px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1.5px dashed #ddd;
}
.upload-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #bbb;
}
.ai-fill-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 12px;
  background: #fffbf0;
  border-radius: 10px;
  border: 1px solid #ffe9c7;
}
.ai-hint { font-size: 12px; color: #999; }
.ai-hint.loading { color: #ff6b35; }
.submit-wrap {
  padding: 24px 28px;
}
.submit-btn {
  height: 48px;
  font-size: 16px;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #ff6b35, #ff5e62);
  border: none;
  border-radius: 24px;
  box-shadow: 0 4px 14px rgba(255,107,53,0.35);
  transition: all 0.25s;
}
.submit-btn:active { transform: scale(0.97); opacity: 0.9; }
</style>