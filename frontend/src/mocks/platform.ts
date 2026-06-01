/**
 * 平台模块 Mock —— GET /api/platforms
 * 数值严格对齐 PRD golden-data 账本：
 *   巨量 5 户 ¥373,400 + 磁力 2 户 ¥74,200 + 腾讯 1 户 ¥32,400 = ¥480,000
 * can_switch_all 仅 admin 为 true（投手等锁单平台）。
 */
import type { ApiResponse, AuthUser } from '@/types/auth'
import type { PlatformsResponseData, PlatformStat } from '@/types/platform'

/** golden-data 平台分布（单一真相，跨页一致） */
const PLATFORM_STATS: PlatformStat[] = [
  { key: 'juliang', name: '巨量引擎', accounts: 5, spend: 373400 },
  { key: 'kuaishou', name: '磁力引擎', accounts: 2, spend: 74200 },
  { key: 'tencent', name: '腾讯广告', accounts: 1, spend: 32400 },
]

const TOTAL_SPEND = PLATFORM_STATS.reduce((s, p) => s + p.spend, 0) // 480000

/** GET /api/platforms —— 按当前用户角色决定 can_switch_all */
export function mockPlatforms(user?: AuthUser | null): ApiResponse<PlatformsResponseData> {
  return {
    code: 200,
    message: 'success',
    data: {
      platforms: PLATFORM_STATS.map((p) => ({ ...p })),
      total_spend: TOTAL_SPEND,
      can_switch_all: user?.role === 'admin',
    },
  }
}
