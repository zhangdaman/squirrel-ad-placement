/**
 * 账户中心 Mock —— GET /api/accounts、DELETE /api/accounts/{id}
 * 数据严格对齐 docs/prototypes/accounts.html（3 平台 8 账户：巨量 5 / 磁力 2 / 腾讯 1，2 个需重新授权）
 * 与 golden-data 平台分布一致：巨量 5 户 / 磁力 2 户 / 腾讯 1 户。
 * DTO 收敛：内部实体 ACCOUNT_ENTITIES 为字段超集；list / detail 各按 endpoint 显式 map。
 * 所有展示型 Mock 数据带 [Mock] 标识（账户名前缀），接真实接口后移除。
 */
import type { ApiResponse } from '@/types/auth'
import type { RealPlatformKey } from '@/types/platform'
import type {
  AccountEntity,
  AccountListItem,
  AccountDetail,
  AccountGroup,
  AccountKpi,
  AccountsData,
  PlatformMeta,
  UnlinkResult,
  AccountAuthStatus,
} from '@/types/accounts'

const MOCK = '[Mock] '

/** 平台分组徽标元信息（对齐原型 .pg-logo 配色与顺序） */
export const PLATFORM_META: Record<RealPlatformKey, PlatformMeta> = {
  juliang: { key: 'juliang', name: '巨量引擎', badge: '巨', grad: 'linear-gradient(135deg,#FF7A2F,#E25822)' },
  kuaishou: { key: 'kuaishou', name: '磁力金牛（快手）', badge: '磁', grad: 'linear-gradient(135deg,#FF5C8A,#E0245E)' },
  tencent: { key: 'tencent', name: '腾讯广告', badge: '腾', grad: 'linear-gradient(135deg,#4E8CFF,#2554DC)' },
}

/** 平台渲染顺序 */
const PLATFORM_ORDER: RealPlatformKey[] = ['juliang', 'kuaishou', 'tencent']

/** 状态中文（状态汇总文案用） */
const STATUS_CN: Record<AccountAuthStatus, string> = {
  ok: '正常',
  syncing: '同步中',
  expiring: '即将过期',
  expired: '已失效',
}

/* ============================================================
 * 内部实体（字段超集）—— 逐条对齐 accounts.html acc-card
 * ============================================================ */
const ACCOUNT_ENTITIES: AccountEntity[] = [
  // ---- 巨量引擎 ----
  {
    account_id: 'acc_jl_01', platform: 'juliang',
    name: MOCK + '现言短剧旗舰户', masked_id: '1798****4521',
    avatar: '现', avatar_grad: 'linear-gradient(135deg,#FF7A2F,#E25822)',
    owner: '钱晓彤', status: 'ok', status_label: '授权正常',
    sync_note: '最近同步 2 分钟前', today_spend: 18420,
    last_sync: '今天 09:12', expire_at: '2026-09-01（90 天后）',
  },
  {
    account_id: 'acc_jl_02', platform: 'juliang',
    name: MOCK + '都市悬疑测试户', masked_id: '1802****7733',
    avatar: '都', avatar_grad: 'linear-gradient(135deg,#FBBF6B,#F5A524)',
    owner: '李响', status: 'ok', status_label: '授权正常',
    sync_note: '最近同步 1 分钟前', today_spend: 6240,
    last_sync: '今天 09:13', expire_at: '2026-08-21（80 天后）',
  },
  {
    account_id: 'acc_jl_03', platform: 'juliang',
    name: MOCK + '古言虐恋主投户', masked_id: '1815****0098',
    avatar: '古', avatar_grad: 'linear-gradient(135deg,#FF6B9D,#C42667)',
    owner: '王宇', status: 'expiring', status_label: '7 天后过期',
    sync_note: '授权 7 天后过期', today_spend: 9870,
    last_sync: '今天 09:05', expire_at: '2026-06-08（7 天后）',
  },
  {
    account_id: 'acc_jl_04', platform: 'juliang',
    name: MOCK + '男频爽文主户', masked_id: '1820****3344',
    avatar: '男', avatar_grad: 'linear-gradient(135deg,#5E89F6,#2554DC)',
    owner: '钱晓彤', status: 'ok', status_label: '授权正常',
    sync_note: '最近同步 3 分钟前', today_spend: 14200,
    last_sync: '今天 09:11', expire_at: '2026-08-15（74 天后）',
  },
  {
    account_id: 'acc_jl_05', platform: 'juliang',
    name: MOCK + '女频甜宠新户', masked_id: '1834****9911',
    avatar: '女', avatar_grad: 'linear-gradient(135deg,#16A34A,#15803D)',
    owner: '李响', status: 'syncing', status_label: '数据同步中',
    sync_note: '首次接入 · 正在同步近 30 天数据…',
    last_sync: '同步中', expire_at: '2026-09-01（90 天后）',
  },
  // ---- 磁力金牛 ----
  {
    account_id: 'acc_ks_01', platform: 'kuaishou',
    name: MOCK + '快手短剧主户', masked_id: 'KS-88****21',
    avatar: '快', avatar_grad: 'linear-gradient(135deg,#FF5C8A,#E0245E)',
    owner: '王宇', status: 'ok', status_label: '授权正常',
    sync_note: '最近同步 5 分钟前', today_spend: 7650,
    last_sync: '今天 09:08', expire_at: '2026-08-10（70 天后）',
  },
  {
    account_id: 'acc_ks_02', platform: 'kuaishou',
    name: MOCK + '快手测试户', masked_id: 'KS-90****07',
    avatar: '测', avatar_grad: 'linear-gradient(135deg,#94A3B8,#475569)',
    owner: '李响', status: 'expired', status_label: '已失效',
    sync_note: '授权已失效，数据已停止同步',
    last_sync: '5 天前', expire_at: '2026-05-27（已过期）',
  },
  // ---- 腾讯广告 ----
  {
    account_id: 'acc_tx_01', platform: 'tencent',
    name: MOCK + '腾讯系短剧户', masked_id: 'TX-1234****',
    avatar: '腾', avatar_grad: 'linear-gradient(135deg,#4E8CFF,#2554DC)',
    owner: '钱晓彤', status: 'ok', status_label: '授权正常',
    sync_note: '最近同步 8 分钟前', today_spend: 4320,
    last_sync: '今天 09:04', expire_at: '2026-08-28（88 天后）',
  },
]

