/**
 * 素材诊断模块类型
 * 对齐 docs/api-contracts.md：
 *   - POST /api/diagnose/upload（multipart，仅图片；视频/非图 → 422）
 *     · 单图 200：severity / pass_rate / violations(含图上 pos) / fixes / predict(before/after) / history_refs
 *     · 批量 200：mode:"batch" + items[]（每张 pass_rate + tag：ok/warn/danger）
 * 输出样式锚定 docs/prototypes/diagnose.html + diagnose-styles.html（DIAG-01~05，5 态）。
 *
 * 收敛原则（dev-standards 第 10 节「Endpoint DTO 收敛」）：
 *   - 单图响应 DiagnoseSingleData 与批量响应 DiagnoseBatchData 各自独立 DTO；
 *   - 批量行项 BatchItem 与单图报告字段不复用同一类型。
 */

/* ============================================================
 * 页面状态机（DIAG 4 态，权威源 diagnose.html: diag-state[empty/loading/batch/report]）
 * ============================================================ */

/**
 * 诊断面板状态：
 *   - empty   DIAG-01 空态 · 上传入口
 *   - loading DIAG-02 诊断中 · 扫描动画
 *   - batch   DIAG-03 批量概览 · 三档过审率
 *   - report  DIAG-04 单图报告 · 6 模块
 *   - error   DIAG-05 异常兜底 · 非素材图 / 太模糊
 */
export type DiagState = 'empty' | 'loading' | 'batch' | 'report' | 'error'

/* ============================================================
 * 严重度 / 标签
 * ============================================================ */

/** 风险总判等级（severity-badge）：high 高风险 / mid 建议优化 / low 低风险（可投） */
export type Severity = 'high' | 'mid' | 'low'

/** 批量行项过审标签：ok 可过审 / warn 建议优化 / danger 高风险拒审 */
export type DiagTag = 'ok' | 'warn' | 'danger'

/** 报告变体：rejected 已拒/待修改（拒审归因）/ precheck 待审预检（过审预测 + 5 维扫描） */
export type ReportVariant = 'rejected' | 'precheck'

/* ============================================================
 * 单图报告字段（对齐契约单图 200 响应）
 * ============================================================ */

/** 违规点在素材图上的相对定位（百分比；x 正=左偏移、负=右偏移，对齐原型 left/right） */
export interface ViolationPos {
  /** 横向：>=0 用 left%，<0 用 right%（取绝对值） */
  x: number
  /** 纵向：top% */
  y: number
}

/** 单条违规（contracts: violations[]，含图上 pos） */
export interface Violation {
  id: number
  /** 违规类型，如「诱导点击」「烟草元素」 */
  type: string
  /** 违规描述，如 标题"免费" */
  desc: string
  /** 图上定位（驱动 violation-marker 绝对定位）；预检通过素材可空 */
  pos?: ViolationPos
  /** 命中的平台规则条款，如《巨量引擎素材审核规范 v3.2》第 4.1 条 */
  rule?: string
}

/** 单条改造建议（contracts: fixes[]） */
export interface Fix {
  title: string
  detail: string
  /** 是否硬违规（true 必改 / false 建议优化） */
  hard?: boolean
  /** 改造前后对照（fix-compare），可空 */
  before?: string
  after?: string
}

/** 改造前后过审预测（contracts: predict{before,after}） */
export interface Predict {
  /** 改造前过审率 0~1 */
  before: number
  /** 改造后过审率 0~1 */
  after: number
  /** 预测依据说明 */
  basis?: string
}

/** 历史相似案例参考（contracts: history_refs[]） */
export interface HistoryRef {
  title: string
  /** 结果，如「修改后通过」 */
  result: string
  /** 私域分层标注 L1/L2/L3 或「平台官方规则」 */
  layer?: string
  /** 是否平台官方规则（橙色图标） */
  official?: boolean
}

/** 预检 5 维合规扫描行（precheck 变体用） */
export interface PrecheckDimension {
  /** 维度名，如「文案 / 字幕」 */
  name: string
  /** 结果：pass 通过 / warn 建议优化 */
  result: 'pass' | 'warn'
  /** 说明 */
  note: string
}

/** 素材预览元信息（material-preview 右侧键值表） */
export interface MaterialMeta {
  key: string
  value: string
}

/* ============================================================
 * 单图报告聚合（DiagnoseReport 渲染单元）
 * ============================================================ */

