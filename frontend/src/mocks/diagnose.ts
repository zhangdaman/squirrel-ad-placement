/**
 * 素材诊断模块 Mock
 * 严格对齐 docs/api-contracts.md 与 docs/prototypes/diagnose.html / diagnose-styles.html：
 *   - POST /api/diagnose/upload
 *       · 单图 → DiagnoseSingleData（6 模块报告：severity / violations(图上 pos) / fixes / predict / history_refs）
 *       · 批量 → DiagnoseBatchData（mode:"batch" + items[]，三档 ok/warn/danger）
 *       · 视频 / 非素材图 → 422（DiagnoseRejectError，转文字 / 人工）
 * 数值对齐原型：批量 5 张（2 可过审 / 1 建议优化 / 2 高风险）；
 *   rejected 报告 过审率 18% → 改造后 94%；precheck 预检 92%。
 * 所有展示型 Mock 数据带 [Mock] 标识（见报告标题 / 历史项），接真实接口后移除。
 */
import type { ApiResponse } from '@/types/auth'
import type {
  BatchItem,
  DiagnoseBatchData,
  DiagnoseHistoryItem,
  DiagnoseReport,
  DiagnoseSingleData,
  PlatformLite,
} from '@/types/diagnose'

/* ============================================================
 * 平台字典（key → 名称 + 徽标 class）
 * ============================================================ */

const PLATFORMS: Record<PlatformLite['key'], PlatformLite> = {
  juliang: { key: 'juliang', name: '巨量引擎' },
  kuaishou: { key: 'kuaishou', name: '磁力引擎' },
  tencent: { key: 'tencent', name: '腾讯广告' },
}

/** 顶栏全局平台 → 诊断平台（all 兜底巨量，诊断按单平台规则比对） */
export function resolvePlatform(p: string): PlatformLite {
  if (p === 'kuaishou') return PLATFORMS.kuaishou
  if (p === 'tencent') return PLATFORMS.tencent
  return PLATFORMS.juliang
}

const GRAD = {
  orange: 'linear-gradient(135deg,#FFB259,#E25822)',
  blue: 'linear-gradient(135deg,#5E89F6,#2554DC)',
  pink: 'linear-gradient(135deg,#FF6B9D,#C42667)',
  teal: 'linear-gradient(135deg,#2BB8A3,#0E8C7A)',
  green: 'linear-gradient(135deg,#34D399,#059669)',
}

/* ============================================================
 * 单图报告样板（对齐 DIAG-04 两个 variant）
 * ============================================================ */

/** rejected 变体：已拒素材 · 拒审归因 + 修改方案（6 模块齐全，权威源 diagnose-styles.html DIAG-04 rejected） */
function rejectedReport(
  taskId: string,
  name: string,
  platform: PlatformLite
): DiagnoseReport {
  return {
    task_id: taskId,
    name,
    variant: 'rejected',
    severity: 'high',
    pass_rate: 0.18,
    platform,
    duration_sec: 4.2,
    preview_title: '免费看全集',
    preview_sub: '霸总爱上灰姑娘 · 第38集',
    preview_gradient: GRAD.orange,
    meta: [
      { key: '素材类型', value: '信息流图片（3 张）' },
      { key: '图片尺寸', value: '1080×1920 · JPG' },
      { key: '投放平台', value: platform.name },
      { key: '投放计划', value: '1738652087441' },
      { key: '投手', value: '王磊' },
    ],
    // ① 违规清单（含图上 pos，驱动 violation-marker；x<0 用 right）
    violations: [
      {
        id: 1,
        type: '诱导点击',
        desc: '标题"免费"',
        pos: { x: 18, y: 32 },
        rule: '《巨量引擎素材审核规范 v3.2》第 4.1 条「诱导点击类」',
      },
      {
        id: 2,
        type: '烟草元素',
        desc: '抽烟画面',
        pos: { x: -18, y: 80 },
        rule: '第 5.3 条「不良场景类 · 烟酒元素」',
      },
    ],
    // ② 改造建议（fix-card）
    fixes: [
      {
        title: '替换标题文案',
        detail: '去除"免费"等绝对化词，改用更柔和的吸引表达',
        hard: true,
        before: '免费看全集',
        after: '精彩剧情抢先看',
      },
      {
        title: '替换 / 裁剪违规区域',
        detail: '图 2 中的香烟特写需替换或裁掉，建议改为人物表情或场景特写',
        hard: true,
        before: '右下角香烟特写',
        after: '替换为合规画面',
      },
      {
        title: '建议同时优化',
        detail: '封面文字位置过低，可能被平台 UI 遮挡，建议上移 20%',
        hard: false,
      },
    ],
    // ③ 历史参考
    history_refs: [
      {
        title: '同类拒审案例 · 2024-10-28',
        result: '"免费看全集" → "看片不要钱" · 修改后通过',
        layer: 'L3',
      },
      {
        title: '现言短剧 · 烟草违规改进 · 2024-12-09',
        result: '替换违规区域 · 修改后通过',
        layer: 'L3',
      },
      {
        title: '巨量素材审核规范 v3.2 · 4.1 / 5.3',
        result: '平台官方规则 · 2024 年最新版',
        official: true,
      },
    ],
    // ④ 改造前后过审预测
    predict: {
      before: 0.18,
      after: 0.94,
      basis: '基于近 6 个月私域 187 条相似拒审案例的修改后通过率统计',
    },
  }
}

