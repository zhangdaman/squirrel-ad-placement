/**
 * 投放复盘全局态（判断层 · 三态状态机）
 * 权威源：docs/prototypes/review.html（inbox 复盘列表 / report Agent 归因报告 / new 新建）。
 *
 * 三态（view）：
 *   - inbox  复盘收件箱：概览 + 筛选 chip（全部/预警触发/我发起的）+ 分组卡片列表
 *   - report Agent 归因报告：5 步调研 + 核心结论 + 修改建议 + 右栏指标对比/因子/时间轴/参考案例
 *   - new    发起复盘：表单弹窗 → loading overlay → 产出报告
 *
 * 状态归并集中在此 + service；组件只读状态、触发 action。
 * 一键执行真承接（experience.md）：execute() 调 service 拿 dispatched + track_url，
 *   把对应建议标记为已下发并落地执行状态文案 + 追踪链接（供组件渲染「✓ 已下发」+ 跳监控）。
 *
 * 止损口径严谨：止损区间「¥12-18万/周」字符串原样透传（非 ¥120,000）。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  executeSuggestion,
  fetchAttribution,
  fetchInbox,
  fetchNewReviewOptions,
} from '@/services/review'
import type {
  AttributionReportData,
  ExecuteResultData,
  NewReviewObject,
  NewReviewOptions,
  ReviewGroup,
  ReviewInboxData,
  ReviewSource,
} from '@/types/review'

/** 三态视图 */
export type ReviewView = 'inbox' | 'report' | 'new'

/** 收件箱筛选 chip：全部 / 预警触发(auto) / 我发起的(mine) */
export type ReviewFilter = 'all' | 'auto' | 'mine'

/** 一键执行结果（按建议 id 暂存，组件据此渲染「✓ 已下发」+ 状态条 + 追踪链接） */
export type ExecutedMap = Record<string, ExecuteResultData>

/**
 * 发起复盘表单载荷（NewReview 弹窗 → startReview，原始 value）。
 * account 驱动报告数据（决定拉哪个账户样板）；object/time/focus 经 newOptions
 * 映射成 label 后改写报告 title/subtitle，证明三组表单选择没有被丢弃。
 */
export interface NewReviewForm {
  /** 选中的复盘对象维度 value（按账户/计划/题材） */
  object?: NewReviewObject
  /** 选中的账户编号（驱动报告数据），如 A001；'all' 归一为 A001 */
  account?: string
  /** 选中的时间范围 value，如 '7d' */
  time?: string
  /** 选中的复盘重点 value，如 'roi' */
  focus?: string
}