/** 单图诊断报告（DIAG-04，6 模块数据集合） */
export interface DiagnoseReport {
  task_id: string
  /** 素材文件名 */
  name: string
  /** 报告变体：rejected / precheck */
  variant: ReportVariant
  /** 风险总判 */
  severity: Severity
  /** 综合过审率 0~1 */
  pass_rate: number
  /** 投放平台 key（驱动 platform 徽标） */
  platform: PlatformLite
  /** 诊断时长（秒） */
  duration_sec: number
  /** 素材预览：标题 / 副标题（覆盖在 preview-frame 上） */
  preview_title: string
  preview_sub: string
  /** 预览渐变色（mock 缩略图占位） */
  preview_gradient: string
  /** 素材元信息键值表 */
  meta: MaterialMeta[]
  /** ① 违规清单（rejected 用） */
  violations: Violation[]
  /** ② 改造建议（rejected / precheck 优化项） */
  fixes: Fix[]
  /** ③ 历史参考 */
  history_refs: HistoryRef[]
  /** ④ 改造前后过审预测 */
  predict: Predict
  /** 预检 5 维扫描（precheck 用） */
  dimensions?: PrecheckDimension[]
}

/** 平台轻量信息（徽标 class + 名称） */
export interface PlatformLite {
  /** juliang / kuaishou / tencent */
  key: 'juliang' | 'kuaishou' | 'tencent'
  name: string
}

/* ============================================================
 * 批量概览字段（对齐契约批量 200 响应）
 * ============================================================ */

/** 批量诊断行项（contracts: items[]，每张 pass_rate + tag） */
export interface BatchItem {
  task_id: string
  name: string
  /** 缩略图渐变占位 */
  gradient: string
  /** 概要问题描述 */
  issue: string
  /** 过审率 0~1 */
  pass_rate: number
  /** 三档标签 */
  tag: DiagTag
  /** 详情报告变体（点「查看详情」进 report 用） */
  variant: ReportVariant
}

/** 批量概览统计三档 */
export interface BatchSummary {
  total: number
  ok: number
  warn: number
  danger: number
}

/* ============================================================
 * 接口响应 DTO（各 endpoint 独立，禁止复用同一宽泛类型）
 * ============================================================ */

/** 上传任务请求参数（multipart 字段在 service 层构造；Mock 仅传文件名 + 平台） */
export interface DiagnoseUploadParams {
  /** 选中的文件（Mock 阶段只用 name/type 判定，不真正上传） */
  files: { name: string; type: string }[]
  /** 投放平台 key */
  platform: 'juliang' | 'kuaishou' | 'tencent'
  /** 文字描述违规（转文字入口，可空） */
  note?: string
}

/** POST /api/diagnose/upload 单图响应 data（mode:"single"） */
export interface DiagnoseSingleData {
  task_id: string
  mode: 'single'
  report: DiagnoseReport
}

/** POST /api/diagnose/upload 批量响应 data（mode:"batch"） */
export interface DiagnoseBatchData {
  task_id: string
  mode: 'batch'
  /** 概览统计 */
  summary: BatchSummary
  /** 行项列表 */
  items: BatchItem[]
  /** 张数 + 平台 + 耗时（顶部副标题） */
  count: number
  platform: PlatformLite
  duration_sec: number
}

/** 上传响应联合（mode 区分单图 / 批量；422 由 service 抛 DiagnoseRejectError） */
export type DiagnoseUploadData = DiagnoseSingleData | DiagnoseBatchData

/* ============================================================
 * 422 业务校验失败（视频 / 非素材图）
 * ============================================================ */

/** 422 拒收原因 */
export type DiagnoseRejectReason = 'video' | 'non_image' | 'unrecognized'

/**
 * 前端拦截 / 后端 422 统一错误形态。
 * - video / non_image：上传前前端即拦截（不调后端）→ 引导文字描述 / 人工
 * - unrecognized：识别不出可诊断素材（DIAG-05 异常兜底）
 */
export class DiagnoseRejectError extends Error {
  reason: DiagnoseRejectReason
  constructor(reason: DiagnoseRejectReason, message: string) {
    super(message)
    this.name = 'DiagnoseRejectError'
    this.reason = reason
  }
}

/** 诊断历史侧栏条目（mock 演示用，对齐 diagnose.html 左栏 diag-history） */
export interface DiagnoseHistoryItem {
  id: string
  name: string
  gradient: string
  platform: PlatformLite
  /** 结果标签文案 + 视觉态 */
  statusText: string
  statusTag: DiagTag
  timeLabel: string
  /** 点击后重放的报告 task_id（落到 MOCK 单图报告） */
  reportId: string
  variant: ReportVariant
}