/** precheck 变体：待审预检 · 过审预测 + 5 维扫描 + 优化建议（权威源 DIAG-04 precheck） */
function precheckReport(
  taskId: string,
  name: string,
  platform: PlatformLite
): DiagnoseReport {
  return {
    task_id: taskId,
    name,
    variant: 'precheck',
    severity: 'low',
    pass_rate: 0.92,
    platform,
    duration_sec: 3.8,
    preview_title: '三年后她惊艳归来',
    preview_sub: '现言短剧 · 信息流',
    preview_gradient: GRAD.blue,
    meta: [
      { key: '素材类型', value: '竖版海报图' },
      { key: '图片尺寸', value: '1080×1920 · JPG' },
      { key: '投放平台', value: platform.name },
      { key: '当前状态', value: '待审（尚未提交）' },
    ],
    violations: [],
    fixes: [
      {
        title: '放大主标题字号',
        detail:
          '当前主标题偏小，建议放大约 20%。不影响过审，预计提升点击率约 8%，间接利好 ROI。',
        hard: false,
      },
    ],
    history_refs: [],
    predict: {
      before: 0.92,
      after: 0.92,
      basis: '基于近 6 个月私域 240 条相似图片素材的实际过审率统计',
    },
    dimensions: [
      { name: '文案 / 字幕', result: 'pass', note: '无绝对化、诱导点击词' },
      { name: '画面 / 元素', result: 'pass', note: '无烟酒、暴力等违规元素' },
      { name: '主体 / 人物', result: 'pass', note: '无违规人物形象或动作' },
      { name: '排版 / 构图', result: 'warn', note: '主标题字号偏小，建议放大（建议项，非合规）' },
      { name: '主图 / 封面', result: 'pass', note: '文字位置合规，无遮挡' },
    ],
  }
}

/** 「需改」（建议优化）变体：复用 rejected 结构但风险降级为 mid（古言九宫格场景） */
function warnReport(
  taskId: string,
  name: string,
  platform: PlatformLite
): DiagnoseReport {
  const r = rejectedReport(taskId, name, platform)
  return {
    ...r,
    severity: 'mid',
    pass_rate: 0.76,
    preview_title: '一朝穿越成废材',
    preview_sub: '古言短剧 · 九宫格',
    preview_gradient: GRAD.teal,
    violations: [
      {
        id: 1,
        type: '排版建议',
        desc: '主标题字号偏小',
        pos: { x: 22, y: 70 },
        rule: '建议项 · 非硬违规',
      },
    ],
    fixes: [
      {
        title: '放大主标题字号',
        detail: '主标题偏小建议放大约 20%，提升信息识别与点击',
        hard: false,
        before: '当前字号偏小',
        after: '放大 20%',
      },
    ],
    predict: {
      before: 0.76,
      after: 0.93,
      basis: '基于近 6 个月私域相似建议优化案例的提交通过率统计',
    },
  }
}

