/**
 * 数据监控模块类型（纯数据层 · 刻意不做任何判断）
 * 对齐 docs/api-contracts.md「数据监控模块（纯数据，无判断字段）」：
 *   - GET /api/monitor/accounts        账户明细表（响应不含任何状态 / 判断标签）
 *   - GET /api/monitor/trend?range=24h 24h 消耗趋势点列
 *   - GET /api/monitor/retention?mode=days|date  留存 cohort（注册日期 × D0–D30 / 绝对日期）
 *   - GET /api/monitor/detail?range=14d 数据明细（日期 × 指标）
 *
 * 灵魂约定（experience.md「监控 = 事实层」）：
 *   监控页纯数据，不做任何判断 —— 无 AI 解读 / 状态标签 / ROI 异常标记。
 *   因此本模块所有 DTO **只承载事实数值**，不含 severity / status / level / tag 等任何判断字段。
 *   判断收口到投放复盘模块（/review）。
 *
 * 收敛原则（dev-standards 第 10 节「Endpoint DTO 收敛」）：
 *   accounts / trend / retention / detail 四个 endpoint 各自独立响应 DTO，互不复用。
 */

/* ============================================================
 * 平台（账户表按平台分 tab，不同平台指标体系不同）
 * ============================================================ */

/** 监控可见平台 key（不含 all：账户表按单平台指标分开展示） */
export type MonitorPlatformKey = 'juliang' | 'kuaishou' | 'tencent'

/** 平台 tab 元信息（账户表分组） */
export interface MonitorPlatformTab {
  key: MonitorPlatformKey
  /** 平台名，如「巨量引擎」 */
  name: string
  /** 该平台账户数（tab 后缀 · N） */
  count: number
}

/* ============================================================
 * GET /api/monitor/accounts —— 账户明细表（纯数据，无判断列）
 * ============================================================ */

/**
 * 账户表单元格值：
 *   - number  纯数值（按 format 渲染）
 *   - string  已格式化文本（如「3.10%」「¥86,200」）
 *   - null    无数据（渲染为「—」，非判断）
 */
export type CellValue = number | string | null

/** 账户表列定义（按平台动态，不同平台列不同） */
export interface AccountColumn {
  /** 字段 key（对应 AccountRow.metrics 的键） */
  key: string
  /** 列名，如「消耗」「支付粉价」「转化目标量」 */
  label: string
}

/**
 * 账户明细行（纯事实，无 status / 判断字段）。
 * account / name / agent 为固定列；metrics 为按平台变化的指标列。
 */
export interface AccountRow {
  /** 账户编号，如 A001 */
  account: string
  /** 账户名，如「现言短剧旗舰户」 */
  name: string
  /** 投手姓名 */
  agent: string
  /** 所属平台 */
  platform: MonitorPlatformKey
  /** 指标列值（key → 已格式化文本 / 数值；缺失为 null → 「—」） */
  metrics: Record<string, CellValue>
}

/** 单平台账户表分组（列定义 + 行数据） */
export interface AccountPlatformGroup {
  platform: MonitorPlatformTab
  /** 该平台账户表列（账户名固定列之外的指标列） */
  columns: AccountColumn[]
  rows: AccountRow[]
}

/** GET /api/monitor/accounts 响应 data（纯事实，无任何判断字段） */
export interface MonitorAccountsData {
  /** 按平台分组的账户表（不同平台指标体系不同） */
  groups: AccountPlatformGroup[]
  /** 账户总数（页面副标题「N 个账户」） */
  total_accounts: number
  /** 平台总数 */
  total_platforms: number
}

/* ============================================================
 * GET /api/monitor/trend?range=24h —— 24h 消耗趋势点列
 * ============================================================ */

/** 趋势单点（纯事实：时刻 + 值） */
export interface TrendPoint {
  /** 时刻标签，如「14:30」 */
  time: string
  /** 该时刻消耗值（元） */
  value: number
}

/** GET /api/monitor/trend 响应 data（今日点列 + 昨日同时段参考线） */
export interface MonitorTrendData {
  range: string
  /** 指标名（默认「消耗」） */
  metric: string
  /** 单位前缀（如「¥」） */
  unit: string
  /** 今日实时点列 */
  today: TrendPoint[]
  /** 昨日同时段点列（参考线，纯事实对照非判断） */
  yesterday: TrendPoint[]
  /** 当前时刻标签（最新点） */
  now_label: string
}

/* ============================================================
 * GET /api/monitor/retention —— 留存 cohort（回本进度）
 * ============================================================ */

