/**
 * 平台 / 权限 service —— 封装 /api/platforms 与 /api/team/permissions
 * USE_MOCK=true 时走 mocks；否则经 axios 实例打真实后端。
 */
import api, { USE_MOCK } from './api'
import { mockPlatforms } from '@/mocks/platform'
import { mockPermissions } from '@/mocks/permissions'
import type { ApiResponse, AuthUser } from '@/types/auth'
import type { PlatformsResponseData } from '@/types/platform'
import type { PermissionMatrixData } from '@/types/role'

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** GET /api/platforms —— 三平台消耗分布 + 是否可切全平台 */
export async function fetchPlatforms(user?: AuthUser | null): Promise<PlatformsResponseData> {
  if (USE_MOCK) {
    const res = await delay(mockPlatforms(user))
    return res.data
  }
  const { data } = await api.get<ApiResponse<PlatformsResponseData>>('/platforms')
  return data.data
}

/** GET /api/team/permissions —— 8×4 权限矩阵 */
export async function fetchPermissions(): Promise<PermissionMatrixData> {
  if (USE_MOCK) {
    const res = await delay(mockPermissions())
    return res.data
  }
  const { data } = await api.get<ApiResponse<PermissionMatrixData>>('/team/permissions')
  return data.data
}
