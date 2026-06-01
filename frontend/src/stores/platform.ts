/**
 * 平台全局态
 * - localStorage key: squirrel_platform，默认 juliang
 * - 平台元信息（消耗分布 / 是否可切 all）来自 GET /api/platforms
 * - 非 admin 选 all 被拦：selectPlatform 返回 { ok:false } 供 UI 提示「无权」
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlatformKey, PlatformOption, PlatformStat } from '@/types/platform'
import { getStoredPlatform, setStoredPlatform } from '@/utils/storage'
import { fetchPlatforms } from '@/services/platform'
import { useAuthStore } from './auth'

/** 顶栏平台下拉项（含原型徽标点颜色，对齐 renderShell 平台菜单） */
export const PLATFORM_OPTIONS: PlatformOption[] = [
  { key: 'juliang', name: '巨量引擎', dotColor: '#FF4D4F' },
  { key: 'kuaishou', name: '磁力引擎', dotColor: '#FF6A00' },
  { key: 'tencent', name: '腾讯广告', dotColor: '#0052D9' },
  { key: 'all', name: '全平台汇总', dotColor: '', managerOnly: true },
]

export interface SelectPlatformResult {
  ok: boolean
  /** 被拦原因（无权时给文案） */
  reason?: string
}

export const usePlatformStore = defineStore('platform', () => {
  const current = ref<PlatformKey>(getStoredPlatform())
  const stats = ref<PlatformStat[]>([])
  const totalSpend = ref(0)
  /** 是否可切「全平台汇总」（仅 admin），来自接口 */
  const canSwitchAll = ref(false)

  const options = computed(() => PLATFORM_OPTIONS)
  const currentOption = computed(
    () => PLATFORM_OPTIONS.find((p) => p.key === current.value) ?? PLATFORM_OPTIONS[0]
  )

  /** 拉平台元信息并刷新 canSwitchAll */
  async function loadPlatforms() {
    const auth = useAuthStore()
    const data = await fetchPlatforms(auth.user)
    stats.value = data.platforms
    totalSpend.value = data.total_spend
    canSwitchAll.value = data.can_switch_all
    // 修正越权遗留态：非 admin 若 localStorage 残留 all，回退默认平台
    if (current.value === 'all' && !canSwitchAll.value) {
      setPlatform('juliang')
    }
    return data
  }

  /** 直接设置（内部用），持久化 localStorage */
  function setPlatform(platform: PlatformKey) {
    current.value = platform
    setStoredPlatform(platform)
  }

  /**
   * 用户切换平台（含权限拦截）。
   * 非 admin 选 all → 拦截，返回 ok:false + 文案；不改变当前平台。
   */
  function selectPlatform(platform: PlatformKey): SelectPlatformResult {
    if (platform === 'all' && !canSwitchAll.value) {
      return { ok: false, reason: '仅投放主管可切换「全平台汇总」视角' }
    }
    setPlatform(platform)
    return { ok: true }
  }

  return {
    current,
    stats,
    totalSpend,
    canSwitchAll,
    options,
    currentOption,
    loadPlatforms,
    setPlatform,
    selectPlatform,
  }
})
