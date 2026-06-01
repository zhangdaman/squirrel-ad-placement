/**
 * 平台（投放渠道）相关类型
 * 对齐 docs/api-contracts.md「平台与全局 / GET /api/platforms」与全局头 X-Platform
 */

/** 真实投放平台 key（单平台） */
export type RealPlatformKey = 'juliang' | 'kuaishou' | 'tencent'

/** 平台全局 scope：三平台 + 全平台汇总（all 仅 admin 可用） */
export type PlatformKey = RealPlatformKey | 'all'

/** 单个平台展示项（含原型徽标点颜色） */
export interface PlatformOption {
  key: PlatformKey
  /** 展示名，如「巨量引擎」 */
  name: string
  /** 顶栏圆点颜色（对齐原型 renderShell 平台菜单配色） */
  dotColor: string
  /** 是否仅管理者（admin）可选 */
  managerOnly?: boolean
}

/** GET /api/platforms 单条平台数据 */
export interface PlatformStat {
  key: RealPlatformKey
  name: string
  accounts: number
  spend: number
}

/** GET /api/platforms 响应 data */
export interface PlatformsResponseData {
  platforms: PlatformStat[]
  total_spend: number
  /** 当前用户是否可切「全平台汇总」（仅 admin 为 true） */
  can_switch_all: boolean
}
