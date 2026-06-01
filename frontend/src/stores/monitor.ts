/**
 * 数据监控全局态（纯数据层 · 不做任何判断）
 * - view：list 账户列表 ↔ detail 账户详情下钻
 * - 列表：账户分组（按顶栏全局平台收敛）+ 24h 趋势
 * - 详情：3 tab（overview 概览 / retention 订单留存 / detail 数据明细），各 tab 数据按需加载
 * - 留存 cohort 双模式：days 注册日期×D0–D30 / date 绝对日期，可切换
 *
 * 状态归并集中在此 + service；组件只读状态、触发 action。
 * 平台 scope 取自全局 platformStore.current（顶栏全局平台，experience.md「平台全局化」）。
 * 本模块全程不引入任何判断字段（status/severity 等），判断收口到复盘 store。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePlatformStore } from './platform'
import {
  fetchAccounts,
  fetchDetail,
  fetchOverview,
  fetchRetention,
  fetchTrend,
} from '@/services/monitor'
import type {
  AccountOverview,
  AccountPlatformGroup,
  AccountRow,
  MonitorDetailData,
  MonitorRetentionData,
  MonitorTrendData,
  RetentionMode,
} from '@/types/monitor'

/** 详情 3 tab */
export type DetailTab = 'overview' | 'retention' | 'detail'

export const useMonitorStore = defineStore('monitor', () => {
  const platformStore = usePlatformStore()

  /* ---------- 视图：列表 / 详情 ---------- */
  const view = ref<'list' | 'detail'>('list')

  /* ---------- 列表数据 ---------- */
  const groups = ref<AccountPlatformGroup[]>([])
  const totalAccounts = ref(0)
  const totalPlatforms = ref(0)
  /** 账户表当前激活的平台 tab（列表内多平台时分开展示） */
  const activeGroupKey = ref<string>('juliang')
  const trend = ref<MonitorTrendData | null>(null)
  const listLoading = ref(false)

  /* ---------- 详情数据 ---------- */
  const activeAccount = ref<AccountRow | null>(null)
  const detailTab = ref<DetailTab>('overview')
  const overview = ref<AccountOverview | null>(null)
  const retention = ref<MonitorRetentionData | null>(null)
  const detailData = ref<MonitorDetailData | null>(null)
  /** 留存 cohort 模式（天数 / 日期） */
  const retentionMode = ref<RetentionMode>('days')
  /** 概览子表当前维度（广告组 / 投放计划 / 创意） */
  const subTableKey = ref<'group' | 'plan' | 'creative'>('group')
  const detailLoading = ref(false)

  /* ============================================================
   * 列表
   * ============================================================ */

  /** 加载账户列表 + 24h 趋势（按顶栏全局平台收敛） */
  async function loadList() {
    listLoading.value = true
    try {
      const [acc, tr] = await Promise.all([
        fetchAccounts(platformStore.current),
        fetchTrend('24h'),
      ])
      groups.value = acc.groups
      totalAccounts.value = acc.total_accounts
      totalPlatforms.value = acc.total_platforms
      trend.value = tr
      // 默认激活第一个分组
      activeGroupKey.value = acc.groups[0]?.platform.key ?? 'juliang'
    } finally {
      listLoading.value = false
    }
  }

  /** 切换账户表平台 tab */
  function selectGroup(key: string) {
    activeGroupKey.value = key
  }

  /* ============================================================
   * 详情下钻
   * ============================================================ */

  /** 点击账户行 → 进详情（默认概览 tab），并加载概览数据 */
  async function openDetail(row: AccountRow) {
    activeAccount.value = row
    view.value = 'detail'
    detailTab.value = 'overview'
    subTableKey.value = 'group'
    retentionMode.value = 'days'
    // 重置其他 tab 数据，避免串账户
    retention.value = null
    detailData.value = null
    window.scrollTo(0, 0)
    await loadOverview(row.account)
  }

  /** 返回列表 */
  function backToList() {
    view.value = 'list'
    activeAccount.value = null
  }

  /** 切换详情 tab（按需懒加载对应数据） */
  async function selectDetailTab(tab: DetailTab) {
    detailTab.value = tab
    const account = activeAccount.value?.account ?? 'A001'
    if (tab === 'overview' && !overview.value) await loadOverview(account)
    if (tab === 'retention' && !retention.value) await loadRetention(account)
    if (tab === 'detail' && !detailData.value) await loadDetail(account)
  }

  async function loadOverview(account: string) {
    detailLoading.value = true
    try {
      overview.value = await fetchOverview(account)
    } finally {
      detailLoading.value = false
    }
  }

  async function loadRetention(account: string) {
    detailLoading.value = true
    try {
      retention.value = await fetchRetention(account, retentionMode.value)
    } finally {
      detailLoading.value = false
    }
  }

  async function loadDetail(account: string) {
    detailLoading.value = true
    try {
      detailData.value = await fetchDetail(account, '14d')
    } finally {
      detailLoading.value = false
    }
  }

  /** 切换留存 cohort 模式（天数 / 日期），重新拉对应 cohort */
  async function setRetentionMode(mode: RetentionMode) {
    if (retentionMode.value === mode && retention.value) return
    retentionMode.value = mode
    const account = activeAccount.value?.account ?? 'A001'
    await loadRetention(account)
  }

  /** 切换概览子表维度（广告组 / 投放计划 / 创意） */
  function selectSubTable(key: 'group' | 'plan' | 'creative') {
    subTableKey.value = key
  }

  return {
    // view
    view,
    // list
    groups,
    totalAccounts,
    totalPlatforms,
    activeGroupKey,
    trend,
    listLoading,
    // detail
    activeAccount,
    detailTab,
    overview,
    retention,
    detailData,
    retentionMode,
    subTableKey,
    detailLoading,
    // actions
    loadList,
    selectGroup,
    openDetail,
    backToList,
    selectDetailTab,
    setRetentionMode,
    selectSubTable,
  }
})
