/**
 * 账户中心全局态
 * - 账户分组列表 groups + 顶部 KPI + 失效提醒数（按当前平台 scope 收敛）
 * - 详情面板：点「详情」打开，取 last_sync / expire_at 等附属字段
 * - 解除授权：高风险操作（二次确认在页面层），落库后从列表移除并刷新 KPI
 *
 * 状态归并集中在此；组件只读状态、触发 action。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AccountGroup, AccountKpi, AccountDetail } from '@/types/accounts'
import { fetchAccounts, fetchAccountDetail, unlinkAccount } from '@/services/accounts'

export const useAccountsStore = defineStore('accounts', () => {
  /* ---------- 列表 ---------- */
  const groups = ref<AccountGroup[]>([])
  const kpis = ref<AccountKpi[]>([])
  /** 需重新授权账户数（失效提醒条） */
  const attentionCount = ref(0)
  const loading = ref(false)

  /* ---------- 详情面板 ---------- */
  const detailOpen = ref(false)
  const detailLoading = ref(false)
  const detail = ref<AccountDetail | null>(null)

  /** 拉账户列表（含 KPI / 失效提醒），按当前平台 scope */
  async function load() {
    loading.value = true
    const data = await fetchAccounts()
    groups.value = data.groups
    kpis.value = data.kpis
    attentionCount.value = data.attention_count
    loading.value = false
  }

  /** 打开账户详情面板 */
  async function openDetail(accountId: string) {
    detailOpen.value = true
    detailLoading.value = true
    detail.value = null
    const d = await fetchAccountDetail(accountId)
    detailLoading.value = false
    detail.value = d
  }

  function closeDetail() {
    detailOpen.value = false
    detail.value = null
  }

  /** 解除授权（二次确认后调用）；成功后移除条目并刷新汇总 */
  async function unlink(accountId: string): Promise<boolean> {
    const res = await unlinkAccount(accountId)
    if (res?.status === 'unlinked') {
      if (detail.value?.account_id === accountId) closeDetail()
      await load()
      return true
    }
    return false
  }

  return {
    groups,
    kpis,
    attentionCount,
    loading,
    detailOpen,
    detailLoading,
    detail,
    load,
    openDetail,
    closeDetail,
    unlink,
  }
})
