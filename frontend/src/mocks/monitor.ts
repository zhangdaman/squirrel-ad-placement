/**
 * 数据监控模块 Mock（纯数据层 · 刻意不做任何判断）
 * 严格对齐 docs/api-contracts.md 与 docs/prototypes/monitor.html，数值对齐 PRD golden-data 账本：
 *   - A001 现言短剧旗舰户（今日）：消耗 ¥86,200 / ROI 0.84 / 转化目标量 36 / 支付粉价 91.77 / 点击率 3.10%
 *   - 漏斗：曝光 446,600 → 点击 13,846(3.10%) → 加粉 939(¥91.77) → 付费 36(¥2,394)
 *   - 平台分布：巨量 5 户 ¥373,400 + 磁力 2 户 ¥74,200 + 腾讯 1 户 ¥32,400 = ¥480,000
 *
 * 灵魂约定（experience.md「监控 = 事实层」）：
 *   只返事实数据，不返任何判断字段 —— 无 status / severity / 状态标签 / ROI 异常标记 / 焦点条。
 *   原型里的「状态」列（异常/优异/拒审激增/正常）、判断性 KPI 涨跌、归因/诊断引导，
 *   均属判断层（收口到 /review），在此刻意剔除，仅保留纯数值列与「查看详情」下钻。
 */
import type { ApiResponse } from '@/types/auth'
import type {
  AccountOverview,
  AccountPlatformGroup,
  CohortCell,
  CohortRow,
  DetailRow,
  MonitorAccountsData,
  MonitorDetailData,
  MonitorPlatformKey,
  MonitorRetentionData,
  MonitorTrendData,
  RetentionMode,
  TrendPoint,
} from '@/types/monitor'

/* ============================================================
 * 账户明细表（GET /api/monitor/accounts）—— 按平台分组，纯数据无判断列
 * 不同平台指标体系不同（巨量：转化目标量/目标转化率/完成度；磁力：转化数/转化成本/ROI；
 *   腾讯：关注成本/下单率/下单成本/客单价/新增回本率），故各平台独立 columns。
 * ============================================================ */

/** 巨量引擎账户表分组（5 户，列：消耗/支付粉价/点击率/转化目标量/转化目标成本/目标转化率/完成度） */
const juliangGroup: AccountPlatformGroup = {
  platform: { key: 'juliang', name: '巨量引擎', count: 5 },
  columns: [
    { key: 'spend', label: '消耗' },
    { key: 'fan_cost', label: '支付粉价' },
    { key: 'ctr', label: '点击率' },
    { key: 'conv', label: '转化目标量' },
    { key: 'conv_cost', label: '转化目标成本' },
    { key: 'cvr', label: '目标转化率' },
    { key: 'completion', label: '完成度' },
  ],
  rows: [
    {
      account: 'A001',
      name: '现言短剧旗舰户',
      agent: '林磊',
      platform: 'juliang',
      metrics: { spend: '¥86,200', fan_cost: '91.77', ctr: '3.10%', conv: '36', conv_cost: '2,394', cvr: '0.26%', completion: '26%' },
    },
    {
      account: 'A002',
      name: '主力 IP 大盘户',
      agent: '林磊',
      platform: 'juliang',
      metrics: { spend: '¥124,800', fan_cost: '78.30', ctr: '5.20%', conv: '48', conv_cost: '620.40', cvr: '0.85%', completion: '88%' },
    },
    {
      account: 'A005',
      name: '古言短剧扩量户',
      agent: '王芳',
      platform: 'juliang',
      metrics: { spend: '¥42,800', fan_cost: '105.20', ctr: '2.40%', conv: '6', conv_cost: '1,108', cvr: '0.18%', completion: '42%' },
    },
    {
      account: 'A006',
      name: '男频爽文主户',
      agent: '王芳',
      platform: 'juliang',
      metrics: { spend: '¥68,400', fan_cost: '82.10', ctr: '4.30%', conv: '32', conv_cost: '710.20', cvr: '0.62%', completion: '71%' },
    },
    {
      account: 'A008',
      name: '都市悬疑户',
      agent: '林磊',
      platform: 'juliang',
      metrics: { spend: '¥51,200', fan_cost: '89.50', ctr: '3.80%', conv: '24', conv_cost: '805.40', cvr: '0.48%', completion: '65%' },
    },
  ],
}