/** cohort 模式：days 注册日期 × D0–D30 / date 注册日期 × 绝对日期 */
export type RetentionMode = 'days' | 'date'

/**
 * cohort 单元格：
 *   - number  累计回本率百分比（如 84 表示 84%）
 *   - null    尚未到的天数（渲染「—」，gray-300，非判断）
 */
export type CohortCell = number | null

/** cohort 单行（一个注册日期同批用户的回本进度） */
export interface CohortRow {
  /** 注册日期，如「05-28」 */
  reg: string
  /** 该批新增粉数 */
  fans: number
  /** 是否今天（置顶 + 「今天」标记） */
  isToday?: boolean
  /** 按列顺序的回本率值（null 为未到天数） */
  values: CohortCell[]
}

/** GET /api/monitor/retention 响应 data */
export interface MonitorRetentionData {
  mode: RetentionMode
  /** 列头（天数模式：当天/D1…D30；日期模式：05-15…05-28） */
  cols: string[]
  /** cohort 行（今天置顶、注册日期倒序） */
  rows: CohortRow[]
}

/* ============================================================
 * GET /api/monitor/detail?range=14d —— 数据明细（日期 × 指标）
 * ============================================================ */

/** 数据明细列定义（指标横排） */
export interface DetailColumn {
  key: string
  label: string
}

/** 数据明细单行（一个日期一行，日期竖排） */
export interface DetailRow {
  /** 日期，如「05-28」 */
  date: string
  /** 行标记：today 今天 / yesterday 昨日（纯时间标记，非判断） */
  mark?: 'today' | 'yesterday'
  /** 指标值（key → 已格式化文本 / 数值） */
  metrics: Record<string, CellValue>
}

/** GET /api/monitor/detail 响应 data */
export interface MonitorDetailData {
  range: string
  columns: DetailColumn[]
  /** 按日期倒序（今天在最上） */
  rows: DetailRow[]
}

/* ============================================================
 * 账户详情下钻聚合（概览 tab 用：KPI / 漏斗 / 出价预算 / 复购 LTV / 明细子表）
 * 仍为纯事实 —— 无任何判断字段。
 * ============================================================ */

/** 概览 KPI 卡（label + value，纯数值无涨跌判断色） */
export interface DetailKpi {
  label: string
  value: string
}

/** 完成度（进度条，纯事实：已完成 / 目标） */
export interface CompletionInfo {
  label: string
  /** 百分比文本，如「26%」 */
  percent: string
  /** 进度条宽度 0~100 */
  ratio: number
  /** 已完成数 */
  done: number
  /** 目标数 */
  target: number
}

/** 转化漏斗单层（纯事实） */
export interface FunnelStage {
  label: string
  /** 主值（已格式化），如「446,600」 */
  value: string
  /** 条宽 0~100 */
  ratio: number
  /** 副说明，如「点击率 3.10%」（可空） */
  note?: string
}

/** 键值小卡（出价&预算 / 复购&LTV 共用） */
export interface KvItem {
  label: string
  value: string
}

/** 预算消耗进度（纯事实） */
export interface BudgetProgress {
  label: string
  percent: string
  ratio: number
}

/** 概览子表（广告组 / 投放计划 / 创意三维度，纯数据明细） */
export interface DetailSubTable {
  /** 维度 key */
  key: 'group' | 'plan' | 'creative'
  /** 维度名，如「广告组」 */
  label: string
  columns: DetailColumn[]
  rows: DetailRow[]
}

/** 账户详情头信息 */
export interface AccountDetailHeader {
  account: string
  name: string
  platform: MonitorPlatformKey
  /** 平台短名，如「巨量」（徽标用） */
  platformShort: string
  /** 日期范围文本，如「2026-05-28 至 2026-05-28」 */
  dateRange: string
}

/**
 * 账户详情·概览 tab 聚合 DTO（GET /api/monitor/detail/overview?account= 形态）。
 * 字段全部为事实数值，无判断。
 */
export interface AccountOverview {
  header: AccountDetailHeader
  kpis: DetailKpi[]
  completion: CompletionInfo
  /** 概览 24h 趋势点列（复用 TrendPoint） */
  trend: TrendPoint[]
  trendNowLabel: string
  funnel: FunnelStage[]
  /** 出价 & 预算键值 */
  bid: KvItem[]
  budget: BudgetProgress
  /** 复购 & LTV 键值 */
  ltv: KvItem[]
  /** 详细数据子表（广告组 / 投放计划 / 创意） */
  subTables: DetailSubTable[]
}
