<template>
  <div class="slider-verify" :class="{ 'slider-success': verified }">
    <div class="slider-track">
      <div class="slider-bg" :style="{ width: bgWidth + 'px' }"></div>
      <div
        class="slider-btn"
        :style="{ left: btnLeft + 'px' }"
        @touchstart="onStart"
        @touchmove="onMove"
        @touchend="onEnd"
        @mousedown="onStart"
      >
        <span class="slider-arrow">{{ verified ? '✓' : '→' }}</span>
      </div>
      <span class="slider-text" v-if="!verified">请按住滑块拖动到最右边</span>
      <span class="slider-text success-text" v-else>验证通过</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{ verified: [] }>()

const verified = ref(false)
const btnLeft = ref(0)
const trackWidth = ref(300)
const maxLeft = computed(() => trackWidth.value - 44)
const bgWidth = computed(() => btnLeft.value)

let dragging = false

function onStart(e: MouseEvent | TouchEvent) {
  if (verified.value) return
  dragging = true
  const el = (e.target as HTMLElement).closest('.slider-track') as HTMLElement
  if (el) trackWidth.value = el.clientWidth
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onEnd)
}

function onMove(e: MouseEvent | TouchEvent) {
  if (!dragging || verified.value) return
  e.preventDefault()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const track = (e.target as HTMLElement).closest('.slider-track')
  if (!track) return
  const rect = track.getBoundingClientRect()
  let left = clientX - rect.left - 22
  if (left < 0) left = 0
  if (left > maxLeft.value) left = maxLeft.value
  btnLeft.value = left

  if (left >= maxLeft.value) {
    dragging = false
    verified.value = true
    btnLeft.value = maxLeft.value
    emit('verified')
    cleanup()
  }
}

function onEnd() {
  if (!verified.value) {
    btnLeft.value = 0
  }
  dragging = false
  cleanup()
}

function cleanup() {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onEnd)
  document.removeEventListener('touchmove', onMove)
  document.removeEventListener('touchend', onEnd)
}
</script>

<style scoped>
.slider-verify {
  margin-bottom: 8px;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 44px;
  background: #eee;
  border-radius: 22px;
  overflow: hidden;
  user-select: none;
}

.slider-bg {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #ff6b35, #ff8c5a);
  border-radius: 22px 0 0 22px;
  transition: width 0.1s;
}

.slider-btn {
  position: absolute;
  top: 2px;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: none;
}
.slider-btn:active { cursor: grabbing; }

.slider-arrow {
  color: #ff6b35;
  font-size: 16px;
  font-weight: bold;
}

.slider-text {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #999;
  pointer-events: none;
  z-index: 1;
}

.success-text {
  color: #fff;
}

.slider-success .slider-track {
  background: linear-gradient(90deg, #ff6b35, #ff8c5a);
}
.slider-success .slider-btn {
  background: #fff;
}
</style>