/* ============================================================
 * 单图报告库（task_id → report），供历史项 / 批量「查看详情」复用
 * ============================================================ */

const REPORT_MAP: Record<string, (p: PlatformLite) => DiagnoseReport> = {
  d_rejected_01: (p) => rejectedReport('d_rejected_01', '[Mock] 现言_信息流图_03.jpg', p),
  d_precheck_01: (p) => precheckReport('d_precheck_01', '[Mock] 现言_竖版海报.jpg', p),
  d_warn_01: (p) => warnReport('d_warn_01', '[Mock] 古言_九宫格图.png', p),
  d_rejected_02: (p) => {
    const r = rejectedReport('d_rejected_02', '[Mock] 都市_悬疑_01.jpg', p)
    return {
      ...r,
      pass_rate: 0.22,
      preview_title: '追凶到底',
      preview_sub: '都市悬疑 · 信息流',
      preview_gradient: GRAD.green,
      violations: [
        {
          id: 1,
          type: '暴力暗示',
          desc: '暗示词「追凶」「血」',
          pos: { x: 16, y: 28 },
          rule: '《巨量引擎素材审核规范 v3.2》第 5.1 条「暴力血腥类」',
        },
      ],
      fixes: [
        {
          title: '替换暴力暗示词',
          detail: '「追凶」「血」属暴力暗示，改用悬念化、叙事化表达',
          hard: true,
          before: '追凶到底',
          after: '真相只有一个',
        },
      ],
      predict: {
        before: 0.22,
        after: 0.9,
        basis: '基于近 6 个月私域 142 条同类暴力暗示拒审案例的修改后通过率统计',
      },
    }
  },
  d_precheck_02: (p) => {
    const r = precheckReport('d_precheck_02', '[Mock] 霸总_首图_v3.jpg', p)
    return {
      ...r,
      pass_rate: 0.95,
      preview_title: '隐婚总裁的小娇妻',
      preview_sub: '现言短剧 · 首图',
      preview_gradient: GRAD.pink,
    }
  },
}

/** 取单图报告（task_id 未命中则回退 rejected 样板） */
export function getReport(taskId: string, platform: PlatformLite): DiagnoseReport {
  const factory = REPORT_MAP[taskId]
  if (factory) return factory(platform)
  return rejectedReport(taskId, '[Mock] 未命名素材.jpg', platform)
}

/* ============================================================
 * 批量行项（对齐 DIAG-03：5 张 → 2 ok / 1 warn / 2 danger）
 * ============================================================ */

function buildBatchItems(): BatchItem[] {
  return [
    {
      task_id: 'd_rejected_01',
      name: '[Mock] 现言_信息流图_03.jpg',
      gradient: GRAD.orange,
      issue: '检出香烟特写 + 诱导点击文案「点击领取」',
      pass_rate: 0.18,
      tag: 'danger',
      variant: 'rejected',
    },
    {
      task_id: 'd_precheck_01',
      name: '[Mock] 现言_竖版海报.jpg',
      gradient: GRAD.blue,
      issue: '5 维合规扫描全部通过，无违规元素',
      pass_rate: 0.95,
      tag: 'ok',
      variant: 'precheck',
    },
    {
      task_id: 'd_warn_01',
      name: '[Mock] 古言_九宫格图.png',
      gradient: GRAD.teal,
      issue: '主标题字号偏小，建议放大（建议项，非硬违规）',
      pass_rate: 0.76,
      tag: 'warn',
      variant: 'rejected',
    },
    {
      task_id: 'd_precheck_02',
      name: '[Mock] 霸总_首图_v3.jpg',
      gradient: GRAD.pink,
      issue: '5 维合规扫描全部通过，文字位置合规',
      pass_rate: 0.92,
      tag: 'ok',
      variant: 'precheck',
    },
    {
      task_id: 'd_rejected_02',
      name: '[Mock] 都市_悬疑_01.jpg',
      gradient: GRAD.green,
      issue: '检出暴力暗示词「追凶」「血」',
      pass_rate: 0.22,
      tag: 'danger',
      variant: 'rejected',
    },
  ]
}