/** 磁力引擎账户表分组（2 户，列：消耗/支付粉价/点击率/转化数/转化成本/ROI） */
const kuaishouGroup: AccountPlatformGroup = {
  platform: { key: 'kuaishou', name: '磁力引擎', count: 2 },
  columns: [
    { key: 'spend', label: '消耗' },
    { key: 'fan_cost', label: '支付粉价' },
    { key: 'ctr', label: '点击率' },
    { key: 'conv_num', label: '转化数' },
    { key: 'conv_cost', label: '转化成本' },
    { key: 'roi', label: 'ROI' },
  ],
  rows: [
    {
      account: 'K001',
      name: '快手短剧主户',
      agent: '张伟',
      platform: 'kuaishou',
      metrics: { spend: '¥56,000', fan_cost: '88.40', ctr: '4.10%', conv_num: '320', conv_cost: '175', roi: '1.46' },
    },
    {
      account: 'K002',
      name: '快手测试户',
      agent: '张伟',
      platform: 'kuaishou',
      metrics: { spend: '¥18,200', fan_cost: '95.10', ctr: '3.50%', conv_num: '98', conv_cost: '186', roi: '1.12' },
    },
  ],
}

/** 腾讯广告账户表分组（1 户，列：消耗/关注成本/下单率/下单成本/客单价/新增回本率） */
const tencentGroup: AccountPlatformGroup = {
  platform: { key: 'tencent', name: '腾讯广告', count: 1 },
  columns: [
    { key: 'spend', label: '消耗' },
    { key: 'follow_cost', label: '关注成本' },
    { key: 'order_rate', label: '下单率' },
    { key: 'order_cost', label: '下单成本' },
    { key: 'aov', label: '客单价' },
    { key: 'recoup', label: '新增回本率' },
  ],
  rows: [
    {
      account: 'T001',
      name: '腾讯系短剧户',
      agent: '赵敏',
      platform: 'tencent',
      metrics: { spend: '¥32,400', follow_cost: '3.49', order_rate: '3.22%', order_cost: '942.76', aov: '9.87', recoup: '11.07%' },
    },
  ],
}

const ACCOUNT_GROUPS: Record<MonitorPlatformKey, AccountPlatformGroup> = {
  juliang: juliangGroup,
  kuaishou: kuaishouGroup,
  tencent: tencentGroup,
}

/**
 * GET /api/monitor/accounts —— 账户明细表。
 * @param platformKey 顶栏全局平台（all 返回全部分组；单平台只返该组）。
 * 响应只含事实数值，无任何判断字段。
 */
export function mockAccounts(platformKey: string): ApiResponse<MonitorAccountsData> {
  const all = [juliangGroup, kuaishouGroup, tencentGroup]
  const groups =
    platformKey === 'all'
      ? all
      : [ACCOUNT_GROUPS[platformKey as MonitorPlatformKey] ?? juliangGroup]
  const data: MonitorAccountsData = {
    groups,
    total_accounts: groups.reduce((s, g) => s + g.rows.length, 0),
    total_platforms: groups.length,
  }
  return { code: 200, message: 'success', data }
}

/* ============================================================
 * 24h 消耗趋势（GET /api/monitor/trend?range=24h）
 * ============================================================ */

