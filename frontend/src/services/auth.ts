/**
 * 认证 service —— 封装 /api/auth/*
 * USE_MOCK=true 时走 mocks/auth；否则经 axios 实例打真实后端。
 * 组件 / store 只调本文件方法，禁止直接 axios.get。
 */
import api, { USE_MOCK } from './api'
import { mockLogin, mockMe } from '@/mocks/auth'
import type {
  ApiResponse,
  LoginPayload,
  LoginResponseData,
  MeResponseData,
} from '@/types/auth'
import type { RoleKey } from '@/types/role'
import type { PlatformKey } from '@/types/platform'

/** 模拟网络延迟，贴近真实交互 */
function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * 登录。
 * FE-01 Mock：role / platform 由登录页传入（任意非空账号密码即成功）。
 * 真实后端：仅传 username/password，role 由后端按账号返回。
 */
export async function login(
  payload: LoginPayload,
  opts?: { role?: RoleKey; platform?: PlatformKey }
): Promise<LoginResponseData> {
  if (USE_MOCK) {
    const res = await delay(mockLogin(opts?.role ?? 'toushou', opts?.platform))
    return res.data
  }
  const { data } = await api.post<ApiResponse<LoginResponseData>>('/auth/login', payload)
  return data.data
}

/** GET /api/auth/me —— 当前用户 + 可见模块 */
export async function fetchMe(roleForMock?: RoleKey): Promise<MeResponseData> {
  if (USE_MOCK) {
    const res = await delay(mockMe(roleForMock ?? 'toushou'))
    return res.data
  }
  const { data } = await api.get<ApiResponse<MeResponseData>>('/auth/me')
  return data.data
}
