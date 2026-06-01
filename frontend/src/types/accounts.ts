/**
 * 账户中心相关类型
 * 对齐 docs/api-contracts.md「GET /api/accounts」与 docs/prototypes/accounts.html。
 * DTO 收敛：内部实体 AccountEntity 为字段超集；列表接口按 endpoint 显式 map 出 AccountListItem。
 */
import type { RealPlatformKey } from './platform'

/** 授权状态：正常 / 即将过期 / 已失效 / 数据同步中 */
export type AccountAuthStatus = 'ok' | 'expiring' | 'expired' | 'syncing'

/**
 * 平台分组渐变与首字徽标（对齐原型 .pg-logo / .acc-avatar 配色）
 * 仅展示用，不进契约字段。
 */
export interface PlatformMeta {
  key: RealPlatformKey
  /** 展示名，如「巨量引擎」 */
  name: string
  /** 平台分组徽标首字，如「巨」 */
  badge: string
  /** 平台分组徽标渐变 */
  grad: string
}

/**
 * 账户内部实体（字段超集）。
 * 真实接口下由后端返回；Mock 在 mocks/accounts.ts 内维护。
 */
export interface AccountEntity {
  account_id: string
  /** 平台 key */
  platform: RealPlatformKey
  /** 账户名，如「现言短剧旗舰户」 */
  name: string
  /** 脱敏账户号，如 1798****4521 */
  masked_id: string
  /** 头像首字 */
  avatar: string
  /** 头像渐变 */
  avatar_grad: string
  /** 负责投手 */
  owner: string
  /** 授权状态 */
  status: AccountAuthStatus
  /** 状态文案，如「授权正常」/「7 天后过期」/「已失效」/「数据同步中」 */
  status_label: string
  /** 同步 / 过期等附属说明（meta 行） */
  sync_note: string
  /** 今日消耗（元）；同步中 / 失效账户可空 */
  today_spend?: number
  /** 详情抽屉补充：上次同步时间文案 */
  last_sync: string
  /** 授权到期文案，如「2025-06-08（7 天后）」 */
  expire_at: string
}

/** 列表项 DTO（GET /api/accounts → items[]，按 endpoint 显式构造） */
export interface AccountListItem {
  account_id: string
  platform: RealPlatformKey
  name: string
  masked_id: string
  avatar: string
  avatar_grad: string
  owner: string
  status: AccountAuthStatus
  status_label: string
  sync_note: string
  today_spend?: number
}

/** 账户详情 DTO（详情抽屉，由实体派生附属字段） */
export interface AccountDetail extends AccountListItem {
  last_sync: string
  expire_at: string
}

/** 平台分组（页面渲染用，service 收敛输出） */
export interface AccountGroup {
  platform: RealPlatformKey
  meta: PlatformMeta
  count: number
  /** 状态汇总文案，如「3 正常 · 1 同步中 · 1 即将过期」 */
  status_summary: string
  accounts: AccountListItem[]
}

/** 顶部 KPI（对齐原型 acc-kpi-row） */
export interface AccountKpi {
  /** 配色档：b 品牌蓝 / g 成功 / r 危险 */
  tone: 'b' | 'g' | 'r'
  label: string
  value: string
}

/** GET /api/accounts 响应 data */
export interface AccountsData {
  kpis: AccountKpi[]
  /** 需重新授权账户数（失效提醒条） */
  attention_count: number
  groups: AccountGroup[]
}

/** 解除授权结果 DTO（DELETE /api/accounts/{id}） */
export interface UnlinkResult {
  account_id: string
  status: 'unlinked'
}