/** 当前会话内的可变副本（解除授权会移除条目，刷新复原） */
let accountsState: AccountEntity[] = ACCOUNT_ENTITIES.map((a) => ({ ...a }))

/** 实体 → 列表项 DTO（显式 map，不外泄 last_sync / expire_at 等详情字段） */
function toListItem(e: AccountEntity): AccountListItem {
  return {
    account_id: e.account_id,
    platform: e.platform,
    name: e.name,
    masked_id: e.masked_id,
    avatar: e.avatar,
    avatar_grad: e.avatar_grad,
    owner: e.owner,
    status: e.status,
    status_label: e.status_label,
    sync_note: e.sync_note,
    ...(e.today_spend !== undefined ? { today_spend: e.today_spend } : {}),
  }
}

/** 实体 → 详情 DTO（含 last_sync / expire_at） */
function toDetail(e: AccountEntity): AccountDetail {
  return {
    ...toListItem(e),
    last_sync: e.last_sync,
    expire_at: e.expire_at,
  }
}

/** 状态汇总文案：按状态计数拼成「3 正常 · 1 同步中 · 1 即将过期」 */
function statusSummary(list: AccountEntity[]): string {
  const order: AccountAuthStatus[] = ['ok', 'syncing', 'expiring', 'expired']
  const counts = order
    .map((s) => ({ s, n: list.filter((a) => a.status === s).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} ${STATUS_CN[x.s]}`)
  return counts.join(' · ')
}

/** 平台分组（按 X-Platform 收敛：传单平台只回该平台，all/空 回全部） */
function buildGroups(platformScope?: string): AccountGroup[] {
  const order =
    platformScope && platformScope !== 'all' && PLATFORM_ORDER.includes(platformScope as RealPlatformKey)
      ? [platformScope as RealPlatformKey]
      : PLATFORM_ORDER
  return order
    .map((p) => {
      const list = accountsState.filter((a) => a.platform === p)
      return {
        platform: p,
        meta: PLATFORM_META[p],
        count: list.length,
        status_summary: statusSummary(list),
        accounts: list.map(toListItem),
      }
    })
    .filter((g) => g.count > 0)
}

/** 顶部 KPI（已授权账户数 / 接入平台数 / 需重新授权数） */
function buildKpis(): AccountKpi[] {
  const total = accountsState.length
  const platforms = new Set(accountsState.map((a) => a.platform)).size
  const attention = accountsState.filter((a) => a.status === 'expiring' || a.status === 'expired').length
  return [
    { tone: 'b', label: '已授权账户', value: String(total) },
    { tone: 'g', label: '接入平台', value: String(platforms) },
    { tone: 'r', label: '需重新授权', value: String(attention) },
  ]
}

/** GET /api/accounts —— 多平台账户列表与授权状态（按 X-Platform 收敛） */
export function mockAccounts(platformScope?: string): ApiResponse<AccountsData> {
  const attention = accountsState.filter((a) => a.status === 'expiring' || a.status === 'expired').length
  return {
    code: 200,
    message: 'success',
    data: {
      kpis: buildKpis(),
      attention_count: attention,
      groups: buildGroups(platformScope),
    },
  }
}

/** 账户详情（详情抽屉用）；本期契约未单列 endpoint，Mock 由实体派生 */
export function mockAccountDetail(accountId: string): ApiResponse<AccountDetail | null> {
  const e = accountsState.find((a) => a.account_id === accountId)
  return {
    code: e ? 200 : 404,
    message: e ? 'success' : 'not found',
    data: e ? toDetail(e) : null,
  }
}

/** DELETE /api/accounts/{id} —— 解除授权（高风险，前端做二次确认） */
export function mockUnlinkAccount(accountId: string): ApiResponse<UnlinkResult | null> {
  const exists = accountsState.some((a) => a.account_id === accountId)
  if (!exists) {
    return { code: 404, message: 'not found', data: null }
  }
  accountsState = accountsState.filter((a) => a.account_id !== accountId)
  return {
    code: 200,
    message: 'success',
    data: { account_id: accountId, status: 'unlinked' },
  }
}
