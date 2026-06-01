/**
 * 数据监控 service —— 封装 /api/monitor/*（纯数据层，无判断字段）
 * USE_MOCK=true 时走 mocks/monitor；否则经 axios 实例打真实后端。
 * 组件 / store 只调本文件方法，禁止直接 axios.get。
 *
 * 对齐 docs/api-contracts.md：
 *   - GET /api/monitor/accounts                  账户明细表（按 X-Platform 收敛）
 *   - GET /api/monitor/trend?range=24h           24h 消耗趋势
 *   - GET /api/monitor/retention?account&mode     留存 cohort（days|date）
 *   - GET /api/monitor/detail?account&range       数据明细
 *   - GET /api/monitor/detail/overview?account    账户详情·概览聚合（下钻）
 *
 * 灵魂约定：监控只消费事实数据，不引入任何判断字段（status / severity 等）。
 */
import api, { USE_MOCK } from './api'
import {
  mockAccounts,
  mockDetail,
  mockOverview,
  mockRetention,
  mockTrend,
} from '@/mocks/monitor'
import type { ApiResponse } from '@/types/auth'
import type {
  AccountOverview,
  MonitorAccountsData,
  MonitorDetailData,
  MonitorRetentionData,
  MonitorTrendData,
  RetentionMode,
} from '@/types/monitor'

function delay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** GET /api/monitor/accounts —— 账户明细表（按平台分组，纯数据无判断列） */
export async function fetchAccounts(platformKey: string): Promise<MonitorAccountsData> {
  if (USE_MOCK) {
    return delay(mockAccounts(platformKey).data)
  }
  const { data } = await api.get<ApiResponse<MonitorAccountsData>>('/monitor/accounts')
  return data.data
}

/** GET /api/monitor/trend —— 24h 消耗趋势点列 */
export async function fetchTrend(range = '24h'): Promise<MonitorTrendData> {
  if (USE_MOCK) {
    return delay(mockTrend(range).data, 120)
  }
  const { data } = await api.get<ApiResponse<MonitorTrendData>>('/monitor/trend', {
    params: { range },
  })
  return data.data
}

/** GET /api/monitor/retention —— 留存 cohort（days 注册日期×D0–D30 / date 绝对日期） */
export async function fetchRetention(
  account: string,
  mode: RetentionMode = 'days'
): Promise<MonitorRetentionData> {
  if (USE_MOCK) {
    return delay(mockRetention(mode).data, 120)
  }
  const { data } = await api.get<ApiResponse<MonitorRetentionData>>('/monitor/retention', {
    params: { account, mode },
  })
  return data.data
}

/** GET /api/monitor/detail —— 数据明细（日期竖排 × 指标横排） */
export async function fetchDetail(account: string, range = '14d'): Promise<MonitorDetailData> {
  if (USE_MOCK) {
    return delay(mockDetail(range).data, 120)
  }
  const { data } = await api.get<ApiResponse<MonitorDetailData>>('/monitor/detail', {
    params: { account, range },
  })
  return data.data
}

/** GET /api/monitor/detail/overview —— 账户详情·概览聚合（KPI / 漏斗 / 出价预算 / 复购LTV / 子表） */
export async function fetchOverview(account: string): Promise<AccountOverview> {
  if (USE_MOCK) {
    return delay(mockOverview(account).data, 140)
  }
  const { data } = await api.get<ApiResponse<AccountOverview>>('/monitor/detail/overview', {
    params: { account },
  })
  return data.data
}