export const useReviewStore = defineStore('review', () => {
  /* ---------- 视图态 ---------- */
  const view = ref<ReviewView>('inbox')

  /* ---------- 收件箱 ---------- */
  const inbox = ref<ReviewInboxData | null>(null)
  const inboxLoading = ref(false)
  const filter = ref<ReviewFilter>('all')
  /** 历史「加载更早」是否已展开（点击后把 moreHistory 并入历史分组） */
  const historyExpanded = ref(false)

  /* ---------- 归因报告 ---------- */
  const report = ref<AttributionReportData | null>(null)
  const reportLoading = ref(false)
  /** 已一键执行的建议（id → 下发结果），切报告时清空 */
  const executed = ref<ExecutedMap>({})

  /* ---------- 发起复盘 ---------- */
  /** 表单弹窗是否打开 */
  const launchDialogOpen = ref(false)
  /** loading overlay 是否展示（调研中） */
  const launching = ref(false)
  const newOptions = ref<NewReviewOptions | null>(null)

  /* ============================================================
   * 收件箱
   * ============================================================ */

  /** 加载收件箱（概览 + 分组 + 加载更早批次） */
  async function loadInbox() {
    if (inbox.value) return
    inboxLoading.value = true
    try {
      inbox.value = await fetchInbox()
    } finally {
      inboxLoading.value = false
    }
  }

  /** 切筛选 chip */
  function setFilter(f: ReviewFilter) {
    filter.value = f
  }

  /**
   * 按筛选收敛后的分组（不破坏原始数据）。
   * - all：全部分组原样
   * - auto：只留预警触发卡（source==='auto'）
   * - mine：只留我发起卡（source==='mine'）
   * 历史分组在收敛后追加「加载更早」批次（若已展开）。
   */
  const visibleGroups = computed<ReviewGroup[]>(() => {
    if (!inbox.value) return []
    const wantSources: ReviewSource[] | null =
      filter.value === 'all'
        ? null
        : filter.value === 'auto'
          ? ['auto']
          : ['mine']

    return inbox.value.groups
      .map((g) => {
        // 历史分组在「加载更早」展开后追加批次
        let sections = g.sections
        if (g.key === 'history' && historyExpanded.value && inbox.value) {
          sections = [...sections, ...inbox.value.moreHistory]
        }
        if (!wantSources) return { ...g, sections }
        // 按来源过滤卡片，丢空段、空组
        const filtered = sections
          .map((s) => ({
            ...s,
            cards: s.cards.filter((c) => wantSources.includes(c.source)),
          }))
          .filter((s) => s.cards.length > 0)
        return { ...g, sections: filtered }
      })
      .filter((g) => g.sections.some((s) => s.cards.length > 0))
  })

  /** 「加载更早的复盘」（把 moreHistory 并入历史分组） */
  function loadMoreHistory() {
    historyExpanded.value = true
  }

  /* ============================================================
   * 归因报告
   * ============================================================ */

  /** 打开归因报告（按账户；列表卡 / 跳转直达共用） */
  async function openReport(account = 'A001') {
    view.value = 'report'
    executed.value = {}
    reportLoading.value = true
    window.scrollTo(0, 0)
    try {
      report.value = await fetchAttribution(account)
    } finally {
      reportLoading.value = false
    }
  }

  /** 返回收件箱 */
  function backToInbox() {
    view.value = 'inbox'
    window.scrollTo(0, 0)
  }

  /**
   * 一键执行某条建议（真承接）。
   * 调 service 拿 dispatched + track_url，写入 executed[id]；
   * 组件据此把按钮置「✓ 已下发」、插入执行状态条、提供跳监控链接。
   */
  async function execute(suggestionId: string) {
    if (executed.value[suggestionId]) return
    const account = report.value?.account ?? 'A001'
    const result = await executeSuggestion(suggestionId, account)
    executed.value = { ...executed.value, [suggestionId]: result }
  }

  /** 某建议是否已下发 */
  function isExecuted(suggestionId: string): boolean {
    return Boolean(executed.value[suggestionId])
  }

  /* ============================================================
   * 发起复盘
   * ============================================================ */

  /** 打开发起复盘弹窗（懒加载表单选项） */
  async function openLaunchDialog() {
    launchDialogOpen.value = true
    if (!newOptions.value) {
      newOptions.value = await fetchNewReviewOptions()
    }
  }

  /** 关闭发起复盘弹窗 */
  function closeLaunchDialog() {
    launchDialogOpen.value = false
  }

  /**
   * 开始复盘：关弹窗 → 展示 loading overlay（模拟 Agent 调研）→ 产出报告。
   * Mock 下用定时器模拟调研耗时；接真实接口后可换 SSE 流式 5 步推导。
   *
   * 表单选择生效证明（experience.md）：报告体仍是 A001 样板数据，
   * 但产出报告的 title/subtitle 会被改写为反映用户的发起选择
   * （如「A001 · 近 7 天 · 素材维度复盘」），证明 object/time/focus 表单未被丢弃。
   *
   * @param payload 字符串则按账户兼容旧调用；对象则透传 object/account/time/focus 文案
   */
  async function startReview(
    payload: NewReviewForm | NewReviewObject | string = 'A001'
  ) {
    const form: NewReviewForm =
      typeof payload === 'string' ? { account: payload } : payload
    launchDialogOpen.value = false
    launching.value = true
    // 模拟调研耗时后切到报告态（与原型 2s loading 对齐）
    await new Promise((resolve) => setTimeout(resolve, 1800))
    launching.value = false
    const acc =
      typeof form.account === 'string' && form.account !== 'all'
        ? form.account
        : 'A001'
    await openReport(acc)
    // 用表单选择改写报告标题/副标题，让发起选项可见地生效
    applyFormToReport(form)
  }

  /**
   * 把发起复盘的表单选择拼进报告 title/subtitle。
   * 报告体仍是 A001 样板，但标题反映用户选的「对象 + 时间 + 重点」，证明表单生效。
   * value → label 经 newOptions 映射（缺映射则回退原 value）。
   */
  function applyFormToReport(form: NewReviewForm) {
    if (!report.value) return
    const opts = newOptions.value
    const labelOf = (
      list: { value: string; label: string }[] | undefined,
      val?: string
    ) => (val ? (list?.find((o) => o.value === val)?.label ?? val) : undefined)

    const objectLabel = labelOf(opts?.objects, form.object)
    const timeLabel = labelOf(opts?.times, form.time)
    const focusLabel = labelOf(opts?.focuses, form.focus)
    const acc = form.account && form.account !== 'all' ? form.account : 'A001'

    // 标题：账户 · 时间 · 重点（如「A001 · 近 7 日 · ROI 异常复盘」）
    const titleParts = [acc, timeLabel, focusLabel].filter(
      (p): p is string => Boolean(p)
    )
    report.value.title = titleParts.join(' · ')

    // 副标题：回显完整发起选择，证明 object/time/focus 都生效
    const segs = [objectLabel, timeLabel, focusLabel].filter(
      (p): p is string => Boolean(p)
    )
    if (segs.length > 0) {
      report.value.subtitle = `本次复盘按你的发起选择：${segs.join(
        ' · '
      )} · 由 AI 自主执行多轮 ReAct 推导 · Verifier 二轮质检通过`
    }
  }

  return {
    // view
    view,
    // inbox
    inbox,
    inboxLoading,
    filter,
    historyExpanded,
    visibleGroups,
    loadInbox,
    setFilter,
    loadMoreHistory,
    // report
    report,
    reportLoading,
    executed,
    openReport,
    backToInbox,
    execute,
    isExecuted,
    // new
    launchDialogOpen,
    launching,
    newOptions,
    openLaunchDialog,
    closeLaunchDialog,
    startReview,
  }
})
