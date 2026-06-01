/**
 * 素材诊断全局态（4 态状态机 + 异常兜底）
 * - state：empty → loading → (single)report / (multi)batch；异常 → error（DIAG-05）
 * - 上传编排：service 校验（拦视频 / 非图）→ mock 返回单图 6 模块 / 批量三档
 * - 报告 / 批量数据 + 诊断历史侧栏
 *
 * 状态归并集中在此 + service；组件只读状态、触发 action。
 * 平台 scope 取自全局 platformStore.current（顶栏全局平台，experience.md「平台全局化」）。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlatformStore } from './platform'
import {
  fetchHistory,
  fetchReport,
  uploadDiagnose,
} from '@/services/diagnose'
import { DiagnoseRejectError } from '@/types/diagnose'
import type {
  BatchItem,
  BatchSummary,
  DiagnoseHistoryItem,
  DiagnoseReport,
  DiagnoseRejectReason,
  DiagState,
  PlatformLite,
  ReportVariant,
} from '@/types/diagnose'

export const useDiagnoseStore = defineStore('diagnose', () => {
  const platformStore = usePlatformStore()

  /* ---------- 状态机 ---------- */
  const state = ref<DiagState>('empty')

  /* ---------- 报告（单图） ---------- */
  const report = ref<DiagnoseReport | null>(null)

  /* ---------- 批量概览 ---------- */
  const batchItems = ref<BatchItem[]>([])
  const batchSummary = ref<BatchSummary>({ total: 0, ok: 0, warn: 0, danger: 0 })
  const batchMeta = ref<{ count: number; platform: PlatformLite | null; duration: number }>({
    count: 0,
    platform: null,
    duration: 0,
  })
  /** 进入 report 是否来自批量（决定报告顶栏是否显示「← 返回批量结果」） */
  const fromBatch = ref(false)

  /* ---------- 异常兜底（DIAG-05） ---------- */
  const errorReason = ref<DiagnoseRejectReason | null>(null)
  const errorMessage = ref('')

  /* ---------- 诊断历史侧栏 ---------- */
  const history = ref<DiagnoseHistoryItem[]>([])
  const activeHistoryId = ref<string | null>(null)

  /* ---------- loading 扫描步骤（DIAG-02） ---------- */
  const loadingFileLabel = ref('')
  /** 扫描进度步骤索引（0~5，驱动 tp-item done/running/pending） */
  const scanStep = ref(0)
  const SCAN_STEPS = [
    '解析图片内容',
    '提取图片文案 OCR',
    '比对平台审核规则 v3.2…',
    '检索历史相似案例',
    '生成修改方案',
  ]
  let scanTimer: ReturnType<typeof setInterval> | null = null

  const isReport = computed(() => state.value === 'report')
  const isBatch = computed(() => state.value === 'batch')

  /* ============================================================
   * 历史
   * ============================================================ */
  async function loadHistory() {
    history.value = await fetchHistory()
  }

  /* ============================================================
   * 状态切换
   * ============================================================ */

  /** 回到空态（新建诊断） */
  function reset() {
    stopScan()
    state.value = 'empty'
    report.value = null
    fromBatch.value = false
    activeHistoryId.value = null
    errorReason.value = null
    errorMessage.value = ''
  }

  /** 返回批量结果（report → batch） */
  function backToBatch() {
    if (batchItems.value.length) {
      state.value = 'batch'
      report.value = null
      activeHistoryId.value = null
    } else {
      reset()
    }
  }

  function stopScan() {
    if (scanTimer) {
      clearInterval(scanTimer)
      scanTimer = null
    }
    scanStep.value = 0
  }

  /** 启动扫描动画步进（纯视觉，loading 期间逐步点亮 5 步） */
  function startScan() {
    stopScan()
    scanStep.value = 0
    scanTimer = setInterval(() => {
      if (scanStep.value < SCAN_STEPS.length - 1) {
        scanStep.value += 1
      } else {
        stopScan()
      }
    }, 420)
  }

  /* ============================================================
   * 上传诊断（核心编排）
   * ============================================================ */

  /**
   * 上传素材发起诊断。
   * 视频 / 非图在 service 层即被拦截（不调后端）→ 进 error 态引导转文字 / 人工。
   * @param files 选中的文件（Mock 仅用 name/type/size 判定）
   * @param note  文字描述违规（可空）
   */
  async function upload(
    files: { name: string; type: string; size?: number }[],
    note?: string
  ) {
    const platformKey = platformStore.current
    // 进入诊断中（扫描动画）
    state.value = 'loading'
    loadingFileLabel.value = buildFileLabel(files, platformKey)
    startScan()

    try {
      const data = await uploadDiagnose({
        files,
        // 顶栏可能是 all（管理视角）；诊断按单平台比对，service 内 resolve
        platform: platformKey === 'all' ? 'juliang' : platformKey,
        note,
      })
      stopScan()

      if (data.mode === 'single') {
        report.value = data.report
        fromBatch.value = false
        state.value = 'report'
      } else {
        batchItems.value = data.items
        batchSummary.value = data.summary
        batchMeta.value = {
          count: data.count,
          platform: data.platform,
          duration: data.duration_sec,
        }
        state.value = 'batch'
      }
    } catch (e) {
      stopScan()
      if (e instanceof DiagnoseRejectError) {
        // 视频 / 非图 / 识别失败 → DIAG-05 异常兜底
        errorReason.value = e.reason
        errorMessage.value = e.message
        state.value = 'error'
      } else {
        errorReason.value = 'unrecognized'
        errorMessage.value = '诊断服务暂时不可用，请稍后重试'
        state.value = 'error'
      }
    }
  }

  /* ============================================================
   * 进入单图报告（批量「查看详情」/ 历史项点击）
   * ============================================================ */

  /** 批量某行 → 单图报告 */
  async function openReportFromBatch(item: BatchItem) {
    fromBatch.value = true
    report.value = await fetchReport(item.task_id, platformStore.current)
    state.value = 'report'
  }

  /** 历史项 → 单图报告 */
  async function openHistory(item: DiagnoseHistoryItem) {
    activeHistoryId.value = item.id
    fromBatch.value = false
    batchItems.value = [] // 历史直达，清掉批量返回入口
    report.value = await fetchReport(item.reportId, platformStore.current)
    state.value = 'report'
  }

  return {
    // state
    state,
    report,
    batchItems,
    batchSummary,
    batchMeta,
    fromBatch,
    errorReason,
    errorMessage,
    history,
    activeHistoryId,
    loadingFileLabel,
    scanStep,
    scanSteps: SCAN_STEPS,
    // derived
    isReport,
    isBatch,
    // actions
    loadHistory,
    reset,
    backToBatch,
    upload,
    openReportFromBatch,
    openHistory,
  }
})

/** loading 副标题：「现言_信息流图等 N 张 · 平台名」 */
function buildFileLabel(
  files: { name: string }[],
  platformKey: string
): string {
  const names: Record<string, string> = {
    juliang: '巨量引擎',
    kuaishou: '磁力引擎',
    tencent: '腾讯广告',
    all: '巨量引擎',
  }
  const first = (files[0]?.name || '素材').replace(/^\[Mock\]\s*/, '').replace(/\.\w+$/, '')
  const suffix = files.length > 1 ? `等 ${files.length} 张` : ''
  return `${first}${suffix} · ${names[platformKey] ?? '巨量引擎'}`
}

// 类型透出（供组件 import）
export type { ReportVariant }