/** 由原型 SVG path 还原的今日 17 点（00:00→现在 14:30，¥ 千） */
const TODAY_RAW = [3.5, 3.2, 4.1, 3.8, 4.6, 5.4, 5.8, 7.3, 8.4, 9.6, 10.2, 11.5, 12.8, 14.1, 15.0, 17.4, 19.2]
/** 昨日同时段参考线（原型虚线） */
const YESTERDAY_RAW = [2.6, 2.8, 3.6, 3.4, 4.2, 4.8, 5.4, 6.6, 7.2, 8.4, 9.0, 9.8, 11.0, 12.2, 13.0, 14.6, 16.0]
const HOUR_LABELS = ['00:00', '01:30', '03:00', '04:30', '06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '14:30', '16:00', '17:30', '19:00', '20:30', '22:00', '23:30']

function buildTrendPoints(raw: number[]): TrendPoint[] {
  return raw.map((v, i) => ({ time: HOUR_LABELS[i] ?? `${i}`, value: Math.round(v * 1000) }))
}

/**
 * GET /api/monitor/trend —— 24h 消耗趋势点列（今日 + 昨日参考线）。
 * 纯事实走势，无判断。
 */
export function mockTrend(range = '24h'): ApiResponse<MonitorTrendData> {
  const data: MonitorTrendData = {
    range,
    metric: '消耗',
    unit: '¥',
    today: buildTrendPoints(TODAY_RAW),
    yesterday: buildTrendPoints(YESTERDAY_RAW),
    now_label: '现在 14:30',
  }
  return { code: 200, message: 'success', data }
}

/** 账户详情·概览的 24h 趋势点列（原型 dt-card 走势，单位 ¥ 千 → 元） */
const DETAIL_TREND_RAW = [4.2, 5.1, 6.8, 7.6, 7.2, 9.1, 10.4, 12.6, 14.2]
const DETAIL_TREND_LABELS = ['00:00', '03:00', '06:00', '09:00', '12:00', '14:00', '14:15', '14:25', '14:30']
function buildDetailTrend(): TrendPoint[] {
  return DETAIL_TREND_RAW.map((v, i) => ({ time: DETAIL_TREND_LABELS[i] ?? `${i}`, value: Math.round(v * 6100) }))
}

/* ============================================================
 * 留存 cohort（GET /api/monitor/retention?mode=days|date）
 * 回本进度：注册日期为行（今天置顶倒序），列为 当天/D1…D30（天数模式）或绝对日期（日期模式）。
 * 仅事实回本率（百分比）；尚未到的天数为 null（渲染「—」）。
 * ============================================================ */

/** 12 批 cohort 基础（注册日期、新增粉、当天起始回本率、已累计的有效天数；今天置顶倒序）。
 *  回本率按每天约 +N% 阶梯累加，与原型 brand 蓝深浅热力一致（数值对齐 monitor.html cohortDays）。 */
interface CohortSeed {
  reg: string
  fans: number
  /** 当天（D0）回本率 % */
  base: number
  /** 已观测到的天数（含当天）；其后为 null（未到天数） */
  days: number
  /** 每日累计增量序列（长度需 ≥ days-1，与原型逐日数值吻合） */
  steps: number[]
  isToday?: boolean
}

/** 与原型 cohortDays 完全一致的 12 行（D0 base + 逐日累计到当前观测天数） */
const COHORT_SEEDS: CohortSeed[] = [
  { reg: '05-28', fans: 939, base: 18, days: 1, steps: [], isToday: true },
  { reg: '05-25', fans: 1310, base: 22, days: 4, steps: [16, 13, 11] },
  { reg: '05-22', fans: 1180, base: 20, days: 7, steps: [15, 11, 10, 7, 7, 6] },
  { reg: '05-19', fans: 1140, base: 19, days: 10, steps: [14, 11, 9, 7, 6, 6, 6, 3, 3] },
  { reg: '05-16', fans: 1020, base: 21, days: 13, steps: [16, 11, 11, 7, 8, 6, 6, 4, 3, 4, 3, 3] },
  { reg: '05-13', fans: 1170, base: 18, days: 16, steps: [14, 9, 9, 7, 6, 5, 6, 3, 3, 3, 3, 2, 3, 3, 2] },
  { reg: '05-10', fans: 1260, base: 20, days: 19, steps: [15, 11, 10, 7, 7, 6, 6, 4, 3, 3, 3, 3, 2, 3, 3, 2, 2] },
  { reg: '05-07', fans: 1090, base: 22, days: 22, steps: [16, 13, 11, 7, 8, 7, 6, 4, 4, 3, 4, 3, 3, 3, 3, 2, 3, 2, 3] },
  { reg: '05-04', fans: 1210, base: 19, days: 25, steps: [14, 11, 9, 7, 6, 6, 6, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 3, 2, 2, 2, 1, 2] },
  { reg: '05-01', fans: 1150, base: 21, days: 28, steps: [16, 11, 11, 7, 8, 6, 6, 4, 3, 4, 3, 3, 3, 3, 3, 2, 3, 2, 3, 2, 2, 2, 1, 2, 2, 1] },
  { reg: '04-28', fans: 1080, base: 20, days: 31, steps: [15, 11, 10, 7, 7, 6, 6, 4, 3, 3, 3, 3, 3, 2, 3, 2, 2, 2, 2, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1] },
]

const D30_COLS = ['当天', ...Array.from({ length: 30 }, (_, i) => `D${i + 1}`)]

interface CohortCellSeedRow {
  reg: string
  fans: number
  isToday?: boolean
  /** 当天..D30（31 值），null 为未到 */
  full: CohortCell[]
}

/** 由 seed 展开为 31 列（当天/D1…D30），未到天数为 null */
function expandCohortRow(seed: CohortSeed): CohortCellSeedRow {
  const vals: CohortCell[] = []
  let acc = seed.base
  vals.push(acc)
  for (let d = 1; d < seed.days && d <= 30; d++) {
    acc += seed.steps[d - 1] ?? 0
    vals.push(acc)
  }
  while (vals.length < 31) vals.push(null)
  return { reg: seed.reg, fans: seed.fans, isToday: seed.isToday, full: vals.slice(0, 31) }
}

const EXPANDED = COHORT_SEEDS.map(expandCohortRow)

/** 天数模式：直接用展开后的 当天/D1…D30 */
function buildDaysRows(): CohortRow[] {
  return EXPANDED.map((r) => ({ reg: r.reg, fans: r.fans, isToday: r.isToday, values: r.full }))
}

/** 日期模式列：05-15 … 05-28（14 列绝对日期） */
const DATE_COLS = ['05-15', '05-16', '05-17', '05-18', '05-19', '05-20', '05-21', '05-22', '05-23', '05-24', '05-25', '05-26', '05-27', '05-28']
/** 注册日期 → 距 05-28 的天数偏移（D0 落在注册当天那列） */
const REG_DATE_INDEX: Record<string, string> = {
  '05-28': '05-28', '05-25': '05-25', '05-22': '05-22', '05-19': '05-19', '05-16': '05-16',
  '05-13': '05-13', '05-10': '05-10', '05-07': '05-07', '05-04': '05-04', '05-01': '05-01', '04-28': '04-28',
}

/**
 * 日期模式：把每批的 D0..Dn 回本率投影到绝对日期列（注册日 = D0 列），
 * 注册日之前的列为 null（未到/无该批数据），与原型 cohortDate 对齐。
 */
function buildDateRows(): CohortRow[] {
  // 绝对日期 → 列索引
  const dateIdx: Record<string, number> = {}
  DATE_COLS.forEach((d, i) => (dateIdx[d] = i))
  // 按注册日在 DATE_COLS 中的位置，逐日向右填充 D0..Dn（注册日 = D0 列）
  return EXPANDED.map((r) => {
    const row: CohortCell[] = DATE_COLS.map(() => null)
    const startKey = REG_DATE_INDEX[r.reg]
    const startCol = startKey != null ? dateIdx[startKey] : undefined
    if (startCol !== undefined) {
      for (let k = 0; k < r.full.length; k++) {
        const col = startCol + k
        if (col >= 0 && col < DATE_COLS.length && r.full[k] != null) {
          row[col] = r.full[k]
        }
      }
    }
    return { reg: r.reg, fans: r.fans, isToday: r.isToday, values: row }
  })
}

/**
 * GET /api/monitor/retention —— 留存 cohort（回本进度）。
 * @param mode days 注册日期×D0–D30 / date 注册日期×绝对日期
 * 纯事实回本率，null 为未到天数（非判断）。
 */
export function mockRetention(mode: RetentionMode = 'days'): ApiResponse<MonitorRetentionData> {
  const data: MonitorRetentionData =
    mode === 'date'
      ? { mode, cols: DATE_COLS, rows: buildDateRows() }
      : { mode, cols: D30_COLS, rows: buildDaysRows() }
  return { code: 200, message: 'success', data }
}

/* ============================================================
 * 数据明细（GET /api/monitor/detail?range=14d）—— 日期竖排 × 指标横排
 * ============================================================ */

interface DetailSeed {
  date: string
  mark?: 'today' | 'yesterday'
  spend: string
  imp: string
  click: string
  conv: string
  fan_cost: string
  roi: string
}

/** 近 14 天明细（对齐原型 mon-dpane detail；今天置顶倒序，ROI 纯数值不标红） */
const DETAIL_SEEDS: DetailSeed[] = [
  { date: '05-28', mark: 'today', spend: '¥86,200', imp: '446,600', click: '13,846', conv: '36', fan_cost: '91.77', roi: '0.84' },
  { date: '05-27', mark: 'yesterday', spend: '¥78,400', imp: '405,700', click: '12,577', conv: '38', fan_cost: '91.10', roi: '1.20' },
  { date: '05-26', spend: '¥79,800', imp: '412,900', click: '12,800', conv: '42', fan_cost: '90.40', roi: '1.28' },
  { date: '05-25', spend: '¥84,100', imp: '435,200', click: '13,491', conv: '48', fan_cost: '89.80', roi: '1.38' },
  { date: '05-24', spend: '¥80,600', imp: '417,100', click: '12,930', conv: '50', fan_cost: '88.60', roi: '1.45' },
  { date: '05-23', spend: '¥83,200', imp: '430,600', click: '13,348', conv: '54', fan_cost: '87.90', roi: '1.50' },
  { date: '05-22', spend: '¥81,500', imp: '421,800', click: '13,070', conv: '52', fan_cost: '88.20', roi: '1.48' },
  { date: '05-21', spend: '¥82,400', imp: '426,400', click: '13,218', conv: '53', fan_cost: '87.70', roi: '1.51' },
  { date: '05-20', spend: '¥78,600', imp: '406,700', click: '12,608', conv: '52', fan_cost: '88.00', roi: '1.46' },
  { date: '05-19', spend: '¥80,300', imp: '415,500', click: '12,881', conv: '54', fan_cost: '87.60', roi: '1.49' },
  { date: '05-18', spend: '¥79,100', imp: '409,300', click: '12,688', conv: '57', fan_cost: '86.40', roi: '1.58' },
  { date: '05-17', spend: '¥75,400', imp: '390,100', click: '12,093', conv: '53', fan_cost: '87.20', roi: '1.52' },
  { date: '05-16', spend: '¥77,800', imp: '402,500', click: '12,478', conv: '56', fan_cost: '86.90', roi: '1.57' },
  { date: '05-15', spend: '¥76,200', imp: '394,200', click: '12,220', conv: '55', fan_cost: '86.50', roi: '1.55' },
]

const DETAIL_COLUMNS = [
  { key: 'spend', label: '消耗' },
  { key: 'imp', label: '曝光' },
  { key: 'click', label: '点击' },
  { key: 'conv', label: '转化目标量' },
  { key: 'fan_cost', label: '支付粉价' },
  { key: 'roi', label: 'ROI' },
]

function seedToDetailRow(s: DetailSeed): DetailRow {
  return {
    date: s.date,
    mark: s.mark,
    metrics: { spend: s.spend, imp: s.imp, click: s.click, conv: s.conv, fan_cost: s.fan_cost, roi: s.roi },
  }
}

/**
 * GET /api/monitor/detail —— 数据明细（日期竖排 × 指标横排）。
 * 纯事实，ROI 列为普通文本不标红。
 */
export function mockDetail(range = '14d'): ApiResponse<MonitorDetailData> {
  const data: MonitorDetailData = {
    range,
    columns: DETAIL_COLUMNS,
    rows: DETAIL_SEEDS.map(seedToDetailRow),
  }
  return { code: 200, message: 'success', data }
}

/* ============================================================
 * 账户详情·概览聚合（下钻 detail tab=overview）—— 全部纯事实
 * 对齐原型 mon-dpane overview（KPI / 趋势 / 漏斗 / 出价预算 / 复购LTV / 广告组明细）。
 * ============================================================ */

/** 广告组明细（原型 mdd-table 3 行） */
const GROUP_ROWS: DetailRow[] = [
  {
    date: '现言-5秒钩子-A组 · 1738657931934739',
    metrics: { spend: '38,420', fan_cost: '545.81', completion: '22.70%', imp: '149,893', click: '4,221', ctr: '2.82%', conv: '11', conv_cost: '942.76', cvr: '0.26%', order_cost: '942.76', aov: '20.21' },
  },
  {
    date: '现言-反转开场-B组 · 1738657931920012',
    metrics: { spend: '26,100', fan_cost: '418.30', completion: '34.10%', imp: '98,420', click: '3,180', ctr: '3.23%', conv: '18', conv_cost: '876.40', cvr: '0.57%', order_cost: '790.20', aov: '22.80' },
  },
  {
    date: '现言-情绪痛点-C组 · 1738657931900388',
    metrics: { spend: '21,680', fan_cost: '602.15', completion: '18.40%', imp: '72,310', click: '1,980', ctr: '2.74%', conv: '7', conv_cost: '1,120.50', cvr: '0.35%', order_cost: '1,008.30', aov: '18.40' },
  },
]

const GROUP_COLUMNS = [
  { key: 'name', label: '广告组' },
  { key: 'spend', label: '消耗(元)' },
  { key: 'fan_cost', label: '支付粉价' },
  { key: 'completion', label: '完成度' },
  { key: 'imp', label: '曝光次数' },
  { key: 'click', label: '点击次数' },
  { key: 'ctr', label: '点击率' },
  { key: 'conv', label: '转化目标量' },
  { key: 'conv_cost', label: '转化目标成本' },
  { key: 'cvr', label: '目标转化率' },
  { key: 'order_cost', label: '下单成本' },
  { key: 'aov', label: '客单价' },
]

/** 投放计划维度（演示行，纯数据） */
const PLAN_ROWS: DetailRow[] = [
  { date: '计划-现言旗舰-01', metrics: { spend: '31,500', fan_cost: '520.40', completion: '28.10%', imp: '128,400', click: '3,690', ctr: '2.87%', conv: '14', conv_cost: '912.30', cvr: '0.38%', order_cost: '912.30', aov: '21.10' } },
  { date: '计划-现言旗舰-02', metrics: { spend: '28,900', fan_cost: '486.20', completion: '31.40%', imp: '112,600', click: '3,420', ctr: '3.04%', conv: '16', conv_cost: '845.60', cvr: '0.47%', order_cost: '845.60', aov: '22.40' } },
  { date: '计划-现言旗舰-03', metrics: { spend: '25,800', fan_cost: '598.30', completion: '19.80%', imp: '79,200', click: '2,180', ctr: '2.75%', conv: '6', conv_cost: '1,098.40', cvr: '0.30%', order_cost: '1,098.40', aov: '19.20' } },
]

/** 创意维度（演示行，纯数据） */
const CREATIVE_ROWS: DetailRow[] = [
  { date: '创意-反转开场-竖版15s', metrics: { spend: '22,400', fan_cost: '432.10', completion: '33.60%', imp: '96,800', click: '3,050', ctr: '3.15%', conv: '17', conv_cost: '812.40', cvr: '0.56%', order_cost: '780.10', aov: '23.10' } },
  { date: '创意-情绪痛点-竖版20s', metrics: { spend: '19,600', fan_cost: '588.40', completion: '18.90%', imp: '68,900', click: '1,860', ctr: '2.70%', conv: '6', conv_cost: '1,140.20', cvr: '0.32%', order_cost: '1,020.50', aov: '18.60' } },
]

/** 账户 → 详情页头部基本信息（name / platform / platformShort）。
 *  下钻概览的 header 三字段须随账户正确（KPI/漏斗/子表等仍复用 A001 样板）。
 *  platformShort：juliang→「巨量」、kuaishou→「磁力」、tencent→「腾讯」。 */
const OVERVIEW_HEADER: Record<string, { name: string; platform: MonitorPlatformKey; platformShort: string }> = {
  A001: { name: '现言短剧旗舰户', platform: 'juliang', platformShort: '巨量' },
  A002: { name: '主力 IP 大盘户', platform: 'juliang', platformShort: '巨量' },
  A005: { name: '古言短剧扩量户', platform: 'juliang', platformShort: '巨量' },
  A006: { name: '男频爽文主户', platform: 'juliang', platformShort: '巨量' },
  A008: { name: '都市悬疑户', platform: 'juliang', platformShort: '巨量' },
  K001: { name: '快手短剧主户', platform: 'kuaishou', platformShort: '磁力' },
  K002: { name: '快手测试户', platform: 'kuaishou', platformShort: '磁力' },
  T001: { name: '腾讯系短剧户', platform: 'tencent', platformShort: '腾讯' },
}

/**
 * 账户详情·概览聚合（下钻 detail tab=overview）。
 * @param account 账户编号（header 三字段按账户取；KPI/漏斗/子表等以 A001 golden-data 为样板复用）
 * 全部纯事实，无判断字段。
 */
export function mockOverview(account = 'A001'): ApiResponse<AccountOverview> {
  const info = OVERVIEW_HEADER[account] ?? OVERVIEW_HEADER.A001
  const data: AccountOverview = {
    header: {
      account,
      name: info.name,
      platform: info.platform,
      platformShort: info.platformShort,
      dateRange: '2026-05-28 至 2026-05-28',
    },
    kpis: [
      { label: '消耗', value: '86,200' },
      { label: 'ROI', value: '0.84' },
      { label: '支付粉价', value: '91.77' },
      { label: '点击率', value: '3.10%' },
      { label: '转化目标量', value: '36' },
      { label: '转化目标成本', value: '2,394' },
      { label: '目标转化率', value: '0.26%' },
    ],
    completion: { label: '完成度', percent: '26%', ratio: 26, done: 36, target: 139 },
    trend: buildDetailTrend(),
    trendNowLabel: '现在 14:30',
    funnel: [
      { label: '曝光', value: '446,600', ratio: 100 },
      { label: '点击', value: '13,846', ratio: 64, note: '点击率 3.10%' },
      { label: '加粉', value: '939', ratio: 40, note: '粉价 ¥91.77' },
      { label: '付费下单', value: '36', ratio: 20, note: '成本 ¥2,394' },
    ],
    bid: [
      { label: '出价方式', value: 'OCPM' },
      { label: '当前出价', value: '¥26' },
      { label: '日预算', value: '¥120,000' },
      { label: '已消耗', value: '¥86,200' },
    ],
    budget: { label: '预算消耗进度', percent: '72%', ratio: 72 },
    ltv: [
      { label: '复购率', value: '23%' },
      { label: '平均复购金额', value: '¥38' },
      { label: '7 日 LTV', value: '¥85' },
      { label: '30 日 LTV', value: '¥142' },
    ],
    subTables: [
      { key: 'group', label: '广告组', columns: GROUP_COLUMNS, rows: GROUP_ROWS },
      { key: 'plan', label: '投放计划', columns: GROUP_COLUMNS, rows: PLAN_ROWS },
      { key: 'creative', label: '创意', columns: GROUP_COLUMNS, rows: CREATIVE_ROWS },
    ],
  }
  return { code: 200, message: 'success', data }
}
