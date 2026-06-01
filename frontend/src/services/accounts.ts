/**
 * 账户中心 service —— 封装 /api/accounts
 * USE_MOCK=true 时走 mocks/accounts；否则经 axios 实例打真实后端（X-Platform 由拦截器附加）。
 * 组件 / store 只调本文件方法，禁止直接 axios.get。
 *
 * 约束（对齐 api-contracts.md）：
 *   - GET    /api/accounts            多平台账户列表与授权状态（按 X-Platform 收敛）
 *   - GET    /api/accounts/{id}       账户详情（本期契约未单列，Mock 由实体派生）
 *   - DELETE /api/accounts/{id}       解除授权（高风险操作，前端二次确认后调用）
 */
import api, { USE_MOCK } from './api'
import { getStoredPlatform } from '@/utils/storage'
import { mockAccounts, mockAccountDetail, mockUnlinkAccount } from '@/mocks/accounts'
import type { ApiResponse } from '@/types/auth'
import type { AccountsData, AccountDetail, UnlinkResult } from '@/types/accounts'

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** GET /api/accounts —— 账户列表 + KPI + 失效提醒（按当前平台 scope 收敛） */
export async function fetchAccounts(): Promise<AccountsData> {
  if (USE_MOCK) {
    const res = await delay(mockAccounts(getStoredPlatform()))
    return res.data
  }
  const { data } = await api.get<ApiResponse<AccountsData>>('/accounts')
  return data.data
}

/** GET /api/accounts/{id} —— 账户详情（详情面板用） */
export async function fetchAccountDetail(accountId: string): Promise<AccountDetail | null> {
  if (USE_MOCK) {
    const res = await delay(mockAccountDetail(accountId), 160)
    return res.data
  }
  const { data } = await api.get<ApiResponse<AccountDetail>>(`/accounts/${accountId}`)
  return data.data
}

/** DELETE /api/accounts/{id} —— 解除授权 */
export async function unlinkAccount(accountId: string): Promise<UnlinkResult | null> {
  if (USE_MOCK) {
    const res = await delay(mockUnlinkAccount(accountId), 180)
    return res.data
  }
  const { data } = await api.delete<ApiResponse<UnlinkResult>>(`/accounts/${accountId}`)
  return data.data
}
