/**
 * 投放复盘 service —— 封装 /api/review/*（判断层）
 * USE_MOCK=true 时走 mocks/review；否则经 axios 实例打真实后端。
 * 组件 / store 只调本文件方法，禁止直接 axios.get。
 *
 * 对齐 docs/api-contracts.md「投放复盘模块」：
 *   - GET  /api/review/inbox                       复盘收件箱列表（前端列表态）
 *   - GET  /api/review/attribution?account=A001    Agent 归因报告（5 步 + 因子 + 建议 + 止损）
 *   - POST /api/review/execute  {suggestion_id}     建议一键执行（下发 → track_url）
 *   - GET  /api/review/new-options                 发起复盘表单可选配置
 *
 * 一键执行真承接（experience.md）：execute 返回 dispatched + track_url，
 *   组件据此置「✓ 已下发」+ 插入执行状态条 + 跳监控追踪。
 */
import api, { USE_MOCK } from './api'
import {
  mockAttribution,
  mockExecute,
  mockInbox,
  mockNewReviewOptions,
} from '@/mocks/review'
import type { ApiResponse } from '@/types/auth'
import type {
  AttributionReportData,
  ExecuteResultData,
  NewReviewOptions,
  ReviewInboxData,
} from '@/types/review'

function delay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** GET /api/review/inbox —— 复盘收件箱（概览 + 分组卡片 + 加载更早批次） */
export async function fetchInbox(): Promise<ReviewInboxData> {
  if (USE_MOCK) {
    return delay(mockInbox().data)
  }
  const { data } = await api.get<ApiResponse<ReviewInboxData>>('/review/inbox')
  return data.data
}

/** GET /api/review/attribution —— Agent 归因报告（按账户） */
export async function fetchAttribution(account = 'A001'): Promise<AttributionReportData> {
  if (USE_MOCK) {
    return delay(mockAttribution(account).data, 200)
  }
  const { data } = await api.get<ApiResponse<AttributionReportData>>(
    '/review/attribution',
    { params: { account } }
  )
  return data.data
}

/**
 * POST /api/review/execute —— 建议一键执行（真承接）。
 * 返回 dispatched + track_url（如 /monitor?account=A001），组件据此落地执行状态。
 */
export async function executeSuggestion(
  suggestionId: string,
  account = 'A001'
): Promise<ExecuteResultData> {
  if (USE_MOCK) {
    return delay(mockExecute(account).data, 220)
  }
  const { data } = await api.post<ApiResponse<ExecuteResultData>>('/review/execute', {
    suggestion_id: suggestionId,
  })
  return data.data
}

/** GET /api/review/new-options —— 发起复盘表单可选配置 */
export async function fetchNewReviewOptions(): Promise<NewReviewOptions> {
  if (USE_MOCK) {
    return delay(mockNewReviewOptions().data, 120)
  }
  const { data } = await api.get<ApiResponse<NewReviewOptions>>('/review/new-options')
  return data.data
}