/* ============================================================
 * POST /api/diagnose/upload 的 Mock
 * 单图（1 张）→ 直接报告；多张 → 批量概览。
 * ============================================================ */

/**
 * 上传诊断（Mock）。
 * @param fileCount 选中的图片张数（前端已过滤掉视频 / 非图）
 * @param platform  诊断平台
 * @param singleTaskId 单图时指定报告 id（可空，默认 rejected 样板）
 */
export function mockUpload(
  fileCount: number,
  platform: PlatformLite,
  singleTaskId?: string
): ApiResponse<DiagnoseSingleData | DiagnoseBatchData> {
  // 单图 → mode:"single"
  if (fileCount <= 1) {
    const report = getReport(singleTaskId ?? 'd_rejected_01', platform)
    const data: DiagnoseSingleData = {
      task_id: report.task_id,
      mode: 'single',
      report,
    }
    return { code: 200, message: 'success', data }
  }

  // 多张 → mode:"batch"
  const items = buildBatchItems().slice(0, Math.max(fileCount, 2))
  const summary = {
    total: items.length,
    ok: items.filter((i) => i.tag === 'ok').length,
    warn: items.filter((i) => i.tag === 'warn').length,
    danger: items.filter((i) => i.tag === 'danger').length,
  }
  const data: DiagnoseBatchData = {
    task_id: `d_batch_${Date.now()}`,
    mode: 'batch',
    summary,
    items,
    count: items.length,
    platform,
    duration_sec: 6.4,
  }
  return { code: 200, message: 'success', data }
}

/** 422 形态（视频 / 非素材图）—— 与 api-contracts.md 一致 */
export function mockUploadReject(message: string): ApiResponse<null> {
  return { code: 422, message, data: null }
}

/* ============================================================
 * 诊断历史（左栏 diag-history，对齐 diagnose.html）
 * ============================================================ */

const MOCK_HISTORY: DiagnoseHistoryItem[] = [
  {
    id: 'h1',
    name: '[Mock] 现言_信息流图_03.jpg',
    gradient: GRAD.orange,
    platform: PLATFORMS.juliang,
    statusText: '已拒',
    statusTag: 'danger',
    timeLabel: '今天 14:23',
    reportId: 'd_rejected_01',
    variant: 'rejected',
  },
  {
    id: 'h2',
    name: '[Mock] 现言_竖版海报.jpg',
    gradient: GRAD.blue,
    platform: PLATFORMS.tencent,
    statusText: '预检通过',
    statusTag: 'ok',
    timeLabel: '今天 11:08',
    reportId: 'd_precheck_01',
    variant: 'precheck',
  },
  {
    id: 'h3',
    name: '[Mock] 古言_九宫格图.png',
    gradient: GRAD.teal,
    platform: PLATFORMS.kuaishou,
    statusText: '需改',
    statusTag: 'warn',
    timeLabel: '昨天 18:42',
    reportId: 'd_warn_01',
    variant: 'rejected',
  },
  {
    id: 'h4',
    name: '[Mock] 霸总_首图_v3.jpg',
    gradient: GRAD.pink,
    platform: PLATFORMS.juliang,
    statusText: '预检通过',
    statusTag: 'ok',
    timeLabel: '昨天 15:30',
    reportId: 'd_precheck_02',
    variant: 'precheck',
  },
  {
    id: 'h5',
    name: '[Mock] 都市_悬疑_01.jpg',
    gradient: GRAD.green,
    platform: PLATFORMS.juliang,
    statusText: '已拒',
    statusTag: 'danger',
    timeLabel: '3 天前',
    reportId: 'd_rejected_02',
    variant: 'rejected',
  },
]

/** GET（诊断历史 Mock）—— 左栏最近 30 天 */
export function mockHistory(): DiagnoseHistoryItem[] {
  return MOCK_HISTORY.map((h) => ({ ...h }))
}
