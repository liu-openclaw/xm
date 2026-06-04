import { ref, computed, type Ref } from 'vue'

interface VirtualListOptions {
  itemHeight: number
  overscan?: number
}

export function useVirtualList<T>(
  sourceList: Ref<T[]>,
  containerHeight: Ref<number>,
  options: VirtualListOptions
) {
  const scrollTop = ref(0)
  const { itemHeight, overscan = 5 } = options

  const totalHeight = computed(() => sourceList.value.length * itemHeight)

  const visibleCount = computed(() => Math.ceil(containerHeight.value / itemHeight) + overscan * 2)

  const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan))

  const visibleData = computed(() => {
    const start = startIndex.value
    const end = Math.min(sourceList.value.length, start + visibleCount.value)
    return sourceList.value.slice(start, end).map((item, index) => ({
      data: item,
      index: start + index,
      style: {
        position: 'absolute' as const,
        top: `${(start + index) * itemHeight}px`,
        width: '100%',
        height: `${itemHeight}px`
      }
    }))
  })

  function onScroll(e: Event) {
    const target = e.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  function scrollToIndex(index: number) {
    scrollTop.value = index * itemHeight
  }

  return {
    totalHeight,
    visibleData,
    onScroll,
    scrollToIndex,
    scrollTop
  }
}