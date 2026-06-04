/**
 * 统一账户主数据（SSOT —— Single Source of Truth）
 * ------------------------------------------------------------
 * 监控页（mocks/monitor.ts）、账户中心（mocks/accounts.ts）、团队页（pages/TeamPage.vue）
 * 此前各自维护账户，导致「账户名 / 负责人 / 今日消耗」三处对不上。
 * 本文件收敛为唯一真相基准：
 *   - 今日消耗：以 monitor 的 PRD golden-data 为准
 *   - 负责人：以 team 投手分配为准
 *   - 账户名：以 monitor 为准
 * 其它 mock 一律从这里派生 / 对齐，禁止再各自编账户主数据。
 *
 * 平台分布：巨量 5 户 / 快手 2 户 / 腾讯 1 户 = 8 户。
 * 授权状态：仅 A005 expiring + K002 expired（即账户中心 KPI「需重新授权 2」）。
 */
import type { RealPlatformKey } from '@/types/platform'
import type { AccountAuthStatus } from '@/types/accounts'

/** 单条账户主数据（唯一真相字段） */
export interface AccountMaster {
  /** 账户号（业务主键，如 A001 / K001 / T001） */
  id: string
  /** 账户名（以 monitor 为准） */
  name: string
  /** 平台 key */
  platform: RealPlatformKey
  /** 负责投手（以 team 投手分配为准） */
  owner: string
  /** 今日消耗（元，以 monitor golden-data 为准） */
  today_spend: number
  /** 授权状态 */
  status: AccountAuthStatus
  /** 状态文案，如「授权正常」/「7 天后过期」/「已失效」 */
  status_label: string
  /** 脱敏账户号，如 1798****4521 */
  masked_id: string
  /** 头像首字 */
  avatar: string
}

/** 8 账户主数据（唯一真相，三处 mock 严格照此对齐） */
export const ACCOUNTS_MASTER: AccountMaster[] = [
  // ---- 巨量引擎 ----
  { id: 'A001', name: '现言短剧旗舰户', platform: 'juliang', owner: '林磊', today_spend: 86200, status: 'ok', status_label: '授权正常', masked_id: '1798****4521', avatar: '现' },
  { id: 'A002', name: '主力 IP 大盘户', platform: 'juliang', owner: '林磊', today_spend: 124800, status: 'ok', status_label: '授权正常', masked_id: '1834****9911', avatar: '主' },
  { id: 'A005', name: '古言短剧扩量户', platform: 'juliang', owner: '王芳', today_spend: 42800, status: 'expiring', status_label: '7 天后过期', masked_id: '1815****0098', avatar: '古' },
  { id: 'A006', name: '男频爽文主户', platform: 'juliang', owner: '王芳', today_spend: 68400, status: 'ok', status_label: '授权正常', masked_id: '1820****3344', avatar: '男' },
  { id: 'A008', name: '都市悬疑户', platform: 'juliang', owner: '林磊', today_spend: 51200, status: 'ok', status_label: '授权正常', masked_id: '1802****7733', avatar: '都' },
  // ---- 快手（磁力金牛） ----
  { id: 'K001', name: '快手短剧主户', platform: 'kuaishou', owner: '张伟', today_spend: 56000, status: 'ok', status_label: '授权正常', masked_id: 'KS-88****21', avatar: '快' },
  { id: 'K002', name: '快手测试户', platform: 'kuaishou', owner: '张伟', today_spend: 18200, status: 'expired', status_label: '已失效', masked_id: 'KS-90****07', avatar: '测' },
  // ---- 腾讯广告 ----
  { id: 'T001', name: '腾讯系短剧户', platform: 'tencent', owner: '赵敏', today_spend: 32400, status: 'ok', status_label: '授权正常', masked_id: 'TX-1234****', avatar: '腾' },
]
